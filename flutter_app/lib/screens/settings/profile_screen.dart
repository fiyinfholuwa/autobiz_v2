import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/format.dart' as f;
import '../../core/random.dart';
import '../../core/validators.dart';
import '../../store/app_store.dart';
import '../../ui/ui.dart';

/// Route: /settings/profile
class ProfileScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const ProfileScreen({super.key, this.q = const {}});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late Map<String, String> v = _load();
  Map<String, String?> e = {};
  bool busy = false;

  Map<String, String> _load() {
    final u = store.user;
    return {'firstName': u.firstName, 'lastName': u.lastName, 'email': u.email, 'phone': u.phone, 'username': u.username};
  }

  bool get dirty {
    final l = _load();
    return l.keys.any((k) => l[k] != v[k]);
  }

  void _set(String k, String x) => setState(() { v[k] = x; e[k] = null; });

  Future<void> _save() async {
    final er = <String, String?>{};
    final username = v['username']!.replaceFirst(RegExp(r'^@'), '').toLowerCase().trim();
    if (v['firstName']!.trim().length < 2) er['firstName'] = 'Enter your first name';
    if (v['lastName']!.trim().length < 2) er['lastName'] = 'Enter your last name';
    if (!isEmail(v['email']!)) er['email'] = 'Enter a valid email address';
    if (!RegExp(r'^0[789][01]\d{8}$').hasMatch(v['phone']!)) er['phone'] = 'Enter a valid 11-digit phone number';
    if (!RegExp(r'^[a-z0-9_.]{3,20}$').hasMatch(username)) er['username'] = '3–20 letters, numbers, _ or .';
    setState(() => e = er);
    if (er.values.any((x) => x != null)) return;
    setState(() => busy = true);
    await sleep(700);
    store.mutate(() {
      final u = store.user;
      u.firstName = v['firstName']!.trim();
      u.lastName = v['lastName']!.trim();
      u.email = v['email']!.trim();
      u.phone = v['phone']!;
      u.username = username;
    });
    if (!mounted) return;
    setState(() { v['username'] = username; busy = false; });
    toast('Profile updated');
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppStore>().user;
    return AppScreen(
      header: const AppHeader(title: 'Profile', subtitle: 'Your personal details'),
      footer: Row(children: [
        Expanded(child: Btn('Cancel', variant: BtnVariant.outline, disabled: !dirty || busy, onPressed: () => setState(() { v = _load(); e = {}; }))),
        const SizedBox(width: 10),
        Expanded(flex: 2, child: Btn('Save changes', loading: busy, loadingText: 'Saving…', onPressed: _save)),
      ]),
      children: [
        CardBox(
          child: Column(children: [
            Avatar(f.initials(user.firstName, user.lastName), size: 76),
            const SizedBox(height: 10),
            AppText('${user.firstName} ${user.lastName}', v: TV.h2, center: true),
            AppText('@${user.username.isEmpty ? 'user' : user.username} · ${user.email}', v: TV.sm, muted: true, center: true),
            const SizedBox(height: 8),
            Pill(user.tier),
          ]),
        ),
        const SizedBox(height: 16),
        CardBox(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: AppTextField(label: 'First name', maxLength: 40, textCapitalization: TextCapitalization.words, value: v['firstName'], error: e['firstName'], onChanged: (t) => _set('firstName', t))),
              const SizedBox(width: 10),
              Expanded(child: AppTextField(label: 'Last name', maxLength: 40, textCapitalization: TextCapitalization.words, value: v['lastName'], error: e['lastName'], onChanged: (t) => _set('lastName', t))),
            ]),
            const SizedBox(height: 14),
            AppTextField(label: 'Email', icon: 'bi-envelope', keyboardType: TextInputType.emailAddress, autocorrect: false, value: v['email'], error: e['email'], onChanged: (t) => _set('email', t)),
            const SizedBox(height: 14),
            AppTextField(label: 'Phone', icon: 'bi-phone', keyboardType: TextInputType.number, maxLength: 11, inputFormatters: [AppTextField.digits], value: v['phone'], error: e['phone'], onChanged: (t) => _set('phone', t)),
            const SizedBox(height: 14),
            AppTextField(
              label: 'Username', prefix: '@', autocorrect: false, maxLength: 20, value: v['username'], error: e['username'],
              hint: 'Friends can send you money with your username',
              onChanged: (t) => _set('username', t.replaceFirst(RegExp(r'^@'), '')),
            ),
          ]),
        ),
      ],
    );
  }
}
