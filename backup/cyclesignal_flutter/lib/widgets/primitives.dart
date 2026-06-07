import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Soft card — warm surface, gentle border, generous radius, no drop shadow.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;
  final Color? color;
  final Color? borderColor;
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.color,
    this.borderColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppColors.bgSurface,
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(color: borderColor ?? AppColors.borderSubtle, width: 1.5),
      ),
      child: child,
    );
  }
}

/// Primary CTA — solid ink pill with cream label (ovara style).
class PrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool fullWidth;
  const PrimaryButton(
      {super.key, required this.label, this.onPressed, this.icon, this.fullWidth = false});

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;
    final content = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (icon != null) ...[
          Icon(icon, color: AppColors.bgBase, size: 18),
          const SizedBox(width: 8),
        ],
        Text(label, style: AppText.button()),
      ],
    );
    return Opacity(
      opacity: disabled ? 0.4 : 1,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppRadius.pill),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.pill),
          onTap: onPressed,
          child: Ink(
            decoration: BoxDecoration(
              color: AppColors.ink,
              borderRadius: BorderRadius.circular(AppRadius.pill),
            ),
            padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 28),
            child: content,
          ),
        ),
      ),
    );
  }
}

/// Secondary button — soft pastel pill, ink label.
class SecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final IconData? icon;
  const SecondaryButton({super.key, required this.label, required this.onPressed, this.icon});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.lavenderMuted,
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 22),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 16, color: AppColors.ink),
                const SizedBox(width: 8),
              ],
              Text(label, style: AppText.label(AppColors.ink)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Toggle switch.
class AppToggle extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  const AppToggle({super.key, required this.value, this.onChanged});
  @override
  Widget build(BuildContext context) {
    return Switch(
      value: value,
      onChanged: onChanged,
      activeThumbColor: Colors.white,
      activeTrackColor: AppColors.ink,
      inactiveThumbColor: Colors.white,
      inactiveTrackColor: AppColors.borderSubtle,
    );
  }
}

/// Persistent top bar — serif wordmark left; privacy lock right.
class TopBar extends StatelessWidget {
  final VoidCallback? onLock;
  const TopBar({super.key, this.onLock});
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('CycleSignal', style: AppText.serifTitle()),
            IconButton(
              onPressed: onLock,
              icon: const Icon(Icons.lock_outline, size: 20, color: AppColors.textSecondary),
              tooltip: 'Privacy',
            ),
          ],
        ),
      ),
    );
  }
}
