/// Card visuals — ported from mobile_app/src/features/cards/CardVisual.tsx.
/// Faces are laid out at a fixed design size and scaled with FittedBox, so they look identical at any width.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/format.dart' as f;
import '../../core/theme.dart';
import '../../store/models.dart';
import '../../ui/app_icon.dart';
import '../../ui/text.dart';
import 'constants.dart';

const double _w = 344, _h = 217; // 1.586 aspect

class BrandMark extends StatelessWidget {
  final String brand;
  final double size;
  const BrandMark(this.brand, {super.key, this.size = 1});
  @override
  Widget build(BuildContext context) {
    if (brand == 'visa') {
      return Text('VISA', style: tvStyle(context, TV.body, weight: FontWeight.w800, size: 20 * size, color: Colors.white).copyWith(fontStyle: FontStyle.italic, letterSpacing: 0.5));
    }
    final d = 26 * size;
    return SizedBox(
      width: d * 1.6, height: d,
      child: Stack(children: [
        Positioned(left: 0, child: Container(width: d, height: d, decoration: const BoxDecoration(color: Color(0xFFEB001B), shape: BoxShape.circle))),
        Positioned(left: d * 0.6, child: Container(width: d, height: d, decoration: BoxDecoration(color: const Color(0xFFF79E1B).withValues(alpha: 0.92), shape: BoxShape.circle))),
        Positioned(left: d * 0.6, top: d * 0.14, child: Container(width: d * 0.4, height: d * 0.72, decoration: BoxDecoration(color: const Color(0xFFFF5F00), borderRadius: BorderRadius.circular(d * 0.2)))),
      ]),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip();
  @override
  Widget build(BuildContext context) => Container(
        width: 42, height: 32, padding: const EdgeInsets.all(5),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(7), gradient: const LinearGradient(colors: [Color(0xFFF8E3A3), Color(0xFFD4A94E), Color(0xFFF2D27F)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Column(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: List.generate(3, (_) => Container(height: 1, color: Colors.black.withValues(alpha: 0.25)))),
      );
}

class CardFaceData {
  final String brand, label, number, holder;
  final CardDesign theme;
  final double balance;
  final String? expiry, cvv;
  final bool revealed, frozen;
  const CardFaceData({required this.brand, required this.theme, required this.label, required this.balance, required this.number, required this.holder, this.expiry, this.cvv, this.revealed = false, this.frozen = false});
}

Widget _sized(Widget face) => AspectRatio(aspectRatio: 1.586, child: FittedBox(fit: BoxFit.contain, child: SizedBox(width: _w, height: _h, child: face)));

TextStyle _t(BuildContext c, double size, {FontWeight w = FontWeight.w400, Color color = Colors.white, bool tabular = false, double ls = 0}) =>
    tvStyle(c, TV.body, size: size, weight: w, color: color, tabular: tabular).copyWith(letterSpacing: ls);

class CardFront extends StatelessWidget {
  final CardFaceData d;
  const CardFront(this.d, {super.key});
  @override
  Widget build(BuildContext context) {
    final white70 = Colors.white.withValues(alpha: 0.7);
    return ClipRRect(
      borderRadius: BorderRadius.circular(R.xl),
      child: Container(
        decoration: BoxDecoration(gradient: LinearGradient(colors: d.theme.colors, stops: d.theme.stops, begin: Alignment.topLeft, end: Alignment.bottomRight)),
        child: Stack(children: [
          Positioned(top: -120, right: -80, child: Container(width: 260, height: 260, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.07)))),
          Positioned(bottom: -110, left: -60, child: Container(width: 200, height: 200, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.05)))),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text('AutoBiz', style: _t(context, 15, w: FontWeight.w800)),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(5)),
                  child: Text('USD', style: _t(context, 10, w: FontWeight.w700)),
                ),
                const Spacer(),
                ConstrainedBox(constraints: const BoxConstraints(maxWidth: 150), child: Text(d.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: _t(context, 12, w: FontWeight.w600, color: Colors.white.withValues(alpha: 0.85)))),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                const _Chip(),
                const Spacer(),
                Transform.rotate(angle: math.pi / 2, child: AppIcon('ion:wifi', size: 22, color: Colors.white.withValues(alpha: 0.8))),
              ]),
              const SizedBox(height: 8),
              Text('Balance', style: _t(context, 10, color: white70)),
              Text(f.usd(d.balance), style: _t(context, 20, w: FontWeight.w800, tabular: true)),
              const SizedBox(height: 4),
              Text(d.revealed ? groupNumber(d.number) : maskNumber(d.number), style: _t(context, 17, w: FontWeight.w700, tabular: true, ls: 1.5)),
              const Spacer(),
              Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Flexible(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                    Text('CARD HOLDER', style: _t(context, 9, color: Colors.white.withValues(alpha: 0.65))),
                    Text(d.holder.toUpperCase(), maxLines: 1, overflow: TextOverflow.ellipsis, style: _t(context, 12, w: FontWeight.w700)),
                  ]),
                ),
                const SizedBox(width: 18),
                Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text('EXPIRES', style: _t(context, 9, color: Colors.white.withValues(alpha: 0.65))),
                  Text(d.revealed && d.expiry != null ? d.expiry! : '••/••', style: _t(context, 12, w: FontWeight.w700, tabular: true)),
                ]),
                const Spacer(),
                BrandMark(d.brand),
              ]),
            ]),
          ),
          if (d.frozen) const Positioned.fill(child: FrozenOverlay()),
        ]),
      ),
    );
  }
}

