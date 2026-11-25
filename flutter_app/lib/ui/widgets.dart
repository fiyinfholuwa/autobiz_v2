/// Design-system primitives — Flutter equivalents of mobile_app/src/components/ui/{Button,primitives}.tsx.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/theme.dart';
import 'app_icon.dart';
import 'text.dart';

void tapHaptic() => HapticFeedback.selectionClick();

/* ---------------- Buttons ---------------- */
enum BtnVariant { primary, soft, outline, ghost, danger, dangerSoft, dark, light }
enum BtnSize { sm, md, lg }

class Btn extends StatelessWidget {
  final String title;
  final VoidCallback? onPressed;
  final BtnVariant variant;
  final BtnSize size;
  final String? icon, iconRight, loadingText;
  final bool loading, disabled, full;
  const Btn(this.title, {super.key, this.onPressed, this.variant = BtnVariant.primary, this.size = BtnSize.md, this.icon, this.iconRight, this.loading = false, this.loadingText, this.disabled = false, this.full = false});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final h = {BtnSize.sm: 38.0, BtnSize.md: 48.0, BtnSize.lg: 54.0}[size]!;
    final fs = {BtnSize.sm: 13.0, BtnSize.md: 15.0, BtnSize.lg: 16.0}[size]!;
    final (Color bg, Color fg, Color? border) = switch (variant) {
      BtnVariant.primary => (c.primary, c.onPrimary, null),
      BtnVariant.soft => (c.primarySoft, c.primary, null),
      BtnVariant.outline => (Colors.transparent, c.text, c.border),
      BtnVariant.ghost => (Colors.transparent, c.primary, null),
      BtnVariant.danger => (c.danger, Colors.white, null),
      BtnVariant.dangerSoft => (c.dangerSoft, c.danger, null),
      BtnVariant.dark => (c.dark ? Colors.white : const Color(0xFF191919), c.dark ? const Color(0xFF111111) : Colors.white, null),
      BtnVariant.light => (Colors.white.withValues(alpha: 0.18), Colors.white, null),
    };
    final off = disabled || loading || onPressed == null;
    final radius = BorderRadius.circular(size == BtnSize.sm ? R.sm : R.md + 2);
    final child = Row(
      mainAxisSize: full ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: loading
          ? [SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: fg)), const SizedBox(width: 8), AppText(loadingText ?? 'Please wait…', weight: FontWeight.w700, size: fs, color: fg)]
          : [
              if (icon != null) ...[AppIcon(icon!, size: fs + 3, color: fg), const SizedBox(width: 8)],
              Flexible(child: AppText(title, weight: FontWeight.w700, size: fs, color: fg, maxLines: 1)),
              if (iconRight != null) ...[const SizedBox(width: 8), AppIcon(iconRight!, size: fs + 2, color: fg)],
            ],
    );
    return Opacity(
      opacity: off && !loading ? 0.5 : 1,
      child: Container(
        height: h,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: radius,
          border: border != null ? Border.all(color: border) : null,
          boxShadow: variant == BtnVariant.primary && !off && !c.dark ? [BoxShadow(color: c.primary.withValues(alpha: 0.35), blurRadius: 14, offset: const Offset(0, 6))] : null,
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: radius,
            onTap: off ? null : () { tapHaptic(); onPressed!(); },
            child: Padding(padding: EdgeInsets.symmetric(horizontal: size == BtnSize.sm ? 14 : 20), child: Center(child: child)),
          ),
        ),
      ),
    );
  }
}

class IconBtn extends StatelessWidget {
  final String icon;
  final VoidCallback? onPressed;
  final double size;
  final Color? color, bg;
  final int? badge;
  final bool dot;
  final String? tooltip;
  const IconBtn(this.icon, {super.key, this.onPressed, this.size = 40, this.color, this.bg, this.badge, this.dot = false, this.tooltip});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final b = bg ?? c.surface;
    Widget w = Material(
      color: b,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed == null ? null : () { tapHaptic(); onPressed!(); },
        child: SizedBox(width: size, height: size, child: Center(child: AppIcon(icon, size: size * 0.5, color: color ?? c.text))),
      ),
    );
    if ((badge ?? 0) > 0 || dot) {
      w = Stack(clipBehavior: Clip.none, children: [
        w,
        Positioned(
          top: 1, right: 1,
          child: Container(
            constraints: BoxConstraints(minWidth: dot ? 9 : 17, minHeight: dot ? 9 : 17),
            padding: const EdgeInsets.symmetric(horizontal: 3),
            decoration: BoxDecoration(color: c.danger, borderRadius: BorderRadius.circular(9), border: Border.all(color: b, width: 1.5)),
            child: dot ? null : Center(child: AppText(badge! > 99 ? '99+' : '$badge', size: 10, weight: FontWeight.w700, color: Colors.white)),
          ),
        ),
      ]);
    }
    return tooltip != null ? Semantics(label: tooltip, button: true, child: w) : w;
  }
}

