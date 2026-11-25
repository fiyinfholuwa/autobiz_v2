/// Card action sheets — ported from mobile_app/src/features/cards/sheets.tsx.
library;

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../core/theme.dart';
import '../../store/app_store.dart';
import '../../ui/inputs.dart';
import '../../ui/overlay.dart';
import '../../ui/sheet.dart';
import '../../ui/text.dart';
import '../../ui/widgets.dart';
import 'constants.dart';

final _amtFormatter = TextInputFormatter.withFunction((o, n) {
  final t = cleanAmt(n.text);
  return TextEditingValue(text: t, selection: TextSelection.collapsed(offset: t.length));
});

/* ---------------- Reveal PIN ---------------- */
/// Returns true when the PIN was verified.
class RevealPinSheet extends StatefulWidget {
  const RevealPinSheet({super.key});
  @override
  State<RevealPinSheet> createState() => _RevealPinSheetState();
}

class _RevealPinSheetState extends State<RevealPinSheet> with SingleTickerProviderStateMixin {
  String pin = '';
  bool busy = false, err = false;
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));
  @override
  void dispose() { _shake.dispose(); super.dispose(); }

  Future<void> _submit(String p) async {
    final setting = store.settings.pin;
    final ok = setting != null ? p == setting : p != '0000';
    if (!ok) {
      setState(() => err = true);
      HapticFeedback.heavyImpact();
      _shake.forward(from: 0);
      toast('Incorrect PIN. Try again.', type: ToastType.error);
      await sleep(450);
      if (mounted) setState(() { pin = ''; err = false; });
      return;
    }
    setState(() => busy = true);
    await sleep(600);
    if (mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final hasPin = store.settings.pin != null;
    return AppSheet(
      title: 'Reveal card details',
      subtitle: 'Enter your transaction PIN to view the full card number, expiry date and CVV.',
      locked: busy,
      child: Column(children: [
        const SizedBox(height: 10),
        AnimatedBuilder(
          animation: _shake,
          builder: (_, child) {
            final t = _shake.value;
            return Transform.translate(offset: Offset(t == 0 ? 0 : 10 * (1 - t) * ((t * 10).floor().isEven ? 1 : -1), 0), child: child);
          },
          child: PinDots(value: pin, error: err),
        ),
        const SizedBox(height: 10),
        AppText(busy ? 'Verifying…' : hasPin ? 'Use your transaction PIN' : 'Demo: any PIN works except 0000', v: TV.xs, muted: true, center: true),
        const SizedBox(height: 12),
        Keypad(
          disabled: busy,
          onKey: (d) {
            if (pin.length >= 4) return;
            setState(() => pin += d);
            if (pin.length == 4) { final v = pin; Future.delayed(const Duration(milliseconds: 120), () => _submit(v)); }
          },
          onDelete: () => setState(() => pin = pin.isEmpty ? pin : pin.substring(0, pin.length - 1)),
        ),
      ]),
    );
  }
}

/* ---------------- Fund ---------------- */
class FundCardSheet extends StatefulWidget {
  final String cardId;
  const FundCardSheet(this.cardId, {super.key});
  @override
  State<FundCardSheet> createState() => _FundCardSheetState();
}

class _FundCardSheetState extends State<FundCardSheet> {
  String v = '';
  String? err;

