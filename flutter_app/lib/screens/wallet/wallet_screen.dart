import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../features/wallet/constants.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _walletTypes = ['funding', 'withdrawal', 'transfer', 'convert', 'refund', 'giftcard'];

/// Route: /wallet — ported from mobile_app/src/app/wallet/index.tsx
class WalletScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const WalletScreen({super.key, this.q = const {}});
  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  String dir = 'all';

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final s = context.watch<AppStore>();
    final user = s.user;
    final hide = s.settings.hideBalance;
    final l = tierLimit(user.tier);
    final used = usedToday();
    final activity = s.transactions.where((t) => _walletTypes.contains(t.type) && (dir == 'all' || t.direction == dir)).take(8).toList();
    final dailyPct = used / l.daily;
    final balPct = l.unlimited ? 0.04 : s.balance / l.maxBal;
    final actions = [
      ('bi-plus-lg', 'Add money', openFund),
      ('bi-bank', 'Withdraw', () => context.push('/wallet/withdraw')),
      ('bi-send', 'Transfer', () => context.push('/wallet/transfer')),
      ('bi-arrow-left-right', 'Convert', () => context.push('/wallet/convert')),
    ];

    return AppScreen(
      header: AppHeader(title: 'Wallet', subtitle: 'Naira & Dollar balances', actions: [IconBtn('bi-receipt', tooltip: 'Statement', onPressed: () => context.push('/transactions'))]),
      children: [
        Container(
          margin: const EdgeInsets.only(top: 6),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(R.xxl),
            gradient: LinearGradient(colors: [c.primary600, c.primary700, const Color(0xFF0F3F3A)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              const AppText('Available balances', v: TV.sm, color: Color(0xD9FFFFFF)),
              const SizedBox(width: 8),
              Semantics(
                button: true, label: hide ? 'Show balances' : 'Hide balances',
                child: GestureDetector(
                  onTap: () => store.mutate(() => store.settings.hideBalance = !store.settings.hideBalance),
                  child: AppIcon(hide ? 'bi-eye-slash' : 'bi-eye', size: 18, color: Colors.white),
                ),
              ),
              const Spacer(),
              Pill(user.tier, icon: 'bi-patch-check', tone: 'success', solid: true),
            ]),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: _BalBox(flag: 'ng', label: 'Naira · NGN', value: hide ? '₦ ••••••' : f.naira(s.balance, 2), sub: hide ? '≈ \$ ••••' : '≈ ${f.usd(s.balance / buyRate)}')),
              const SizedBox(width: 10),
              Expanded(child: _BalBox(flag: 'us', label: 'Dollar · USD', value: hide ? '\$ ••••' : f.usd(s.usd), sub: hide ? '≈ ₦ ••••' : '≈ ${f.naira(s.usd * sellRate)} at sell rate')),
            ]),
            const SizedBox(height: 16),
            Row(children: [
              for (final a in actions)
                Expanded(
                  child: GestureDetector(
                    onTap: () { tapHaptic(); a.$3(); },
                    behavior: HitTestBehavior.opaque,
                    child: Column(children: [
                      Container(
                        width: 48, height: 48,
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(16)),
                        child: Center(child: AppIcon(a.$1, size: 20, color: Colors.white)),
                      ),
                      const SizedBox(height: 6),
                      AppText(a.$2, v: TV.xs, weight: FontWeight.w600, color: Colors.white),
                    ]),
                  ),
                ),
            ]),
          ]),
        ),

        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SectionHeader(
              'Account limits',
              subtitle: '${user.tier} · ${l.next != null ? 'Upgrade for higher limits' : 'Maximum tier'}',
              action: l.next != null ? 'Upgrade' : null,
              onAction: () => context.push(loc('/settings/verification', {'upgrade': '1'})),
            ),
            _limitRow('Daily transaction limit', '${f.naira(used)} / ${f.naira(l.daily)}'),
            const SizedBox(height: 6),
            ProgressBar(dailyPct, color: dailyPct > 0.85 ? c.danger : c.primary),
            const SizedBox(height: 14),
            _limitRow('Maximum balance', l.unlimited ? 'Unlimited' : '${f.naira(s.balance)} / ${f.naira(l.maxBal)}'),
            const SizedBox(height: 6),
            ProgressBar(balPct, color: balPct > 0.85 ? c.danger : c.primary),
            const SizedBox(height: 14),
            Row(children: [const Expanded(child: AppText('Single transfer limit', v: TV.sm, muted: true)), AppText(f.naira(l.single), v: TV.sm, weight: FontWeight.w700)]),
          ]),
        ),

        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SectionHeader('Wallet activity'),
            Segment<String>(small: true, value: dir, onChanged: (v) => setState(() => dir = v), options: const [SegOption('all', 'All'), SegOption('in', 'Money in'), SegOption('out', 'Money out')]),
            const SizedBox(height: 4),
            if (activity.isNotEmpty)
              for (final t in activity) TxRow(t)
            else
              const EmptyState(icon: 'bi-wallet2', title: 'No wallet activity', message: 'Fund, withdraw or transfer to see it here.'),
            const SizedBox(height: 8),
            Btn('View full history', variant: BtnVariant.soft, full: true, onPressed: () => context.push('/transactions')),
          ]),
        ),

        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SectionHeader('Dedicated accounts', subtitle: 'Transfer here to fund your wallet instantly'),
            for (final (b, n) in dedicatedAccounts)
              Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(R.lg)),
                child: Row(children: [
                  BrandTile(color: bankColor(b), text: bankAbbr(b), size: 40),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    AppText(b, v: TV.xs, muted: true),
                    AppText('${n.substring(0, 4)} ${n.substring(4, 8)} ${n.substring(8)}', v: TV.h3, tabular: true),
                    AppText('AutoBiz – ${user.firstName} ${user.lastName}', v: TV.xs, muted: true),
                  ])),
                  IconBtn('bi-copy', bg: c.surface, tooltip: 'Copy account number', onPressed: () => copyText(n, 'Account number copied')),
                ]),
              ),
            const SizedBox(height: 2),
            Btn('Share account details', icon: 'bi-share', variant: BtnVariant.outline, full: true, onPressed: () {
              final text = 'Send money to my AutoBiz wallet:\n${dedicatedAccounts.map((a) => '${a.$1} – ${a.$2}').join('\n')}\nName: AutoBiz – ${user.firstName} ${user.lastName}';
              shareText('AutoBiz account details', text);
            }),
          ]),
        ),

        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            SectionHeader('Saved bank accounts', action: '+ Add', onAction: () => context.push('/wallet/withdraw')),
            if (s.bankAccounts.isNotEmpty)
              for (final a in s.bankAccounts)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Row(children: [
                    BrandTile(color: bankColor(a.bank), text: bankAbbr(a.bank), size: 40),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      AppText(a.name, weight: FontWeight.w600, maxLines: 1),
                      AppText('${a.bank} · ${a.number}', v: TV.xs, muted: true),
                    ])),
                    Btn('Withdraw', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => context.push(loc('/wallet/withdraw', {'bank': a.bank, 'number': a.number}))),
                    const SizedBox(width: 8),
                    IconBtn('bi-trash', size: 34, color: c.danger, bg: c.dangerSoft, tooltip: 'Remove account', onPressed: () {
                      store.mutate(() => store.bankAccounts.removeWhere((x) => x.id == a.id));
                      toast('Bank account removed', type: ToastType.info);
                    }),
                  ]),
                )
            else
              const EmptyState(icon: 'bi-bank', title: 'No saved accounts', message: 'Save an account when you withdraw.'),
          ]),
        ),

        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const SectionHeader('Exchange rates', subtitle: 'Updated just now'),
            Row(children: [
              Expanded(child: _rateBox(context, 'Buy \$1', buyRate, 'bi-arrow-down-left', c.success)),
              const SizedBox(width: 10),
              Expanded(child: _rateBox(context, 'Sell \$1', sellRate, 'bi-arrow-up-right', c.orange)),
            ]),
            const SizedBox(height: 12),
            Btn('Convert now', icon: 'bi-arrow-left-right', full: true, onPressed: () => context.push('/wallet/convert')),
          ]),
        ),
      ],
    );
  }

  Widget _limitRow(String l, String v) => Row(children: [
        Expanded(child: AppText(l, v: TV.sm, muted: true)),
        AppText(v, v: TV.sm, weight: FontWeight.w600, tabular: true),
      ]);

  Widget _rateBox(BuildContext context, String l, double v, String icon, Color color) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: context.c.surface2, borderRadius: BorderRadius.circular(R.lg)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [AppIcon(icon, size: 14, color: color), const SizedBox(width: 6), AppText(l, v: TV.xs, muted: true)]),
          const SizedBox(height: 4),
          AppText(f.naira(v), v: TV.h3),
        ]),
      );
}

class _BalBox extends StatelessWidget {
  final String flag, label, value, sub;
  const _BalBox({required this.flag, required this.label, required this.value, required this.sub});
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(R.lg)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [FlagImg(flag, size: 18), const SizedBox(width: 6), Flexible(child: AppText(label, v: TV.xs, color: const Color(0xD9FFFFFF), maxLines: 1))]),
          const SizedBox(height: 8),
          FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: AppText(value, v: TV.h3, color: Colors.white, tabular: true, maxLines: 1)),
          AppText(sub, size: 11, color: const Color(0xB3FFFFFF), maxLines: 1),
        ]),
      );
}