/* ---------------- Layout ---------------- */
class Gap extends StatelessWidget { final double s; const Gap(this.s, {super.key}); @override Widget build(BuildContext context) => SizedBox(width: s, height: s); }

class AppDivider extends StatelessWidget {
  final double v;
  const AppDivider({super.key, this.v = 12});
  @override
  Widget build(BuildContext context) => Padding(padding: EdgeInsets.symmetric(vertical: v), child: Container(height: 1, color: context.c.border));
}

class CardBox extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final VoidCallback? onTap;
  final bool elevated;
  final Color? color;
  final double radius;
  const CardBox({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap, this.elevated = true, this.color, this.radius = R.xl});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final br = BorderRadius.circular(radius);
    return Container(
      decoration: BoxDecoration(color: color ?? c.surface, borderRadius: br, border: c.dark ? Border.all(color: c.border) : null, boxShadow: elevated ? shadow(c) : null),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(borderRadius: br, onTap: onTap == null ? null : () { tapHaptic(); onTap!(); }, child: Padding(padding: padding ?? EdgeInsets.zero, child: child)),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle, action;
  final VoidCallback? onAction;
  const SectionHeader(this.title, {super.key, this.subtitle, this.action, this.onAction});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AppText(title, v: TV.h3),
            if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: AppText(subtitle!, v: TV.xs, muted: true)),
          ])),
          if (action != null) GestureDetector(onTap: onAction, child: AppText(action!, v: TV.sm, weight: FontWeight.w700, color: context.c.primary)),
        ]),
      );
}

/* ---------------- Tiles ---------------- */
class IconTile extends StatelessWidget {
  final String icon;
  final String tone;
  final double size;
  final Color? color, bg;
  final bool rounded, solid;
  const IconTile(this.icon, {super.key, this.tone = 'primary', this.size = 44, this.color, this.bg, this.rounded = false, this.solid = false});
  @override
  Widget build(BuildContext context) {
    final t = context.tone(tone);
    final r = rounded ? size / 2 : size * 0.3;
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        color: solid ? null : (bg ?? t.bg),
        gradient: solid ? LinearGradient(colors: gradientFor(tone), begin: Alignment.topLeft, end: Alignment.bottomRight) : null,
        borderRadius: BorderRadius.circular(r),
      ),
      child: Center(child: AppIcon(icon, size: size * 0.48, color: solid ? Colors.white : (color ?? t.fg))),
    );
  }
}

/// Solid brand square with icon, text or image (networks, providers, airlines, gift cards).
class BrandTile extends StatelessWidget {
  final Color color;
  final String? icon, text, image;
  final double size;
  final Color fg;
  const BrandTile({super.key, required this.color, this.icon, this.text, this.image, this.size = 44, this.fg = Colors.white});
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(size * 0.28),
        child: Container(
          width: size, height: size, color: color,
          child: image != null
              ? Image.asset(image!, fit: BoxFit.cover)
              : Center(child: icon != null ? AppIcon(icon!, size: size * 0.5, color: fg) : AppText(text ?? '', weight: FontWeight.w800, size: (size * 0.3).clamp(10, 40), color: fg)),
        ),
      );
}

/* ---------------- Badges / pills ---------------- */
class Pill extends StatelessWidget {
  final String label;
  final String tone;
  final String? icon;
  final bool solid;
  const Pill(this.label, {super.key, this.tone = 'primary', this.icon, this.solid = false});
  @override
  Widget build(BuildContext context) {
    final t = context.tone(tone);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: solid ? t.fg : t.bg, borderRadius: BorderRadius.circular(R.pill)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[AppIcon(icon!, size: 12, color: solid ? Colors.white : t.fg), const SizedBox(width: 4)],
        AppText(label, size: 11, weight: FontWeight.w700, color: solid ? Colors.white : t.fg),
      ]),
    );
  }
}