  Future<void> _go(VirtualCard card) async {
    final a = amt(v);
    final cost = fundCost(a);
    if (a < 1) { setState(() => err = 'Enter at least \$1.00.'); return; }
    if (card.balance + a > maxBal) { setState(() => err = "Card balance can't exceed \$10,000.00."); return; }
    if (!store.canAfford(cost.naira)) { setState(() => err = 'Insufficient wallet balance (needs ${f.naira(cost.naira, 2)}).'); return; }
    Navigator.of(context).pop();
    await sleep(320);
    final tag = cardTag(card);
    final ok = await confirmPay(PayOpts(title: 'Fund virtual card', amount: cost.naira, cta: 'Fund card', rows: [SRow('Card', '${card.label} · $tag'), SRow('Amount', f.usd(a)), SRow('Fee', f.usd(cost.fee)), const SRow('Rate', '₦1,580/\$')]));
    if (!ok) return;
    final tx = store.debit(cost.naira, TxInput(type: 'card', title: 'Card Funding', subtitle: '${card.label} $tag · ${f.usd(a)}', icon: 'bi-credit-card-2-front', tone: 'success'));
    if (tx == null) { toast('Insufficient wallet balance', type: ToastType.error); return; }
    updateCard(card.id, (x) => x.balance = r2(x.balance + a));
    addCardTx(card.id, kind: 'topup', direction: 'in', title: 'Card top-up', note: 'From NGN wallet', amount: a, status: 'success');
    store.notify(icon: 'bi-credit-card-2-front', tone: 'success', title: 'Card funded', body: '${f.usd(a)} added to ${card.label} ($tag).');
    success(SuccessOpts(title: 'Card funded', message: '${f.usd(a)} has been added to your card.', rows: [SRow('New card balance', f.usd(getCard(card.id)?.balance ?? 0)), SRow('Charged', f.naira(cost.naira, 2)), SRow('Reference', tx.id)]));
  }

  @override
  Widget build(BuildContext context) {
    final s = context.watch<AppStore>();
    final card = getCard(widget.cardId);
    if (card == null) return const AppSheet(child: SizedBox(height: 40));
    final a = amt(v);
    final cost = fundCost(a);
    return AppSheet(
      title: 'Fund card ${cardTag(card)}',
      footer: Btn('Continue', size: BtnSize.lg, full: true, onPressed: () => _go(card)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        AppTextField(label: 'Amount (USD)', prefix: r'$', big: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), placeholder: '0.00', value: v, inputFormatters: [_amtFormatter], error: err, onChanged: (t) => setState(() { v = t; err = null; })),
        const SizedBox(height: 10),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final p in [5, 10, 20, 50, 100]) AppChip('\$$p', active: a == p, onTap: () => setState(() { v = '$p'; err = null; }))]),
        const SizedBox(height: 14),
        Summary([SRow('Funding fee (1%)', f.usd(cost.fee)), const SRow('Rate', '\$1 = ₦1,580')], total: ('You pay', f.naira(cost.naira, 2))),
        const SizedBox(height: 10),
        Text.rich(TextSpan(style: tvStyle(context, TV.xs, muted: true), children: [
          const TextSpan(text: 'Card balance after: '),
          TextSpan(text: f.usd(card.balance + a), style: TextStyle(fontWeight: FontWeight.w700, color: context.c.text)),
          TextSpan(text: ' · Wallet: ${f.naira(s.balance, 2)}'),
        ])),
      ]),
    );
  }
}

/* ---------------- Withdraw ---------------- */
class WithdrawCardSheet extends StatefulWidget {
  final String cardId;
  const WithdrawCardSheet(this.cardId, {super.key});
  @override
  State<WithdrawCardSheet> createState() => _WithdrawCardSheetState();
}

class _WithdrawCardSheetState extends State<WithdrawCardSheet> {
  String v = '';
  String? err;

  Future<void> _go(VirtualCard card) async {
    final a = amt(v);
    final ngn = r2(a * sellRate);
    if (a < 1) { setState(() => err = r'Minimum withdrawal is $1.00.'); return; }
    if (a > card.balance) { setState(() => err = 'Amount exceeds card balance.'); return; }
    Navigator.of(context).pop();
    await sleep(320);
    final tag = cardTag(card);
    final ok = await confirmPay(PayOpts(title: 'Withdraw from card', amount: ngn, amountLabel: "You'll receive", skipBalanceCheck: true, cta: 'Withdraw', rows: [SRow('From', '${card.label} · $tag'), SRow('Amount', f.usd(a)), const SRow('Rate', '₦1,540/\$')]));
    if (!ok) return;
    final fresh = getCard(card.id);
    if (fresh == null || a > fresh.balance) { toast('Card balance changed. Try again.', type: ToastType.error); return; }
    updateCard(card.id, (x) => x.balance = r2(x.balance - a));
    addCardTx(card.id, kind: 'withdraw', direction: 'out', title: 'Withdrawal', note: 'To NGN wallet', amount: a, status: 'success');
    final tx = store.credit(ngn, TxInput(type: 'card', title: 'Card Withdrawal', subtitle: '${card.label} $tag · ${f.usd(a)}', icon: 'bi-credit-card-2-front', tone: 'success'));
    store.notify(icon: 'bi-arrow-down-left', tone: 'success', title: 'Card withdrawal', body: '${f.naira(ngn)} credited to your wallet.');
    success(SuccessOpts(title: 'Withdrawal successful', message: '${f.naira(ngn, 2)} has been credited to your Naira wallet.', rows: [SRow('Card balance', f.usd(getCard(card.id)?.balance ?? 0)), SRow('Wallet balance', f.naira(store.balance, 2)), SRow('Reference', tx.id)]));
  }

