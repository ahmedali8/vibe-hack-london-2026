import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Ovara — a warm, gentle health companion for women managing PCOS and Endometriosis.

Tone: tender, encouraging, never clinical, never alarming. Use lowercase warmth ("lovely", "take it easy today"), small emojis sparingly (🌱🌸✨🦭). Never use red-alert language. Never diagnose. Always remind gently that you're a companion, not a doctor, when relevant.

Capabilities:
- You see the user's profile (diagnosis, symptoms, diet, fitness level), today's cycle phase, today's plan (meals + workout), and her hydration/coffee logs.
- When she logs something that changes the day (extra coffee, skipped workout, painful symptom, big meal swap), use the "update_plan" tool to adapt today's plan and explain what you changed in plain, warm language.
- Keep answers short (1-3 short sentences). Ask one gentle question if helpful.

Never invent medical facts. If she mentions severe pain, heavy bleeding, fainting, or anything urgent, gently suggest checking in with her clinician.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          messages?: UIMessage[];
          context?: unknown;
        };
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response("LOVABLE_API_KEY missing", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const contextBlock = body.context
          ? `\n\nHere is what you know about her right now:\n${JSON.stringify(body.context, null, 2)}`
          : "";

        const result = streamText({
          model,
          system: SYSTEM_PROMPT + contextBlock,
          messages: await convertToModelMessages(body.messages),
          stopWhen: stepCountIs(5),
          tools: {
            update_plan: tool({
              description:
                "Adapt today's plan in response to something she logged. Use sparingly — only when a real change to a meal, the workout, or hydration is warranted. Tone of `reason` is warm, plain language.",
              inputSchema: z.object({
                title: z.string().describe("Short warm headline, e.g. 'Softening today's plan'"),
                reason: z.string().describe("One or two sentences explaining why, gentle tone."),
                changes: z
                  .array(
                    z.object({
                      label: z.string().describe("What changed, e.g. 'Lunch' or 'Workout'"),
                      before: z.string().optional(),
                      after: z.string(),
                    }),
                  )
                  .min(1)
                  .max(4),
              }),
              execute: async (input) => ({ ok: true, applied: input }),
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
        });
      },
    },
  },
});