// Deterministic pattern flags + narrative — PRD Section 6.3.

class PatternFlags {
  final bool irregularCycles;
  final bool premenstrualMoodClustering;
  final bool repeatedFunctionalImpact;
  final bool pcosSignal;
  final bool pmddSignal;

  final int cyclesTracked;
  final int averageCycleLength;
  final String cycleLengthRange;
  final int shortestCycle;
  final int longestCycle;
  final int cyclesOver35Days;
  final int premenstrualMoodCycles;
  final int functionalImpactCycles;
  final int acneCycles;
  final int fatigueCycles;
  final String premenstrualWindowLabel;

  PatternFlags({
    required this.irregularCycles,
    required this.premenstrualMoodClustering,
    required this.repeatedFunctionalImpact,
    required this.pcosSignal,
    required this.pmddSignal,
    required this.cyclesTracked,
    required this.averageCycleLength,
    required this.cycleLengthRange,
    required this.shortestCycle,
    required this.longestCycle,
    required this.cyclesOver35Days,
    required this.premenstrualMoodCycles,
    required this.functionalImpactCycles,
    required this.acneCycles,
    required this.fatigueCycles,
    required this.premenstrualWindowLabel,
  });

  Map<String, dynamic> toJson() => {
        'irregular_cycles': irregularCycles,
        'premenstrual_mood_clustering': premenstrualMoodClustering,
        'repeated_functional_impact': repeatedFunctionalImpact,
        'pcos_signal': pcosSignal,
        'pmdd_signal': pmddSignal,
        'cycles_tracked': cyclesTracked,
        'average_cycle_length': averageCycleLength,
        'cycle_length_range': cycleLengthRange,
        'cycles_over_35_days': cyclesOver35Days,
        'premenstrual_mood_cycles': premenstrualMoodCycles,
        'functional_impact_cycles': functionalImpactCycles,
        'acne_cycles': acneCycles,
        'fatigue_cycles': fatigueCycles,
        'premenstrual_window': premenstrualWindowLabel,
      };
}

class PatternAnalysis {
  final PatternFlags flags;
  final List<String> labels;
  final String narrative;
  final String narrativeModel; // gemini-3.1-flash | gpt-5.4-mini-fallback | on-device
  final DateTime updatedAt;

  PatternAnalysis({
    required this.flags,
    required this.labels,
    required this.narrative,
    required this.narrativeModel,
    required this.updatedAt,
  });
}