  @override
  Widget build(BuildContext context) {
    context.watch<AppStore>();
    final card = getCard(widget.cardId);
    if (card == null) return const AppSheet(child: SizedBox(height: 40));
    final ngn = r2(amt(v) * sellRate);
    return AppSheet(
      title: 'Withdraw to Naira wallet',
      footer: Btn('Continue', size: BtnSize.lg, full: true, onPressed: () => _go(card)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text.rich(TextSpan(style: tvStyle(context, TV.sm, muted: true), children: [
          const TextSpan(text: 'Available on card '),
          TextSpan(text: f.usd(card.balance), style: TextStyle(fontWeight: FontWeight.w700, color: context.c.text)),
        ])),
        const SizedBox(height: 10),
        AppTextField(
          label: 'Amount (USD)', prefix: r'$', big: true, keyboardType: const TextInputType.numberWithOptions(decimal: true), placeholder: '0.00', value: v, inputFormatters: [_amtFormatter], error: err,
          onChanged: (t) => setState(() { v = t; err = null; }),
          suffix: Btn('Max', size: BtnSize.sm, variant: BtnVariant.soft, onPressed: () => setState(() { v = _plain(card.balance); err = null; })),
        ),
        const SizedBox(height: 14),
        Summary(const [SRow('Withdrawal rate', '\$1 = ₦1,540')], total: ("You'll receive", f.naira(ngn, 2))),
      ]),
    );
  }
}

/// JS String(number): 12.5 → "12.5", 12 → "12"
String _plain(double n) => n == n.roundToDouble() ? n.toInt().toString() : n.toString();

/* ---------------- Limit ---------------- */
class LimitSheet extends StatefulWidget {
  final String cardId;
  const LimitSheet(this.cardId, {super.key});
  @override
  State<LimitSheet> createState() => _LimitSheetState();
}

class _LimitSheetState extends State<LimitSheet> {
  late double lim = getCard(widget.cardId)?.limit ?? defaultLimit;
  @override
  Widget build(BuildContext context) {
    final card = getCard(widget.cardId);
    if (card == null) return const AppSheet(child: SizedBox(height: 40));
    final c = context.c;
    final spent = monthSpent(card);
    return AppSheet(
      title: 'Monthly spending limit',
      subtitle: "Payments that would take this month's spend above the limit will be declined.",
      footer: Btn('Save limit', size: BtnSize.lg, full: true, onPressed: () {
        updateCard(card.id, (x) => x.limit = lim);
        Navigator.of(context).pop();
        toast('Monthly limit set to **${f.usd(lim)}**');
      }),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const SizedBox(height: 10),
        AppText(f.usd(lim), v: TV.display, tabular: true, center: true),
        AppText('per month · spent so far ${f.usd(spent)}', v: TV.sm, muted: true, center: true),
        const SizedBox(height: 10),
        SliderTheme(
          data: SliderTheme.of(context).copyWith(activeTrackColor: c.primary, inactiveTrackColor: c.surface2, thumbColor: c.primary, overlayColor: c.primary.withValues(alpha: 0.12), trackHeight: 6),
          child: Slider(min: 50, max: 5000, divisions: 99, value: lim.clamp(50, 5000), onChanged: (x) { tapHaptic(); setState(() => lim = (x / 50).round() * 50.0); }),
        ),
        const Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [AppText(r'$50', v: TV.xs, muted: true), AppText(r'$5,000', v: TV.xs, muted: true)]),
        const SizedBox(height: 14),
        Wrap(spacing: 8, runSpacing: 8, children: [for (final p in [100, 250, 500, 1000, 2500]) AppChip(f.usd(p).replaceAll('.00', ''), active: lim == p, onTap: () => setState(() => lim = p.toDouble()))]),
      ]),
    );
  }
}