const _statusTone = {
  'success': 'success', 'successful': 'success', 'completed': 'success', 'active': 'success', 'delivered': 'success', 'confirmed': 'success', 'paid': 'success',
  'pending': 'warning', 'processing': 'warning', 'not installed': 'primary', 'info': 'primary', 'shipped': 'primary',
  'failed': 'danger', 'declined': 'danger', 'cancelled': 'danger', 'expired': 'neutral', 'reversed': 'neutral', 'neutral': 'neutral', 'archived': 'neutral', 'frozen': 'cyan',
};

class StatusPill extends StatelessWidget {
  final String status;
  final String? label, tone;
  const StatusPill(this.status, {super.key, this.label, this.tone});
  @override
  Widget build(BuildContext context) {
    final t = context.tone(tone ?? _statusTone[status.toLowerCase()] ?? 'neutral');
    final text = label ?? (status.isEmpty ? '' : status[0].toUpperCase() + status.substring(1));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(R.pill)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 6, height: 6, decoration: BoxDecoration(color: t.fg, shape: BoxShape.circle)),
        const SizedBox(width: 5),
        AppText(text, size: 11, weight: FontWeight.w700, color: t.fg),
      ]),
    );
  }
}

class Avatar extends StatelessWidget {
  final String text;
  final double size;
  final Color? color, bg;
  const Avatar(this.text, {super.key, this.size = 40, this.color, this.bg});
  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(color: bg ?? context.c.primarySoft, shape: BoxShape.circle),
        child: Center(child: AppText(text, weight: FontWeight.w700, size: size * 0.36, color: color ?? context.c.primary)),
      );
}

/* ---------------- Chips / segments ---------------- */
class AppChip extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback? onTap;
  final String? icon;
  final int? count;
  final Color? activeColor;
  const AppChip(this.label, {super.key, this.active = false, this.onTap, this.icon, this.count, this.activeColor});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final fg = active ? c.onPrimary : c.text;
    return Material(
      color: active ? (activeColor ?? c.primary) : c.surface,
      shape: StadiumBorder(side: BorderSide(color: active ? Colors.transparent : c.border)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: () { tapHaptic(); onTap?.call(); },
        child: Container(
          height: 36,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[AppIcon(icon!, size: 15, color: fg), const SizedBox(width: 6)],
            AppText(label, size: 13, weight: FontWeight.w600, color: fg),
            if (count != null) ...[
              const SizedBox(width: 6),
              Container(
                constraints: const BoxConstraints(minWidth: 18), height: 18, padding: const EdgeInsets.symmetric(horizontal: 5),
                decoration: BoxDecoration(color: active ? Colors.white.withValues(alpha: 0.25) : c.surface2, borderRadius: BorderRadius.circular(9)),
                child: Center(child: AppText('$count', size: 10, weight: FontWeight.w700, color: fg)),
              ),
            ],
          ]),
        ),
      ),
    );
  }
}

/// Horizontally scrolling row (chips, tiles). Bleeds to screen edges with 16px inner padding.
class HScroll extends StatelessWidget {
  final List<Widget> children;
  final double gap;
  final EdgeInsetsGeometry padding;
  const HScroll({super.key, required this.children, this.gap = 8, this.padding = const EdgeInsets.symmetric(horizontal: 16)});
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: padding,
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [for (var i = 0; i < children.length; i++) ...[if (i > 0) SizedBox(width: gap), children[i]]]),
      );
}

class SegOption<T> { final T value; final String label; final int? badge; final String? icon; const SegOption(this.value, this.label, {this.badge, this.icon}); }

