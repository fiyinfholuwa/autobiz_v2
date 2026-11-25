import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/format.dart' as f;
import '../core/theme.dart';
import '../store/models.dart';
import 'text.dart';
import 'widgets.dart';

/// Transaction row (web AB.txRow). Tapping opens /transactions/:id.
class TxRow extends StatelessWidget {
  final Tx t;
  final VoidCallback? onTap;
  final bool showStatus;
  const TxRow(this.t, {super.key, this.onTap, this.showStatus = true});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return ListRow(
      leading: IconTile(t.icon, tone: t.tone, size: 42),
      title: t.title,
      subtitle: '${t.subtitle != null && t.subtitle!.isNotEmpty ? '${t.subtitle} · ' : ''}${f.ago(t.date)}',
      onTap: onTap ?? () => context.push('/transactions/${Uri.encodeComponent(t.id)}'),
      trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [
        AppText('${t.direction == 'in' ? '+' : '−'}${f.naira(t.amount)}', weight: FontWeight.w700, tabular: true, color: t.direction == 'in' ? c.success : c.text),
        if (showStatus) ...[const SizedBox(height: 4), StatusPill(t.status)],
      ]),
    );
  }
}
