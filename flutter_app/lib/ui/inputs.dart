/// Form controls — Flutter equivalents of mobile_app/src/components/ui/Input.tsx.
/// AppTextField works controlled (value + onChanged, React-style) or with a controller.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/format.dart' as f;
import '../core/theme.dart';
import 'app_icon.dart';
import 'sheet.dart';
import 'text.dart';
import 'widgets.dart';

class FieldLabel extends StatelessWidget {
  final String label;
  final Widget? right;
  const FieldLabel(this.label, {super.key, this.right});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(children: [Expanded(child: AppText(label, v: TV.sm, weight: FontWeight.w600)), if (right != null) right!]),
      );
}

class FieldError extends StatelessWidget {
  final String? error, hint;
  const FieldError({super.key, this.error, this.hint});
  @override
  Widget build(BuildContext context) {
    if (error != null && error!.isNotEmpty) return Padding(padding: const EdgeInsets.only(top: 5), child: AppText(error!, v: TV.xs, color: context.c.danger));
    if (hint != null) return Padding(padding: const EdgeInsets.only(top: 5), child: AppText(hint!, v: TV.xs, muted: true));
    return const SizedBox.shrink();
  }
}

/* ---------------- Text field ---------------- */
class AppTextField extends StatefulWidget {
  final String? label, error, hint, placeholder, icon, value;
  final Widget? labelRight, suffix;
  /// String or Widget
  final Object? prefix;
  final TextEditingController? controller;
  final ValueChanged<String>? onChanged, onSubmitted;
  final VoidCallback? onFocus, onBlur;
  final TextInputType? keyboardType;
  final int? maxLength;
  final bool big, password, multiline, enabled, autofocus, success, autocorrect;
  final TextCapitalization textCapitalization;
  final List<TextInputFormatter>? inputFormatters;
  final TextInputAction? textInputAction;
  final FocusNode? focusNode;
  final TextStyle? style;
  final Iterable<String>? autofillHints;
  const AppTextField({super.key, this.label, this.labelRight, this.error, this.hint, this.placeholder, this.prefix, this.suffix, this.icon, this.value, this.controller, this.onChanged, this.onSubmitted, this.onFocus, this.onBlur, this.keyboardType, this.maxLength, this.big = false, this.password = false, this.multiline = false, this.enabled = true, this.autofocus = false, this.success = false, this.autocorrect = true, this.textCapitalization = TextCapitalization.none, this.inputFormatters, this.textInputAction, this.focusNode, this.style, this.autofillHints});

  /// digits only formatter
  static final digits = FilteringTextInputFormatter.digitsOnly;
  /// decimal number formatter
  static final decimal = FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'));

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  late final TextEditingController _ctl = widget.controller ?? TextEditingController(text: widget.value ?? '');
  late final FocusNode _focus = widget.focusNode ?? FocusNode();
  bool _show = false;

  @override
  void initState() {
    super.initState();
    _focus.addListener(() {
      setState(() {});
      if (_focus.hasFocus) { widget.onFocus?.call(); } else { widget.onBlur?.call(); }
    });
  }

  @override
  void didUpdateWidget(AppTextField old) {
    super.didUpdateWidget(old);
    if (widget.controller == null && widget.value != null && widget.value != _ctl.text) {
      _ctl.value = TextEditingValue(text: widget.value!, selection: TextSelection.collapsed(offset: widget.value!.length));
    }
  }

