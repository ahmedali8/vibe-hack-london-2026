import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { env } from './env.js';

// Lazily-constructed SDK singletons. We never build a client for a provider
// whose key is missing — each route guards on `configured` first (env.ts), so a
// client is only instantiated when it can actually be used. Keys live ONLY here,
// server-side (PRD constraints #7/#8); they are never sent to the mobile client.

let _openai: OpenAI | null = null;
export function openai(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: env.openai.apiKey });
  return _openai;
}

let _anthropic: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: env.anthropic.apiKey });
  return _anthropic;
}

let _gemini: GoogleGenAI | null = null;
export function gemini(): GoogleGenAI {
  if (!_gemini) _gemini = new GoogleGenAI({ apiKey: env.gemini.apiKey });
  return _gemini;
}