/* ---------------- Rename ---------------- */
class RenameSheet extends StatefulWidget {
  final String cardId;
  const RenameSheet(this.cardId, {super.key});
  @override
  State<RenameSheet> createState() => _RenameSheetState();
}

class _RenameSheetState extends State<RenameSheet> {
  late String v = getCard(widget.cardId)?.label ?? '';
  String? err;
  void _save() {
    final t = v.trim();
    if (t.length < 2) { setState(() => err = 'Enter 2–20 characters.'); return; }
    updateCard(widget.cardId, (x) => x.label = t);
    Navigator.of(context).pop();
    toast('Card renamed');
  }

  @override
  Widget build(BuildContext context) => AppSheet(
        title: 'Rename card',
        footer: Btn('Save', size: BtnSize.lg, full: true, onPressed: _save),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          AppTextField(label: 'Nickname', value: v, maxLength: 20, autofocus: true, error: err, textInputAction: TextInputAction.done, onSubmitted: (_) => _save(), onChanged: (t) => setState(() { v = t; err = null; })),
          const SizedBox(height: 12),
          Wrap(spacing: 8, runSpacing: 8, children: [for (final p in ['Subscriptions', 'Shopping', 'Ads', 'Travel', 'Business']) AppChip(p, active: v == p, onTap: () => setState(() { v = p; err = null; }))]),
        ]),
      );
}

/* ---------------- Terminate ---------------- */
class TerminateSheet extends StatefulWidget {
  final String cardId;
  final VoidCallback onTerminated;
  const TerminateSheet(this.cardId, {super.key, required this.onTerminated});
  @override
  State<TerminateSheet> createState() => _TerminateSheetState();
}

class _TerminateSheetState extends State<TerminateSheet> {
  bool ok = false;

  Future<void> _go(VirtualCard card) async {
    final ngn = r2(card.balance * sellRate);
    final tag = cardTag(card);
    Navigator.of(context).pop();
    await sleep(320);
    final confirmed = await confirmPay(PayOpts(title: 'Confirm termination', amount: ngn, amountLabel: 'Refund to wallet', skipBalanceCheck: true, cta: 'Terminate card', rows: [SRow('Card', '${card.label} · $tag'), SRow('Balance', f.usd(card.balance))]));
    if (!confirmed) return;
    store.mutate(() => store.cards.removeWhere((x) => x.id == card.id));
    String? txId;
    if (ngn > 0) txId = store.credit(ngn, TxInput(type: 'card', title: 'Card Terminated · Refund', subtitle: '${card.label} $tag · ${f.usd(card.balance)}', icon: 'bi-credit-card-2-front', tone: 'success')).id;
    store.notify(icon: 'bi-trash', tone: 'danger', title: 'Card terminated', body: '${card.label} ($tag) was closed.');
    widget.onTerminated();
    success(SuccessOpts(
      title: 'Card terminated',
      message: ngn > 0 ? '${f.naira(ngn, 2)} has been returned to your wallet.' : 'Your card has been closed.',
      rows: txId != null ? [SRow('Refund', f.naira(ngn, 2)), SRow('Reference', txId)] : const [],
    ));
  }