  @override
  void dispose() {
    if (widget.controller == null) _ctl.dispose();
    if (widget.focusNode == null) _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final w = widget;
    final focus = _focus.hasFocus;
    final hasErr = w.error != null && w.error!.isNotEmpty;
    final border = hasErr ? c.danger : w.success ? c.success : focus ? c.primary : c.border;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      if (w.label != null) FieldLabel(w.label!, right: w.labelRight),
      AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        constraints: BoxConstraints(minHeight: w.big ? 58 : 50),
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: w.enabled ? c.surface : c.surface2,
          borderRadius: BorderRadius.circular(R.md + 2),
          border: Border.all(color: border, width: 1.5),
          boxShadow: focus && !hasErr ? [BoxShadow(color: c.primary.withValues(alpha: 0.12), blurRadius: 0, spreadRadius: 3)] : null,
        ),
        child: Row(crossAxisAlignment: w.multiline ? CrossAxisAlignment.start : CrossAxisAlignment.center, children: [
          if (w.icon != null) ...[AppIcon(w.icon!, size: 18, color: c.muted), const SizedBox(width: 8)],
          if (w.prefix is String) ...[AppText(w.prefix as String, weight: FontWeight.w600, muted: true, size: w.big ? 18 : 15), const SizedBox(width: 6)] else if (w.prefix is Widget) ...[w.prefix as Widget, const SizedBox(width: 8)],
          Expanded(
            child: TextField(
              controller: _ctl,
              focusNode: _focus,
              enabled: w.enabled,
              autofocus: w.autofocus,
              autocorrect: w.autocorrect,
              obscureText: w.password && !_show,
              keyboardType: w.multiline ? TextInputType.multiline : w.keyboardType,
              textCapitalization: w.textCapitalization,
              textInputAction: w.textInputAction,
              maxLength: w.maxLength,
              maxLines: w.multiline ? 5 : 1,
              minLines: w.multiline ? 3 : 1,
              inputFormatters: w.inputFormatters,
              autofillHints: w.autofillHints,
              onChanged: w.onChanged,
              onSubmitted: w.onSubmitted,
              scrollPadding: const EdgeInsets.only(bottom: 120),
              style: w.style ?? tvStyle(context, TV.body, weight: w.big ? FontWeight.w700 : FontWeight.w500, size: w.big ? 20 : 15),
              decoration: InputDecoration(
                isDense: true,
                counterText: '',
                border: InputBorder.none,
                hintText: w.placeholder,
                hintStyle: tvStyle(context, TV.body, muted: true, size: w.big ? 20 : 15),
                contentPadding: EdgeInsets.symmetric(vertical: w.multiline ? 12 : 14),
              ),
            ),
          ),
          if (w.password)
            GestureDetector(onTap: () => setState(() => _show = !_show), child: Padding(padding: const EdgeInsets.only(left: 8), child: AppIcon(_show ? 'bi-eye-slash' : 'bi-eye', size: 19, color: c.muted))),
          if (w.suffix != null) ...[const SizedBox(width: 8), w.suffix!],
        ]),
      ),
      FieldError(error: w.error, hint: w.hint),
    ]);
  }
}

/* ---------------- Select (opens a sheet) ---------------- */
class SelectOption<T> {
  final T value;
  final String label;
  final String? sub, icon;
  final Widget? leading;
  final bool disabled;
  const SelectOption(this.value, this.label, {this.sub, this.icon, this.leading, this.disabled = false});
}

class SelectField<T> extends StatelessWidget {
  final String? label, error, hint, title;
  final T? value;
  final List<SelectOption<T>> options;
  final ValueChanged<T> onChanged;
  final String placeholder;
  final bool searchable;
  const SelectField({super.key, this.label, required this.value, required this.options, required this.onChanged, this.placeholder = 'Select', this.error, this.hint, this.title, this.searchable = false});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    SelectOption<T>? cur;
    for (final o in options) { if (o.value == value) cur = o; }
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      if (label != null) FieldLabel(label!),
      Material(
        color: c.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.md + 2), side: BorderSide(color: error != null ? c.danger : c.border, width: 1.5)),
        child: InkWell(
          borderRadius: BorderRadius.circular(R.md + 2),
          onTap: () async {
            tapHaptic();
            final v = await showSheet<_Picked<T>>(_SelectSheet<T>(title: title ?? label ?? placeholder, options: options, value: value, searchable: searchable));
            if (v != null) onChanged(v.value);
          },
          child: Container(
            constraints: const BoxConstraints(minHeight: 50),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(children: [
              if (cur?.leading != null) ...[cur!.leading!, const SizedBox(width: 10)] else if (cur?.icon != null) ...[AppIcon(cur!.icon!, size: 18, color: c.muted), const SizedBox(width: 10)],
              Expanded(child: cur != null ? AppText(cur.label, weight: FontWeight.w500, maxLines: 1) : AppText(placeholder, muted: true)),
              AppIcon('bi-chevron-down', size: 16, color: c.muted),
            ]),
          ),
        ),
      ),
      FieldError(error: error, hint: hint),
    ]);
  }
}

class _Picked<T> { final T value; const _Picked(this.value); }

class _SelectSheet<T> extends StatefulWidget {
  final String title;
  final List<SelectOption<T>> options;
  final T? value;
  final bool searchable;
  const _SelectSheet({required this.title, required this.options, required this.value, required this.searchable});
  @override
  State<_SelectSheet<T>> createState() => _SelectSheetState<T>();
}