class Segment<T> extends StatelessWidget {
  final List<SegOption<T>> options;
  final T value;
  final ValueChanged<T> onChanged;
  final bool small;
  const Segment({super.key, required this.options, required this.value, required this.onChanged, this.small = false});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: c.dark ? c.surface2 : const Color(0xFFECEEF1), borderRadius: BorderRadius.circular(R.md + 2)),
      child: Row(children: [
        for (var i = 0; i < options.length; i++) ...[
          if (i > 0) const SizedBox(width: 4),
          Expanded(child: _segItem(context, options[i])),
        ],
      ]),
    );
  }

  Widget _segItem(BuildContext context, SegOption<T> o) {
    final c = context.c;
    final on = o.value == value;
    return GestureDetector(
      onTap: () { tapHaptic(); onChanged(o.value); },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        height: small ? 32 : 38,
        decoration: BoxDecoration(color: on ? c.surface : Colors.transparent, borderRadius: BorderRadius.circular(R.md - 2), boxShadow: on ? shadow(c) : null),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          if (o.icon != null) ...[AppIcon(o.icon!, size: 14, color: on ? c.text : c.muted), const SizedBox(width: 6)],
          Flexible(child: AppText(o.label, size: small ? 12 : 13, weight: on ? FontWeight.w700 : FontWeight.w600, color: on ? c.text : c.muted, maxLines: 1)),
          if ((o.badge ?? 0) > 0) ...[
            const SizedBox(width: 6),
            Container(
              constraints: const BoxConstraints(minWidth: 18), height: 18, padding: const EdgeInsets.symmetric(horizontal: 4),
              decoration: BoxDecoration(color: c.primary, borderRadius: BorderRadius.circular(9)),
              child: Center(child: AppText('${o.badge}', size: 10, weight: FontWeight.w700, color: Colors.white)),
            ),
          ],
        ]),
      ),
    );
  }
}

/// Selectable tile (radio/option card).
class OptionCard extends StatelessWidget {
  final bool selected, disabled;
  final VoidCallback? onTap;
  final Widget child;
  final EdgeInsetsGeometry padding;
  const OptionCard({super.key, required this.child, this.selected = false, this.onTap, this.disabled = false, this.padding = const EdgeInsets.all(12)});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final br = BorderRadius.circular(R.lg);
    return Opacity(
      opacity: disabled ? 0.45 : 1,
      child: Stack(children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          decoration: BoxDecoration(borderRadius: br, border: Border.all(color: selected ? c.primary : c.border, width: 1.5), color: selected ? c.primarySoft : c.surface),
          child: Material(type: MaterialType.transparency, child: InkWell(borderRadius: br, onTap: disabled || onTap == null ? null : () { tapHaptic(); onTap!(); }, child: Padding(padding: padding, child: child))),
        ),
        if (selected) Positioned(top: 6, right: 6, child: AppIcon('bi-check-circle-fill', size: 18, color: c.primary)),
      ]),
    );
  }
}

/* ---------------- Progress / skeleton ---------------- */
class ProgressBar extends StatelessWidget {
  final double value, height;
  final Color? color, track;
  const ProgressBar(this.value, {super.key, this.color, this.height = 8, this.track});
  @override
  Widget build(BuildContext context) {
    final v = value.isNaN ? 0.0 : value.clamp(0.0, 1.0);
    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: Container(
        height: height, color: track ?? context.c.surface2,
        child: Align(alignment: Alignment.centerLeft, child: FractionallySizedBox(widthFactor: v, child: Container(decoration: BoxDecoration(color: color ?? context.c.primary, borderRadius: BorderRadius.circular(height))))),
      ),
    );
  }
}

class Skeleton extends StatefulWidget {
  final double? w;
  final double h, r;
  const Skeleton({super.key, this.w, this.h = 14, this.r = 8});
  @override
  State<Skeleton> createState() => _SkeletonState();
}

class _SkeletonState extends State<Skeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this, duration: const Duration(milliseconds: 650))..repeat(reverse: true);
  @override
  void dispose() { _a.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => FadeTransition(
        opacity: Tween(begin: 0.5, end: 1.0).animate(_a),
        child: Container(width: widget.w, height: widget.h, decoration: BoxDecoration(color: context.c.border, borderRadius: BorderRadius.circular(widget.r))),
      );
}

/* ---------------- Empty state ---------------- */
class EmptyState extends StatelessWidget {
  final String icon, tone, title;
  final String? message, action;
  final VoidCallback? onAction;
  const EmptyState({super.key, this.icon = 'bi-inbox', this.tone = 'primary', required this.title, this.message, this.action, this.onAction});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
        child: Column(children: [
          IconTile(icon, tone: tone, size: 64, rounded: true),
          const SizedBox(height: 14),
          AppText(title, v: TV.h3, center: true),
          if (message != null) Padding(padding: const EdgeInsets.only(top: 6), child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 300), child: AppText(message!, v: TV.sm, muted: true, center: true))),
          if (action != null) Padding(padding: const EdgeInsets.only(top: 16), child: Btn(action!, size: BtnSize.sm, onPressed: onAction)),
        ]),
      );
}

