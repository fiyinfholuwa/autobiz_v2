import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../store/app_store.dart';
import '../ui/ui.dart';

class _Slide {
  final String title, text, hero;
  final List<Color> colors;
  final List<(String, String, String)> features;
  const _Slide(this.title, this.text, this.colors, this.features, this.hero);
}

const _slides = [
  _Slide(
    'Shop, travel & pay\nfrom one wallet',
    'Marketplace, travel eSIMs, flights, USD cards, gift cards, airtime, data and bills — all in Naira.',
    [Color(0xFF3FB5A8), Color(0xFF1C6B63)],
    [('bi-shop', 'Marketplace', 'Shop verified sellers with buyer protection'), ('bi-sim', 'Travel eSIM', 'Data in 120+ countries, installed by QR')],
    'bi-wallet2',
  ),
  _Slide(
    'Go global without\na dollar card',
    'Pay Netflix, AWS & Amazon with USD virtual cards and book flights in Naira with instant e-tickets.',
    [Color(0xFF7048E8), Color(0xFF3B1FA6)],
    [('bi-credit-card-2-front', 'USD virtual cards', 'Pay Netflix, AWS, Amazon & more'), ('bi-airplane', 'Flights in Naira', '200+ airlines, instant e-tickets')],
    'bi-globe2',
  ),
  _Slide(
    'Fast, rewarding\n& bank-grade secure',
    'Sell gift cards at top rates, earn cashback on top-ups and approve every payment with your PIN.',
    [Color(0xFFE64980), Color(0xFFA61E4D)],
    [('bi-gift', 'Gift card exchange', 'Top rates, paid in minutes'), ('bi-shield-check', 'Bank-grade security', 'PIN-protected, 256-bit encrypted')],
    'bi-lightning-charge-fill',
  ),
];

/// Route: /onboarding
class OnboardingScreen extends StatefulWidget {
  /// query parameters
  final Map<String, String> q;
  const OnboardingScreen({super.key, this.q = const {}});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _page = PageController();
  int i = 0;

  @override
  void dispose() { _page.dispose(); super.dispose(); }

  void _done(String to) {
    store.completeOnboarding();
    context.go('/');
    if (to != '/') Future.delayed(const Duration(milliseconds: 50), () => rootContext.push(to));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final mq = MediaQuery.of(context);
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: c.dark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Scaffold(
        backgroundColor: c.bg,
        body: Column(children: [
          // fixed top bar
          Padding(
            padding: EdgeInsets.fromLTRB(20, mq.padding.top + 8, 20, 0),
            child: SizedBox(
              height: 44,
              child: Row(children: [
                const Logo(size: 34),
                const Spacer(),
                GestureDetector(onTap: () => _done('/'), child: AppText('Skip', v: TV.sm, weight: FontWeight.w700, color: c.muted)),
              ]),
            ),
          ),
          Expanded(
            child: PageView.builder(
              controller: _page,
              itemCount: _slides.length,
              onPageChanged: (k) => setState(() => i = k),
              itemBuilder: (_, k) => _SlideView(_slides[k]),
            ),
          ),
          Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, mq.padding.bottom + 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                for (var k = 0; k < _slides.length; k++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    width: k == i ? 26 : 8, height: 8,
                    decoration: BoxDecoration(color: k == i ? c.primary : c.border, borderRadius: BorderRadius.circular(4)),
                  ),
              ]),
              const SizedBox(height: 18),
              i < _slides.length - 1
                  ? Btn('Next', size: BtnSize.lg, full: true, iconRight: 'bi-arrow-right', onPressed: () => _page.nextPage(duration: const Duration(milliseconds: 320), curve: Curves.easeOutCubic))
                  : Btn('Create account', size: BtnSize.lg, full: true, onPressed: () => _done('/register')),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: Btn('Log in', variant: BtnVariant.soft, size: BtnSize.lg, onPressed: () => _done('/login'))),
                const SizedBox(width: 10),
                Expanded(child: Btn('Explore as guest', variant: BtnVariant.outline, size: BtnSize.lg, onPressed: () => _done('/'))),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _SlideView extends StatelessWidget {
  final _Slide s;
  const _SlideView(this.s);
  @override
  Widget build(BuildContext context) {
    final white = Colors.white;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
          height: 300,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(32), gradient: LinearGradient(colors: s.colors, begin: Alignment.topLeft, end: Alignment.bottomRight)),
          child: Stack(children: [
            Positioned(right: -40, top: -40, child: Container(width: 200, height: 200, decoration: BoxDecoration(shape: BoxShape.circle, color: white.withValues(alpha: 0.08)))),
            Positioned(left: -60, bottom: -70, child: Container(width: 220, height: 220, decoration: BoxDecoration(shape: BoxShape.circle, color: white.withValues(alpha: 0.06)))),
            Padding(
              padding: const EdgeInsets.all(22),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Container(
                  width: 76, height: 76,
                  decoration: BoxDecoration(color: white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(24)),
                  child: Center(child: AppIcon(s.hero, size: 38, color: white)),
                ),
                Column(children: [
                  for (final (icon, t, d) in s.features)
                    Container(
                      margin: const EdgeInsets.only(top: 10),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: white.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(18)),
                      child: Row(children: [
                        Container(width: 38, height: 38, decoration: BoxDecoration(color: white.withValues(alpha: 0.22), borderRadius: BorderRadius.circular(12)), child: Center(child: AppIcon(icon, size: 19, color: white))),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          AppText(t, weight: FontWeight.w700, color: white),
                          AppText(d, v: TV.xs, color: white.withValues(alpha: 0.85)),
                        ])),
                      ]),
                    ),
                ]),
              ]),
            ),
          ]),
        ),
        const SizedBox(height: 28),
        AppText(s.title, v: TV.display),
        const SizedBox(height: 10),
        AppText(s.text, muted: true),
      ]),
    );
  }
}
