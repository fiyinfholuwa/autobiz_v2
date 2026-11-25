import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

/// Root navigator (used by sheets, dialogs and overlays that must sit above the tab shell).
final rootNavigatorKey = GlobalKey<NavigatorState>();

BuildContext get rootContext => rootNavigatorKey.currentContext!;

/// Pop if possible, else go to [fallback] (deep-linked screens have nothing to pop to).
void goBack(BuildContext context, [String fallback = '/']) {
  if (context.canPop()) {
    context.pop();
  } else {
    context.go(fallback);
  }
}

/// Build a location with query params, skipping null/empty values: loc('/pay', {'tab': 'data'})
String loc(String path, [Map<String, Object?> q = const {}]) {
  final params = <String, String>{};
  q.forEach((k, v) { if (v != null && '$v'.isNotEmpty) params[k] = '$v'; });
  return Uri(path: path, queryParameters: params.isEmpty ? null : params).toString();
}
