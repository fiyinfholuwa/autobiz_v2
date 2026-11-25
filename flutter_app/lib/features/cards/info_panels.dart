/// Billing address, works-on merchants, fees and FAQ — ported from InfoPanels.tsx.
library;

import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../ui/app_icon.dart';
import '../../ui/overlay.dart';
import '../../ui/text.dart';
import '../../ui/widgets.dart';
import 'constants.dart';

Widget _row(BuildContext context, int i, Widget child, {double v = 10}) => Container(
      padding: EdgeInsets.symmetric(vertical: v),
      decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: context.c.border)) : null),
      child: child,
    );

class BillingCard extends StatelessWidget {
  const BillingCard({super.key});
  @override
  Widget build(BuildContext context) => CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              AppText('Billing address', v: TV.h3),
              SizedBox(height: 2),
              AppText('Use this at checkout for any card', v: TV.xs, muted: true),
            ])),
            Btn('Copy all', icon: 'bi-copy', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => copyText(billingAll, 'Billing address copied')),
          ]),
          const SizedBox(height: 10),
          for (var i = 0; i < billing.length; i++)
            _row(context, i, Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                AppText(billing[i].$1, v: TV.xs, muted: true),
                AppText(billing[i].$2, weight: FontWeight.w600, selectable: true),
              ])),
              IconBtn('bi-copy', size: 34, bg: context.c.surface2, tooltip: 'Copy ${billing[i].$1}', onPressed: () => copyText(billing[i].$3 ?? billing[i].$2, '${billing[i].$1} copied')),
            ])),
        ]),
      );
}

class WorksOnCard extends StatelessWidget {
  const WorksOnCard({super.key});
  @override
  Widget build(BuildContext context) => CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SectionHeader('Works on', subtitle: 'Accepted by 40M+ online merchants worldwide'),
          LayoutBuilder(builder: (context, cons) {
            final w = (cons.maxWidth - 36) / 4;
            return Wrap(spacing: 12, runSpacing: 12, children: [
              for (final k in worksOn)
                SizedBox(
                  width: w,
                  child: Column(children: [
                    BrandTile(color: merchants[k]!.bg, fg: merchants[k]!.fg, icon: merchants[k]!.icon, size: 44),
                    const SizedBox(height: 5),
                    AppText(merchants[k]!.short, size: 10, weight: FontWeight.w600, muted: true, maxLines: 1),
                  ]),
                ),
            ]);
          }),
        ]),
      );
}

class FeesCard extends StatelessWidget {
  const FeesCard({super.key});
  @override
  Widget build(BuildContext context) => CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SectionHeader('Fees & limits'),
          for (var i = 0; i < fees.length; i++)
            _row(context, i, Row(children: [Expanded(child: AppText(fees[i].$1, v: TV.sm, muted: true)), AppText(fees[i].$2, v: TV.sm, weight: FontWeight.w700)]), v: 9),
        ]),
      );
}

class FaqCard extends StatefulWidget {
  const FaqCard({super.key});
  @override
  State<FaqCard> createState() => _FaqCardState();
}

class _FaqCardState extends State<FaqCard> {
  int? open = 0;
  @override
  Widget build(BuildContext context) => CardBox(
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SectionHeader('Frequently asked'),
          for (var i = 0; i < faq.length; i++)
            Container(
              decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: context.c.border)) : null),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                InkWell(
                  onTap: () => setState(() => open = open == i ? null : i),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(children: [
                      Expanded(child: AppText(faq[i].$1, weight: FontWeight.w600)),
                      const SizedBox(width: 10),
                      AppIcon(open == i ? 'bi-chevron-up' : 'bi-chevron-down', size: 16, color: context.c.muted),
                    ]),
                  ),
                ),
                AnimatedSize(
                  duration: const Duration(milliseconds: 200),
                  child: open == i ? Padding(padding: const EdgeInsets.only(bottom: 12), child: RichAppText(faq[i].$2, v: TV.sm, muted: true)) : const SizedBox(width: double.infinity),
                ),
              ]),
            ),
        ]),
      );
}

class InfoPanels extends StatelessWidget {
  const InfoPanels({super.key});
  @override
  Widget build(BuildContext context) => const Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        BillingCard(), SizedBox(height: 14), WorksOnCard(), SizedBox(height: 14), FeesCard(), SizedBox(height: 14), FaqCard(),
      ]);
}