class _SelectSheetState<T> extends State<_SelectSheet<T>> {
  String q = '';
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final list = q.isEmpty ? widget.options : widget.options.where((o) => '${o.label} ${o.sub ?? ''}'.toLowerCase().contains(q.toLowerCase())).toList();
    return AppSheet(
      title: widget.title,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        if (widget.searchable) Padding(padding: const EdgeInsets.only(bottom: 8), child: AppTextField(icon: 'bi-search', placeholder: 'Search…', value: q, onChanged: (v) => setState(() => q = v), autocorrect: false)),
        for (final o in list)
          Opacity(
            opacity: o.disabled ? 0.4 : 1,
            child: Material(
              color: o.value == widget.value ? c.primarySoft : Colors.transparent,
              borderRadius: BorderRadius.circular(R.md),
              child: InkWell(
                borderRadius: BorderRadius.circular(R.md),
                onTap: o.disabled ? null : () { tapHaptic(); Navigator.of(context).pop(_Picked<T>(o.value)); },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 10),
                  child: Row(children: [
                    if (o.leading != null) ...[o.leading!, const SizedBox(width: 12)] else if (o.icon != null) ...[AppIcon(o.icon!, size: 18, color: c.muted), const SizedBox(width: 12)],
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      AppText(o.label, weight: o.value == widget.value ? FontWeight.w700 : FontWeight.w500, color: o.value == widget.value ? c.primary : null),
                      if (o.sub != null) AppText(o.sub!, v: TV.xs, muted: true),
                    ])),
                    if (o.value == widget.value) AppIcon('bi-check-lg', size: 18, color: c.primary),
                  ]),
                ),
              ),
            ),
          ),
        if (list.isEmpty) const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: AppText('No matches', muted: true, center: true)),
      ]),
    );
  }
}

/* ---------------- Checkbox ---------------- */
class AppCheckbox extends StatelessWidget {
  final bool checked;
  final ValueChanged<bool> onChanged;
  final String? label, error;
  final Widget? child;
  const AppCheckbox({super.key, required this.checked, required this.onChanged, this.label, this.error, this.child});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
      InkWell(
        onTap: () { tapHaptic(); onChanged(!checked); },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 140),
              width: 22, height: 22, margin: const EdgeInsets.only(top: 1),
              decoration: BoxDecoration(color: checked ? c.primary : c.surface, borderRadius: BorderRadius.circular(7), border: Border.all(color: error != null ? c.danger : checked ? c.primary : c.border, width: 1.5)),
              child: checked ? const Center(child: AppIcon('bi-check-lg', size: 15, color: Colors.white)) : null,
            ),
            const SizedBox(width: 10),
            Expanded(child: child ?? AppText(label ?? '', v: TV.sm)),
          ]),
        ),
      ),
      FieldError(error: error),
    ]);
  }
}

/* ---------------- Date field (value "YYYY-MM-DD") ---------------- */
class DateField extends StatelessWidget {
  final String? label, error, min, max;
  final String value;
  final ValueChanged<String> onChanged;
  final String placeholder;
  const DateField({super.key, this.label, required this.value, required this.onChanged, this.min, this.max, this.error, this.placeholder = 'Select date'});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
      if (label != null) FieldLabel(label!),
      Material(
        color: c.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(R.md + 2), side: BorderSide(color: error != null ? c.danger : c.border, width: 1.5)),
        child: InkWell(
          borderRadius: BorderRadius.circular(R.md + 2),
          onTap: () async {
            final first = min != null ? DateTime.fromMillisecondsSinceEpoch(f.parseDay(min!)) : DateTime(1900);
            final last = max != null ? DateTime.fromMillisecondsSinceEpoch(f.parseDay(max!)) : DateTime(2100);
            var init = value.isNotEmpty ? DateTime.fromMillisecondsSinceEpoch(f.parseDay(value)) : (max != null ? last : DateTime.now());
            if (init.isBefore(first)) init = first;
            if (init.isAfter(last)) init = last;
            final d = await showDatePicker(
              context: context, initialDate: init, firstDate: first, lastDate: last,
              builder: (ctx, child) => Theme(data: Theme.of(ctx).copyWith(colorScheme: Theme.of(ctx).colorScheme.copyWith(primary: c.primary, onPrimary: Colors.white)), child: child!),
            );
            if (d != null) onChanged(f.isoDay(d.millisecondsSinceEpoch));
          },
          child: Container(
            constraints: const BoxConstraints(minHeight: 50),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(children: [
              AppIcon('bi-calendar3', size: 18, color: c.muted),
              const SizedBox(width: 10),
              Expanded(child: AppText(value.isNotEmpty ? f.longDay(f.parseDay(value)) : placeholder, weight: FontWeight.w500, muted: value.isEmpty)),
            ]),
          ),
        ),
      ),
      FieldError(error: error),
    ]);
  }
}

/* ---------------- Code boxes (OTP / PIN) ---------------- */
/// Use a GlobalKey<CodeInputState> to call `.shake()` / `.focus()`.
class CodeInput extends StatefulWidget {
  final int length;
  final String value;
  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onComplete;
  final bool secret, autofocus, error;
  const CodeInput({super.key, this.length = 6, required this.value, required this.onChanged, this.onComplete, this.secret = false, this.autofocus = true, this.error = false});
  @override
  State<CodeInput> createState() => CodeInputState();
}

