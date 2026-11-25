import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../features/settings/settings_shared.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _contacts = [
  ('WhatsApp', 'Chat with us', 'bi-whatsapp', 'success', 'https://wa.me/2348000000000', null),
  ('Email', 'support@autobiz.ng', 'bi-envelope', 'primary', 'mailto:support@autobiz.ng', null),
  ('Call us', '0800 000 0000', 'bi-telephone', 'violet', 'tel:+2348000000000', null),
  ('Report a payment', 'From any receipt', 'bi-receipt', 'orange', null, '/transactions'),
];

const _faq = [
  ('How long does wallet funding take?', 'Bank transfers to your dedicated account reflect within 1 minute. Card payments are instant.'),
  ("My airtime/data didn't arrive. What do I do?", "Most purchases deliver in seconds. If it's been more than 10 minutes, open the transaction and tap “Report issue” — failed purchases are refunded automatically."),
  ('How do I increase my limits?', 'Verify your BVN to reach Tier 2 and your NIN with proof of address for Tier 3. Go to Verification in Settings.'),
  ('Is my money safe?', 'Wallet funds are held with CBN-licensed partner banks. Every payment requires your transaction PIN, and you can enable 2FA for logins.'),
];

/// Route: /settings/help
class HelpScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const HelpScreen({super.key, this.q = const {}});
  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  int? open = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final authed = context.watch<AppStore>().authed;
    return AppScreen(
      header: const AppHeader(title: 'Help & support', subtitle: "We're available 24/7"),
      children: [
        LayoutBuilder(builder: (context, cons) {
          final w = (cons.maxWidth - 10) / 2;
          return Wrap(spacing: 10, runSpacing: 10, children: [
            for (final x in _contacts)
              SizedBox(
                width: w,
                child: CardBox(
                  onTap: () async {
                    if (x.$6 != null) {
                      authed ? context.push(x.$6!) : context.push(loc('/login', {'next': x.$6}));
                      return;
                    }
                    final ok = await launchUrl(Uri.parse(x.$5!), mode: LaunchMode.externalApplication).catchError((_) => false);
                    if (!ok) toast("Couldn't open ${x.$1}", type: ToastType.warning);
                  },
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    IconTile(x.$3, tone: x.$4, size: 42),
                    const SizedBox(height: 10),
                    AppText(x.$1, weight: FontWeight.w700),
                    AppText(x.$2, v: TV.xs, muted: true, maxLines: 1),
                  ]),
                ),
              ),
          ]);
        }),
        const SizedBox(height: 22),
        const AppText('Frequently asked questions', v: TV.h3),
        const SizedBox(height: 10),
        CardBox(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Column(children: [
            for (var i = 0; i < _faq.length; i++)
              Container(
                decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
                child: Semantics(
                  button: true, expanded: open == i,
                  child: InkWell(
                    onTap: () { tapHaptic(); setState(() => open = open == i ? null : i); },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: AnimatedSize(
                        duration: const Duration(milliseconds: 200),
                        alignment: Alignment.topCenter,
                        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                          Row(children: [
                            Expanded(child: AppText(_faq[i].$1, weight: FontWeight.w600)),
                            const SizedBox(width: 10),
                            AppIcon(open == i ? 'bi-chevron-up' : 'bi-chevron-down', size: 18, color: c.muted),
                          ]),
                          if (open == i) Padding(padding: const EdgeInsets.only(top: 8), child: AppText(_faq[i].$2, v: TV.sm, muted: true)),
                        ]),
                      ),
                    ),
                  ),
                ),
              ),
          ]),
        ),
        if (authed)
          const Group(title: 'Account', children: [
            ListRow(icon: 'bi-arrow-counterclockwise', tone: 'warning', title: 'Reset demo data', subtitle: 'Restore the wallet, transactions, cart and settings to defaults', onTap: confirmReset),
            ListRow(icon: 'bi-box-arrow-right', danger: true, title: 'Log out', subtitle: 'Sign out of AutoBiz on this device', onTap: confirmLogout),
          ]),
        const SizedBox(height: 20),
        const AppText('AutoBiz Technologies Ltd · support@autobiz.ng', v: TV.xs, muted: true, center: true),
      ],
    );
  }
}
