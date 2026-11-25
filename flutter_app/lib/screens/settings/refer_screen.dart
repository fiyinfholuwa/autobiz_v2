import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/settings/settings_shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /settings/refer
class ReferScreen extends StatelessWidget {
  /// query parameters
  final Map<String, String> q;
  const ReferScreen({super.key, this.q = const {}});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final username = context.watch<AppStore>().user.username;
    final base = (username.isEmpty ? 'autobiz' : username).toUpperCase();
    final code = '${base.length > 10 ? base.substring(0, 10) : base}26';
    final link = 'https://autobiz.app/register?ref=$code';
    final msg = 'Join me on AutoBiz — pay bills, shop, buy eSIMs & more. Get ₦200 bonus with my code $code: $link';
    final white = Colors.white;
    return AppScreen(
      header: const AppHeader(title: 'Refer & earn'),
      children: [
        Container(
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(24), gradient: const LinearGradient(colors: [Color(0xFFF06595), Color(0xFF7048E8)], begin: Alignment.topLeft, end: Alignment.bottomRight)),
          child: Stack(children: [
            Positioned(right: -30, top: -30, child: Container(width: 150, height: 150, decoration: BoxDecoration(shape: BoxShape.circle, color: white.withValues(alpha: 0.1)))),
            Positioned(right: 16, bottom: 12, child: AppIcon('bi-gift', size: 64, color: white.withValues(alpha: 0.25))),
            Padding(
              padding: const EdgeInsets.all(22),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(99)),
                  child: AppText('Refer & earn', size: 11, weight: FontWeight.w700, color: white),
                ),
                const SizedBox(height: 12),
                AppText('Earn ₦500 for every friend', v: TV.h1, color: white),
                const SizedBox(height: 6),
                AppText('Your friend gets ₦200 bonus after their first ₦2,000 transaction.', v: TV.sm, color: white.withValues(alpha: 0.88)),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const AppText('Your referral code', v: TV.label, muted: true),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(R.lg), border: Border.all(color: c.primary, width: 1.5)),
              child: Row(children: [
                Expanded(child: AppText(code, v: TV.h2, color: c.primary, selectable: true)),
                Btn('Copy', size: BtnSize.sm, icon: 'bi-copy', onPressed: () => copyText(code, 'Referral code copied')),
              ]),
            ),
            const SizedBox(height: 10),
            AppText(link, v: TV.xs, muted: true, maxLines: 1),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: Btn('Copy link', icon: 'bi-copy', variant: BtnVariant.soft, onPressed: () => copyText(link, 'Referral link copied'))),
              const SizedBox(width: 10),
              Expanded(child: Btn('WhatsApp', icon: 'bi-whatsapp', variant: BtnVariant.soft, onPressed: () async {
                final ok = await launchUrl(Uri.parse('https://wa.me/?text=${Uri.encodeComponent(msg)}'), mode: LaunchMode.externalApplication).catchError((_) => false);
                if (!ok) toast("WhatsApp isn't available", type: ToastType.warning);
              })),
            ]),
            const SizedBox(height: 10),
            Btn('Share invite', icon: 'bi-share', onPressed: () => shareText('Join me on AutoBiz', msg)),
          ]),
        ),
        const SizedBox(height: 16),
        Row(children: [
          for (final (i, (v, l, icon)) in const [('12', 'Invited', 'bi-send'), ('8', 'Joined', 'bi-people'), ('₦4k', 'Earned', 'bi-wallet2')].indexed) ...[
            if (i > 0) const SizedBox(width: 10),
            Expanded(
              child: CardBox(
                padding: const EdgeInsets.all(14),
                child: Column(children: [AppIcon(icon, size: 20, color: c.primary), const SizedBox(height: 6), AppText(v, v: TV.h2), AppText(l, v: TV.xs, muted: true)]),
              ),
            ),
          ],
        ]),
        const SizedBox(height: 16),
        const CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            AppText('How it works', v: TV.h3),
            SizedBox(height: 12),
            NumberedStep(1, 'Share your code or link with friends'),
            NumberedStep(2, 'They sign up and make a ₦2,000+ transaction'),
            NumberedStep(3, 'You get ₦500, they get ₦200 — instantly'),
          ]),
        ),
      ],
    );
  }
}