/* ---------------- Summary rows ---------------- */
/// A label/value row. `value` may be a String or a Widget.
class SRow {
  final String label;
  final Object value;
  final bool bold;
  final Color? color;
  const SRow(this.label, this.value, {this.bold = false, this.color});
  String get plain => value is String ? value as String : '';
}

class Summary extends StatelessWidget {
  final List<SRow> rows;
  final (String, Object)? total;
  final EdgeInsetsGeometry? margin;
  const Summary(this.rows, {super.key, this.total, this.margin});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      margin: margin,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.lg)),
      child: Column(children: [
        for (var i = 0; i < rows.length; i++) ...[
          if (i > 0) const SizedBox(height: 10),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ConstrainedBox(constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.4), child: AppText(rows[i].label, v: TV.sm, muted: true)),
            const SizedBox(width: 12),
            Expanded(child: Align(alignment: Alignment.centerRight, child: rows[i].value is Widget
                ? rows[i].value as Widget
                : AppText('${rows[i].value}', v: TV.sm, weight: rows[i].bold ? FontWeight.w700 : FontWeight.w600, color: rows[i].color, align: TextAlign.right, selectable: true))),
          ]),
        ],
        if (total != null) ...[
          const SizedBox(height: 10),
          Container(height: 1, color: c.border),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: AppText(total!.$1, weight: FontWeight.w700)),
            total!.$2 is Widget ? total!.$2 as Widget : AppText('${total!.$2}', v: TV.h3, tabular: true),
          ]),
        ],
      ]),
    );
  }
}

/* ---------------- List rows ---------------- */
class ListRow extends StatelessWidget {
  final String? icon, tone, subtitle;
  final Widget? leading, trailing;
  final String title;
  final VoidCallback? onTap;
  final bool chevron, danger;
  final EdgeInsetsGeometry padding;
  const ListRow({super.key, this.icon, this.tone, this.leading, required this.title, this.subtitle, this.trailing, this.onTap, this.chevron = false, this.danger = false, this.padding = const EdgeInsets.symmetric(vertical: 12)});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final body = Padding(
      padding: padding,
      child: Row(children: [
        if (leading != null) ...[leading!, const SizedBox(width: 12)] else if (icon != null) ...[IconTile(icon!, tone: danger ? 'danger' : (tone ?? 'primary'), size: 40), const SizedBox(width: 12)],
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          AppText(title, weight: FontWeight.w600, maxLines: 1, color: danger ? c.danger : null),
          if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: AppText(subtitle!, v: TV.xs, muted: true, maxLines: 2)),
        ])),
        if (trailing != null) ...[const SizedBox(width: 10), trailing!],
        if (chevron) ...[const SizedBox(width: 6), AppIcon('bi-chevron-right', size: 18, color: c.muted)],
      ]),
    );
    if (onTap == null) return body;
    return InkWell(onTap: () { tapHaptic(); onTap!(); }, borderRadius: BorderRadius.circular(R.md), child: body);
  }
}

class SwitchRow extends StatelessWidget {
  final String title;
  final String? subtitle, icon, tone;
  final bool value, disabled;
  final ValueChanged<bool> onChanged;
  const SwitchRow({super.key, required this.title, this.subtitle, required this.value, required this.onChanged, this.disabled = false, this.icon, this.tone});
  @override
  Widget build(BuildContext context) => ListRow(
        icon: icon, tone: tone, title: title, subtitle: subtitle,
        trailing: Switch.adaptive(value: value, onChanged: disabled ? null : (v) { tapHaptic(); onChanged(v); }, activeTrackColor: context.c.primary, activeThumbColor: Colors.white),
      );
}

class Notice extends StatelessWidget {
  final String tone, icon;
  final Object child; // String or Widget
  const Notice(this.child, {super.key, this.tone = 'primary', this.icon = 'bi-info-circle'});
  @override
  Widget build(BuildContext context) {
    final t = context.tone(tone);
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: t.bg, borderRadius: BorderRadius.circular(R.md)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(top: 1), child: AppIcon(icon, size: 18, color: t.fg)),
        const SizedBox(width: 10),
        Expanded(child: child is Widget ? child as Widget : RichAppText('$child', v: TV.sm, color: t.fg)),
      ]),
    );
  }
}