class CardBack extends StatelessWidget {
  final CardFaceData d;
  const CardBack(this.d, {super.key});
  @override
  Widget build(BuildContext context) => ClipRRect(
        borderRadius: BorderRadius.circular(R.xl),
        child: Container(
          decoration: BoxDecoration(gradient: LinearGradient(colors: d.theme.colors, stops: d.theme.stops, begin: Alignment.topRight, end: Alignment.bottomLeft)),
          child: Stack(children: [
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Container(height: 40, color: const Color(0xFF111111), margin: const EdgeInsets.only(top: 4)),
                const SizedBox(height: 14),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: Row(children: [
                    Expanded(
                      child: Container(
                        height: 34, padding: const EdgeInsets.symmetric(horizontal: 8),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.85), borderRadius: BorderRadius.circular(4)),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [Container(height: 1, color: const Color(0xFFCCCCCC)), const SizedBox(height: 6), Container(height: 1, color: const Color(0xFFCCCCCC))]),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 62, height: 34,
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4)),
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        Text('CVV', style: _t(context, 8, color: const Color(0xFF666666))),
                        Text(d.revealed && d.cvv != null ? d.cvv! : '•••', style: _t(context, 14, w: FontWeight.w800, color: const Color(0xFF111111), tabular: true)),
                      ]),
                    ),
                  ]),
                ),
                const SizedBox(height: 12),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: Text('This card is issued by AutoBiz Card Services for online payments in USD. Use the billing address shown in the app. Report issues: help@autobiz.ng', style: _t(context, 9, color: Colors.white.withValues(alpha: 0.75)).copyWith(height: 13 / 9)),
                ),
                const Spacer(),
                Padding(padding: const EdgeInsets.symmetric(horizontal: 18), child: Align(alignment: Alignment.centerRight, child: BrandMark(d.brand, size: 0.85))),
              ]),
            ),
            if (d.frozen) const Positioned.fill(child: FrozenOverlay()),
          ]),
        ),
      );
}

class FrozenOverlay extends StatelessWidget {
  const FrozenOverlay({super.key});
  @override
  Widget build(BuildContext context) => Container(
        decoration: BoxDecoration(color: const Color(0xFFD2EBFF).withValues(alpha: 0.42), borderRadius: BorderRadius.circular(R.xl)),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 54, height: 54,
            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.6), shape: BoxShape.circle),
            child: const Center(child: AppIcon('bi-snow2', size: 28, color: Color(0xFF1971C2))),
          ),
          const SizedBox(height: 6),
          Text('Card frozen', style: _t(context, 15, w: FontWeight.w700, color: const Color(0xFF0B3A66))),
        ]),
      );
}

/// 3D flip card. Tap to flip.
class FlipCard extends StatefulWidget {
  final CardFaceData face;
  final bool flipped;
  final VoidCallback? onToggle;
  const FlipCard({super.key, required this.face, required this.flipped, this.onToggle});
  @override
  State<FlipCard> createState() => _FlipCardState();
}

class _FlipCardState extends State<FlipCard> with SingleTickerProviderStateMixin {
  late final AnimationController _a = AnimationController(vsync: this, duration: const Duration(milliseconds: 650), value: widget.flipped ? 1 : 0);

  @override
  void didUpdateWidget(FlipCard old) {
    super.didUpdateWidget(old);
    if (old.flipped != widget.flipped) {
      widget.flipped ? _a.animateTo(1, curve: Curves.easeOutBack) : _a.animateTo(0, curve: Curves.easeOutBack);
    }
  }

  @override
  void dispose() { _a.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Semantics(
        button: true, label: 'Flip card',
        child: GestureDetector(
          onTap: widget.onToggle,
          child: AnimatedBuilder(
            animation: _a,
            builder: (context, _) {
              final angle = _a.value.clamp(-0.2, 1.2) * math.pi;
              final showBack = angle > math.pi / 2;
              return Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()..setEntry(3, 2, 0.001)..rotateY(angle),
                child: showBack
                    ? Transform(alignment: Alignment.center, transform: Matrix4.rotationY(math.pi), child: _sized(CardBack(widget.face)))
                    : _sized(CardFront(widget.face)),
              );
            },
          ),
        ),
      );
}

/// Static card (create preview / empty hero).
class StaticCard extends StatelessWidget {
  final CardFaceData face;
  const StaticCard(this.face, {super.key});
  @override
  Widget build(BuildContext context) => _sized(CardFront(face));
}

/// Mini thumbnail used in the selector row.
class CardThumb extends StatelessWidget {
  final VirtualCard card;
  final bool selected;
  final VoidCallback onTap;
  const CardThumb({super.key, required this.card, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final frozen = card.status == 'frozen';
    final theme = themeFor(card);
    return Semantics(
      button: true, selected: selected, label: '${card.label} card ending ${last4(card.number)}',
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedOpacity(
          duration: const Duration(milliseconds: 160),
          opacity: selected ? 1 : 0.75,
          child: Container(
            width: 128, height: 80, padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: LinearGradient(colors: frozen ? const [Color(0xFFADB5BD), Color(0xFF6C757D)] : theme.colors, begin: Alignment.topLeft, end: Alignment.bottomRight),
              border: Border.all(color: selected ? Colors.white : Colors.transparent, width: 2.5),
              boxShadow: selected ? [BoxShadow(color: Colors.black.withValues(alpha: 0.18), blurRadius: 14, offset: const Offset(0, 6))] : null,
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Row(children: [
                Expanded(child: Text(card.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: _t(context, 11, w: FontWeight.w700))),
                if (frozen) const AppIcon('bi-snow2', size: 12, color: Colors.white),
              ]),
              Text(f.usd(card.balance), style: _t(context, 13, w: FontWeight.w800, tabular: true)),
              Row(children: [
                Expanded(child: Text('•••• ${last4(card.number)}', style: _t(context, 10, color: Colors.white.withValues(alpha: 0.85), tabular: true))),
                BrandMark(card.brand, size: 0.5),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}
