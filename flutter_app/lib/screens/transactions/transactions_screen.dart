import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../store/app_store.dart';
import '../../ui/ui.dart';

const _page = 15;

/// Route: /transactions (q: type) — ported from mobile_app/src/app/transactions/index.tsx
class TransactionsScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const TransactionsScreen({super.key, this.q = const {}});
  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  String q = '', dq = '';
  late String type = widget.q['type'] ?? 'all';
  /// all | 1 | 7 | 30 | 90 | custom
  String range = 'all';
  String from = '', to = '';
  String dir = 'all';
  String status = 'all';
  int shown = _page;
  Timer? _debounce;
  bool _wasInvalid = false;

  @override
  void didUpdateWidget(TransactionsScreen old) {
    super.didUpdateWidget(old);
    final t = widget.q['type'];
    if (t != null && t != old.q['type']) setState(() { type = t; shown = _page; });
  }

  @override
  void dispose() { _debounce?.cancel(); super.dispose(); }

  void _set(VoidCallback fn) => setState(() { fn(); shown = _page; });

  bool get _rangeInvalid => range == 'custom' && from.isNotEmpty && to.isNotEmpty && f.parseDay(from) > f.parseDay(to);

  void _checkRange() {
    final inv = _rangeInvalid;
    if (inv && !_wasInvalid) toast('End date must be after start date', type: ToastType.warning);
    _wasInvalid = inv;
  }

  void _clear() => _set(() {
        q = ''; dq = ''; type = 'all'; range = 'all'; from = ''; to = ''; dir = 'all'; status = 'all';
        _wasInvalid = false;
      });

  List<Tx> _filter(List<Tx> all) {
    final s = dq.trim().toLowerCase();
    var lo = -1 << 62, hi = 1 << 62;
    if (range != 'all' && range != 'custom') lo = f.startOfDay(f.addDays(f.now(), -(int.parse(range) - 1)));
    if (range == 'custom' && !_rangeInvalid) {
      if (from.isNotEmpty) lo = f.parseDay(from);
      if (to.isNotEmpty) hi = f.parseDay(to) + 86399999;
    }
    final list = all.where((t) {
      if (type != 'all' && t.type != type) return false;
      if (dir != 'all' && t.direction != dir) return false;
      if (status != 'all' && t.status != status) return false;
      if (t.date < lo || t.date > hi) return false;
      if (s.isNotEmpty) {
        final hay = [t.title, t.subtitle ?? '', t.ref ?? t.id, t.type, ...t.meta.values].join(' ').toLowerCase();
        if (!hay.contains(s)) return false;
      }
      return true;
    }).toList()
      ..sort((a, b) => b.date.compareTo(a.date));
    return list;
  }

  Future<void> _exportCsv(List<Tx> list) async {
    if (list.isEmpty) { toast('Nothing to export', type: ToastType.warning); return; }
    String cell(Object v) => '"${'$v'.replaceAll('"', '""')}"';
    final rows = [['Date', 'Time', 'Reference', 'Type', 'Title', 'Description', 'Direction', 'Amount (NGN)', 'Status'].map(cell).join(',')];
    for (final t in list) {
      rows.add([
        f.isoDay(t.date), f.time(t.date), t.ref ?? t.id, txTypeLabel(t.type), t.title, t.subtitle ?? '',
        t.direction == 'in' ? 'Credit' : 'Debit', (t.direction == 'in' ? t.amount : -t.amount).toStringAsFixed(2), t.status,
      ].map(cell).join(','));
    }
    await shareText('autobiz-transactions-${f.isoDay(f.now())}.csv', rows.join('\r\n'));
    toast('Exported ${list.length} transaction${list.length == 1 ? '' : 's'}');
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final all = context.watch<AppStore>().transactions;
    final list = _filter(all);
    final active = dq.isNotEmpty || type != 'all' || range != 'all' || dir != 'all' || status != 'all';
    final ok = list.where((t) => t.status == 'success');
    final moneyIn = ok.where((t) => t.direction == 'in').fold(0.0, (a, t) => a + t.amount);
    final moneyOut = ok.where((t) => t.direction == 'out').fold(0.0, (a, t) => a + t.amount);
    final net = moneyIn - moneyOut;
    final pending = list.where((t) => t.status == 'pending').length;
    final sfx = active ? ' (filtered)' : '';

    final types = {...all.map((t) => t.type), if (type != 'all') type}.toList()..sort();
    final typeOptions = [const SelectOption('all', 'All types'), for (final t in types) SelectOption(t, txTypeLabel(t))];

    final groups = <(String, List<Tx>)>[];
    for (final t in list.take(shown)) {
      final d = f.dayHeading(t.date);
      if (groups.isNotEmpty && groups.last.$1 == d) {
        groups.last.$2.add(t);
      } else {
        groups.add((d, [t]));
      }
    }

    return AppScreen(
      header: AppHeader(title: 'Transactions', subtitle: 'Every payment, purchase and transfer', actions: [IconBtn('bi-download', tooltip: 'Export CSV', onPressed: () => _exportCsv(list))]),
      padded: false,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Expanded(child: StatTile(label: 'Money in$sfx', value: f.naira(moneyIn), icon: 'bi-arrow-down-left', tone: 'success')),
              const SizedBox(width: 10),
              Expanded(child: StatTile(label: 'Money out$sfx', value: f.naira(moneyOut), icon: 'bi-arrow-up-right', tone: 'danger')),
            ]),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: StatTile(label: 'Net flow$sfx', value: '${net < 0 ? '−' : '+'}${f.naira(net.abs())}', icon: 'bi-activity', tone: 'primary')),
              const SizedBox(width: 10),
              Expanded(child: StatTile(label: 'Transactions$sfx', value: '${list.length} · $pending pending', icon: 'bi-receipt', tone: 'violet')),
            ]),
            const SizedBox(height: 16),
            AppTextField(
              icon: 'bi-search', placeholder: 'Search title, number, reference…', value: q, autocorrect: false,
              onChanged: (v) {
                q = v;
                _debounce?.cancel();
                _debounce = Timer(const Duration(milliseconds: 200), () { if (mounted) _set(() => dq = q); });
              },
            ),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: SelectField<String>(title: 'Transaction type', value: type, options: typeOptions, onChanged: (v) => _set(() => type = v))),
              const SizedBox(width: 10),
              Expanded(
                child: SelectField<String>(
                  title: 'Date range', value: range, onChanged: (v) => _set(() { range = v; _checkRange(); }),
                  options: const [
                    SelectOption('all', 'All time'), SelectOption('1', 'Today'), SelectOption('7', 'Last 7 days'),
                    SelectOption('30', 'Last 30 days'), SelectOption('90', 'Last 90 days'), SelectOption('custom', 'Custom range…'),
                  ],
                ),
              ),
            ]),
            if (range == 'custom') ...[
              const SizedBox(height: 10),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: DateField(label: 'From', value: from, max: f.isoDay(f.now()), onChanged: (v) => _set(() { from = v; _checkRange(); }))),
                const SizedBox(width: 10),
                Expanded(child: DateField(label: 'To', value: to, max: f.isoDay(f.now()), error: _rangeInvalid ? 'End date must be after start date' : null, onChanged: (v) => _set(() { to = v; _checkRange(); }))),
              ]),
            ],
            const SizedBox(height: 10),
            Segment<String>(small: true, value: dir, onChanged: (v) => _set(() => dir = v), options: const [SegOption('all', 'All'), SegOption('in', 'Money in'), SegOption('out', 'Money out')]),
          ]),
        ),
        const SizedBox(height: 12),
        HScroll(children: [
          for (final (v, l) in const [('all', 'All statuses'), ('success', 'Successful'), ('pending', 'Pending'), ('failed', 'Failed')])
            AppChip(l, active: status == v, onTap: () => _set(() => status = v)),
          if (active) AppChip('Clear filters', icon: 'bi-x-lg', onTap: _clear),
        ]),
        const SizedBox(height: 12),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: list.isEmpty
              ? CardBox(
                  child: active
                      ? EmptyState(icon: 'bi-search', title: 'No matching transactions', message: 'Try a different search or clear your filters.', action: 'Clear filters', onAction: _clear)
                      : EmptyState(icon: 'bi-receipt', title: 'No transactions yet', message: 'Your payments and purchases will appear here.', action: 'Make a payment', onAction: () => context.go('/pay')),
                )
              : Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  for (final g in groups)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Padding(padding: const EdgeInsets.only(left: 4, bottom: 6), child: AppText(g.$1, v: TV.label, muted: true)),
                        CardBox(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Column(children: [
                            for (var i = 0; i < g.$2.length; i++)
                              Container(
                                decoration: BoxDecoration(border: i > 0 ? Border(top: BorderSide(color: c.border)) : null),
                                child: TxRow(g.$2[i]),
                              ),
                          ]),
                        ),
                      ]),
                    ),
                  if (shown < list.length)
                    Btn('Load more (${list.length - shown} more)', variant: BtnVariant.soft, full: true, onPressed: () => setState(() => shown += _page))
                  else
                    AppText('Showing all ${list.length} transaction${list.length == 1 ? '' : 's'}', v: TV.xs, muted: true, center: true),
                ]),
        ),
      ],
    );
  }
}