class CodeInputState extends State<CodeInput> with SingleTickerProviderStateMixin {
  late final TextEditingController _ctl = TextEditingController(text: widget.value);
  final _focus = FocusNode();
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 300));

  void shake() { HapticFeedback.heavyImpact(); _shake.forward(from: 0); }
  void focus() => _focus.requestFocus();

  @override
  void initState() {
    super.initState();
    _focus.addListener(() => setState(() {}));
    if (widget.autofocus) Future.delayed(const Duration(milliseconds: 250), () { if (mounted) _focus.requestFocus(); });
  }

  @override
  void didUpdateWidget(CodeInput old) {
    super.didUpdateWidget(old);
    if (widget.value != _ctl.text) _ctl.value = TextEditingValue(text: widget.value, selection: TextSelection.collapsed(offset: widget.value.length));
  }

  @override
  void dispose() { _ctl.dispose(); _focus.dispose(); _shake.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final n = widget.length;
    final big = n <= 4;
    return GestureDetector(
      onTap: () => _focus.requestFocus(),
      child: Stack(alignment: Alignment.center, children: [
        AnimatedBuilder(
          animation: _shake,
          builder: (_, child) {
            final t = _shake.value;
            final dx = t == 0 ? 0.0 : 10 * (1 - t) * ((t * 10).floor().isEven ? 1 : -1);
            return Transform.translate(offset: Offset(dx, 0), child: child);
          },
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < n; i++) ...[
              if (i > 0) SizedBox(width: big ? 14 : 8),
              Builder(builder: (context) {
                final ch = i < widget.value.length ? widget.value[i] : null;
                final active = _focus.hasFocus && i == (widget.value.length < n ? widget.value.length : n - 1);
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  width: big ? 58 : 46, height: big ? 62 : 54,
                  decoration: BoxDecoration(
                    color: ch != null ? c.primarySoft : c.surface,
                    borderRadius: BorderRadius.circular(R.lg),
                    border: Border.all(color: widget.error ? c.danger : active ? c.primary : ch != null ? c.primary300 : c.border, width: 1.5),
                  ),
                  child: Center(child: ch == null ? null : widget.secret ? Container(width: 13, height: 13, decoration: BoxDecoration(color: c.text, shape: BoxShape.circle)) : AppText(ch, v: TV.h2)),
                );
              }),
            ],
          ]),
        ),
        // Invisible field that receives input (supports paste & SMS autofill)
        Positioned.fill(
          child: Opacity(
            opacity: 0,
            child: TextField(
              controller: _ctl,
              focusNode: _focus,
              keyboardType: TextInputType.number,
              autofillHints: const [AutofillHints.oneTimeCode],
              maxLength: n,
              showCursor: false,
              enableInteractiveSelection: false,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(counterText: '', border: InputBorder.none),
              onChanged: (t) {
                widget.onChanged(t);
                if (t.length == n) widget.onComplete?.call(t);
              },
            ),
          ),
        ),
      ]),
    );
  }
}

/* ---------------- Keypad + PIN dots ---------------- */
class Keypad extends StatelessWidget {
  final ValueChanged<String> onKey;
  final VoidCallback onDelete;
  final bool disabled;
  const Keypad({super.key, required this.onKey, required this.onDelete, this.disabled = false});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    return Opacity(
      opacity: disabled ? 0.4 : 1,
      child: GridView.count(
        crossAxisCount: 3, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), childAspectRatio: 2.1, mainAxisSpacing: 6, crossAxisSpacing: 10,
        children: [
          for (final k in keys)
            k.isEmpty
                ? const SizedBox.shrink()
                : Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(R.lg),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(R.lg),
                      onTap: disabled ? null : () { HapticFeedback.lightImpact(); k == 'del' ? onDelete() : onKey(k); },
                      child: Center(child: k == 'del' ? AppIcon('ion:backspace-outline', size: 24, color: c.text) : AppText(k, v: TV.h2)),
                    ),
                  ),
        ],
      ),
    );
  }
}

class PinDots extends StatelessWidget {
  final String value;
  final int length;
  final bool error;
  const PinDots({super.key, required this.value, this.length = 4, this.error = false});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      for (var i = 0; i < length; i++) ...[
        if (i > 0) const SizedBox(width: 18),
        AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          width: 16, height: 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: error ? c.danger : i < value.length ? c.primary : c.border, width: 2),
            color: i < value.length ? (error ? c.danger : c.primary) : Colors.transparent,
          ),
        ),
      ],
    ]);
  }
}