class Stars extends StatelessWidget {
  final double rating, size;
  const Stars(this.rating, {super.key, this.size = 13});
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        for (var i = 1; i <= 5; i++) AppIcon(rating >= i ? 'bi-star-fill' : rating >= i - 0.5 ? 'bi-star-half' : 'bi-star', size: size, color: const Color(0xFFF59F00)),
      ]);
}

/// Country flag from flagcdn.
class FlagImg extends StatelessWidget {
  final String code;
  final double size;
  final bool round;
  const FlagImg(this.code, {super.key, this.size = 32, this.round = true});
  @override
  Widget build(BuildContext context) {
    final h = round ? size : size * 0.72;
    return ClipRRect(
      borderRadius: BorderRadius.circular(round ? size / 2 : 4),
      child: Container(
        width: size, height: h, color: context.c.surface2,
        child: Image.network('https://flagcdn.com/w80/${code.toLowerCase()}.png', fit: BoxFit.cover, errorBuilder: (_, __, ___) => Center(child: AppIcon('bi-globe2', size: size * 0.5, color: context.c.muted))),
      ),
    );
  }
}

/// Product art — gradient-tinted tile with an icon (no external images).
class ProductArt extends StatelessWidget {
  final String icon, tone;
  final double? size;
  final double iconScale, rotate, scale;
  const ProductArt({super.key, required this.icon, required this.tone, this.size = 72, this.iconScale = 0.42, this.rotate = 0, this.scale = 1});
  @override
  Widget build(BuildContext context) {
    final t = context.tone(tone);
    final g = gradientFor(tone);
    return LayoutBuilder(builder: (context, cons) {
      final n = size ?? (cons.maxWidth.isFinite ? cons.maxWidth : 160);
      return Container(
        width: n, height: n,
        decoration: BoxDecoration(
          color: t.bg,
          borderRadius: BorderRadius.circular(n * 0.18),
          gradient: LinearGradient(colors: [g[0].withValues(alpha: context.c.dark ? 0.2 : 0.13), t.bg], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Center(child: Transform.rotate(angle: rotate, child: Transform.scale(scale: scale, child: AppIcon(icon, size: n * iconScale, color: t.fg)))),
      );
    });
  }
}

/// Quantity stepper.
class QtyStepper extends StatelessWidget {
  final int value, min, max;
  final ValueChanged<int> onChanged;
  final double size;
  /// icon shown on the minus button when at min (e.g. trash) — makes it tappable at min
  final String? minusIcon;
  const QtyStepper({super.key, required this.value, required this.onChanged, this.min = 1, this.max = 99, this.size = 36, this.minusIcon});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    Widget b(String icon, bool dis, VoidCallback fn) => Opacity(
          opacity: dis ? 0.35 : 1,
          child: Material(color: c.surface2, shape: const CircleBorder(), child: InkWell(customBorder: const CircleBorder(), onTap: dis ? null : () { tapHaptic(); fn(); }, child: SizedBox(width: size, height: size, child: Center(child: AppIcon(icon, size: size * 0.5, color: c.text))))),
        );
    final atMin = value <= min;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      b(minusIcon != null && atMin ? minusIcon! : 'bi-dash-lg', atMin && minusIcon == null, () => onChanged(value - 1)),
      SizedBox(width: 34, child: AppText('$value', weight: FontWeight.w700, center: true, tabular: true)),
      b('bi-plus-lg', value >= max, () => onChanged(value + 1)),
    ]);
  }
}

class StatTile extends StatelessWidget {
  final String label, value;
  final String? icon;
  final String tone;
  const StatTile({super.key, required this.label, required this.value, this.icon, this.tone = 'primary'});
  @override
  Widget build(BuildContext context) => CardBox(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (icon != null) ...[IconTile(icon!, tone: tone, size: 34), const SizedBox(height: 10)],
          AppText(label, v: TV.xs, muted: true),
          const SizedBox(height: 2),
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: AppText(value, v: TV.h3, tabular: true, maxLines: 1)),
        ]),
      );
}
