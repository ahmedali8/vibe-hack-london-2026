import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../state/app_state.dart';
import '../widgets/primitives.dart';

/// Consent flow — checkbox unticked by default; Continue disabled until ticked
/// (UK GDPR Art. 9(2)(a)).
class ConsentScreen extends StatefulWidget {
  const ConsentScreen({super.key});
  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  bool _checked = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgBase,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 48, 22, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('🌸', style: TextStyle(fontSize: 40)),
              const SizedBox(height: 12),
              Text('CycleSignal', style: AppText.hero().copyWith(fontSize: 40)),
              const SizedBox(height: 10),
              Text(
                'A private pattern memory that turns scattered symptoms into GP-ready evidence — that you control.',
                style: AppText.body(),
              ),
              const SizedBox(height: 22),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Before you begin', style: AppText.title()),
                    const SizedBox(height: 12),
                    Text(
                      'CycleSignal stores your cycle and symptom information locally on this device so it can show your patterns over time and help you prepare for a clinician.',
                      style: AppText.body(),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '• No account, no server — your data never leaves this device unless you export a GP pack.\n• Raw voice audio is never stored.\n• You can delete any entry, or everything, at any time.',
                      style: AppText.body(),
                    ),
                    const SizedBox(height: 16),
                    InkWell(
                      onTap: () => setState(() => _checked = !_checked),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Checkbox(
                            value: _checked,
                            onChanged: (v) => setState(() => _checked = v ?? false),
                            activeColor: AppColors.ink,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(6)),
                          ),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Text(
                                'I understand that CycleSignal stores my health information locally on this device and that I can delete it at any time.',
                                style: AppText.label(AppColors.textPrimary),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () => showDialog(
                        context: context,
                        builder: (_) => AlertDialog(
                          backgroundColor: AppColors.bgSurface,
                          title: const Text('Privacy notice'),
                          content: const Text(
                              'CycleSignal stores all data locally on this device. It does not transmit your records to any server, does not use trackers or analytics, and never stores raw audio. Live AI features (voice, extraction, narrative, safety) call their providers only with the minimum text needed and only during a check-in. Health data is special category data under UK GDPR; processing relies on your explicit consent, which you can withdraw at any time to delete all data.'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Close'))
                          ],
                        ),
                      ),
                      style: TextButton.styleFrom(padding: EdgeInsets.zero),
                      child: Text('Read the full privacy notice',
                          style: AppText.label(AppColors.accentViolet)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),
              PrimaryButton(
                label: 'Continue',
                fullWidth: true,
                onPressed: _checked ? () => context.read<AppState>().grantConsent() : null,
              ),
              const SizedBox(height: 14),
              Center(
                child: Text(
                  'Not a diagnostic tool. Not a medical device.',
                  style: AppText.caption(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