  @override
  Widget build(BuildContext context) {
    final card = getCard(widget.cardId);
    if (card == null) return const AppSheet(child: SizedBox(height: 40));
    final ngn = r2(card.balance * sellRate);
    return AppSheet(
      title: 'Terminate this card?',
      subtitle: '${card.label} (${cardTag(card)}) will be permanently closed. Subscriptions using it will fail.',
      footer: Row(children: [
        Expanded(child: Btn('Keep card', variant: BtnVariant.outline, onPressed: () => Navigator.of(context).pop())),
        const SizedBox(width: 10),
        Expanded(child: Btn('Terminate', variant: BtnVariant.danger, disabled: !ok, onPressed: () => _go(card))),
      ]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Summary([SRow('Card balance', f.usd(card.balance)), SRow('Returned to wallet', f.naira(ngn, 2))]),
        const SizedBox(height: 12),
        AppCheckbox(checked: ok, onChanged: (x) => setState(() => ok = x), label: 'I understand this action cannot be undone'),
      ]),
    );
  }
}

/* ---------------- Simulate online payment ---------------- */
class SimulateSheet extends StatefulWidget {
  final String cardId;
  final VoidCallback onSent;
  const SimulateSheet(this.cardId, {super.key, required this.onSent});
  @override
  State<SimulateSheet> createState() => _SimulateSheetState();
}

class _SimulateSheetState extends State<SimulateSheet> {
  final keys = merchants.keys.toList();
  late String m = keys[math.Random().nextInt(keys.length)];
  late String v = (1 + math.Random().nextDouble() * 14).toStringAsFixed(2);
  String? err;

  void _send() {
    final a = r2(amt(v));
    if (a < 0.5) { setState(() => err = r'Enter an amount of at least $0.50.'); return; }
    final mm = merchants[m]!;
    final cardId = widget.cardId;
    final card = getCard(cardId);
    if (card == null) return;
    final tag = cardTag(card);
    final t = addCardTx(cardId, kind: 'purchase', direction: 'out', merchant: m, title: mm.name, note: 'Authorizing…', amount: a, status: 'pending');
    Navigator.of(context).pop();
    widget.onSent();
    Timer(const Duration(milliseconds: 1600), () {
      final fresh = getCard(cardId);
      if (fresh == null) return;
      final spent = monthSpent(fresh);
      final reason = fresh.status == 'frozen' ? 'card frozen' : a > fresh.balance ? 'insufficient funds' : spent + a > fresh.limit ? 'monthly limit exceeded' : null;
      if (reason != null) {
        patchCardTx(cardId, t.id, status: 'declined', note: 'Declined · $reason');
        toast('**${mm.short}** ${f.usd(a)} declined — $reason', type: ToastType.error);
        store.notify(icon: 'bi-x-octagon', tone: 'danger', title: 'Card payment declined', body: '${mm.short} ${f.usd(a)} · $reason');
      } else {
        updateCard(cardId, (x) => x.balance = r2(x.balance - a));
        patchCardTx(cardId, t.id, status: 'success', note: '${mm.cat} · online');
        toast('**${mm.short}** charged ${f.usd(a)}');
        store.notify(icon: 'bi-credit-card-2-front', tone: 'primary', title: 'Card payment', body: '${mm.short} charged ${f.usd(a)} on $tag');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final card = getCard(widget.cardId);
    if (card == null) return const AppSheet(child: SizedBox(height: 40));
    return AppSheet(
      title: 'Simulate online payment',
      subtitle: 'Pretend a merchant charges card ${cardTag(card)} (balance ${f.usd(card.balance)}).',
      footer: Btn('Send charge', icon: 'bi-send', size: BtnSize.lg, full: true, onPressed: _send),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SelectField<String>(
          label: 'Merchant', value: m, searchable: true, onChanged: (x) => setState(() => m = x),
          options: [for (final k in keys) SelectOption(k, merchants[k]!.name, sub: merchants[k]!.cat, icon: merchants[k]!.icon)],
        ),
        const SizedBox(height: 12),
        AppTextField(label: 'Amount (USD)', prefix: r'$', keyboardType: const TextInputType.numberWithOptions(decimal: true), value: v, inputFormatters: [_amtFormatter], error: err, onChanged: (t) => setState(() { v = t; err = null; })),
        const SizedBox(height: 10),
        const AppText('Declines if the card is frozen, the balance is too low or the monthly limit is exceeded.', v: TV.xs, muted: true),
      ]),
    );
  }
}
