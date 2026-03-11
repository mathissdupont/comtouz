import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'app_controller.dart';
import 'models.dart';

const _contexts = ['business', 'social', 'academic'];
const _ratingStars = [1, 2, 3, 4, 5];

class ComtouzApp extends StatelessWidget {
  const ComtouzApp({super.key});

  @override
  Widget build(BuildContext context) {
    final scheme = ColorScheme.fromSeed(
      seedColor: const Color(0xFF0F766E),
      brightness: Brightness.light,
    );

    return MaterialApp(
      title: 'Comtouz',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: scheme,
        scaffoldBackgroundColor: const Color(0xFFF3EDE0),
        useMaterial3: true,
        cardTheme: CardThemeData(
          elevation: 0,
          color: Colors.white.withValues(alpha: 0.9),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
            side: BorderSide(color: scheme.outlineVariant),
          ),
        ),
      ),
      home: const MobileShell(),
    );
  }
}

class MobileShell extends ConsumerStatefulWidget {
  const MobileShell({super.key});

  @override
  ConsumerState<MobileShell> createState() => _MobileShellState();
}

class _MobileShellState extends ConsumerState<MobileShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(appControllerProvider);
    final controller = ref.read(appControllerProvider.notifier);

    final pages = [
      _IdentityPage(controller: controller, state: state),
      _EncounterPage(controller: controller, state: state),
      _RatingsPage(controller: controller, state: state),
      _GovernancePage(controller: controller, state: state),
      _BusinessAndSignalsPage(controller: controller, state: state),
    ];

    return Scaffold(
      body: SafeArea(child: pages[_currentIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.verified_user_outlined), label: 'Identity'),
          NavigationDestination(icon: Icon(Icons.handshake_outlined), label: 'Encounter'),
          NavigationDestination(icon: Icon(Icons.star_border_rounded), label: 'Ratings'),
          NavigationDestination(icon: Icon(Icons.balance_outlined), label: 'Justice'),
          NavigationDestination(icon: Icon(Icons.business_outlined), label: 'Business'),
        ],
      ),
    );
  }
}

class _IdentityPage extends ConsumerStatefulWidget {
  const _IdentityPage({required this.controller, required this.state});

  final AppController controller;
  final AppState state;

  @override
  ConsumerState<_IdentityPage> createState() => _IdentityPageState();
}

class _IdentityPageState extends ConsumerState<_IdentityPage> {
  final _aliasController = TextEditingController(text: 'Arda Mobile');

  @override
  void dispose() {
    _aliasController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final user = widget.state.user;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _HeroCard(
          title: 'Comtouz Mobile',
          subtitle: 'Carry the proof-of-encounter, rating, jury, and founder workflow in one client.',
          trailing: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${widget.state.entitlements.length}',
                style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const Text('open entitlements'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (user == null)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Development access',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Use the local dev session bootstrap to drive the full backend workflow from mobile before wiring a live WorldPass issuer.',
                    style: theme.textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _aliasController,
                    decoration: const InputDecoration(
                      labelText: 'Alias',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: widget.state.isBusy
                        ? null
                        : () => widget.controller.loginDevelopment(_aliasController.text.trim()),
                    child: const Text('Create development session'),
                  ),
                ],
              ),
            ),
          )
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    user.displayName ?? 'Verified user',
                    style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(user.worldPassSubjectId),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      _MetricChip(label: 'Rep ${user.reputationScore.toStringAsFixed(1)}'),
                      _MetricChip(label: 'Weight ${user.effectiveWeight.toStringAsFixed(1)}'),
                      _MetricChip(label: user.countryCode ?? 'No country'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  OutlinedButton(
                    onPressed: widget.state.isBusy ? null : widget.controller.logout,
                    child: const Text('Sign out'),
                  ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Mobile activity feed',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                for (final item in widget.state.activity.take(10))
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.fiber_manual_record, size: 10, color: theme.colorScheme.primary),
                        const SizedBox(width: 10),
                        Expanded(child: Text(item)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
        if (widget.state.error != null) ...[
          const SizedBox(height: 16),
          Card(
            color: const Color(0xFFFFEEE7),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                widget.state.error!,
                style: theme.textTheme.bodyMedium?.copyWith(color: const Color(0xFF7F2F1E)),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _EncounterPage extends ConsumerStatefulWidget {
  const _EncounterPage({required this.controller, required this.state});

  final AppController controller;
  final AppState state;

  @override
  ConsumerState<_EncounterPage> createState() => _EncounterPageState();
}

class _EncounterPageState extends ConsumerState<_EncounterPage> {
  String _channel = 'qr';
  final List<String> _contextsSelected = ['business', 'social'];
  final _claimController = TextEditingController();
  final _contextNonceController = TextEditingController();
  final _negotiateNonceController = TextEditingController();
  String _context = 'business';
  String _negotiation = 'business';

  @override
  void dispose() {
    _claimController.dispose();
    _contextNonceController.dispose();
    _negotiateNonceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final offer = widget.state.activeOffer;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _SectionCard(
          title: 'Encounter issue',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _channel,
                items: const [
                  DropdownMenuItem(value: 'qr', child: Text('QR bootstrap')),
                  DropdownMenuItem(value: 'ble', child: Text('BLE proximity')),
                  DropdownMenuItem(value: 'nfc', child: Text('NFC tap')),
                ],
                onChanged: (value) => setState(() => _channel = value ?? 'qr'),
                decoration: const InputDecoration(labelText: 'Channel', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _contexts.map((context) {
                  final selected = _contextsSelected.contains(context);
                  return FilterChip(
                    selected: selected,
                    label: Text(context),
                    onSelected: (value) {
                      setState(() {
                        if (value) {
                          _contextsSelected.add(context);
                        } else {
                          _contextsSelected.remove(context);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: widget.state.user == null || widget.state.isBusy || _contextsSelected.isEmpty
                    ? null
                    : () => widget.controller.createOffer(_channel, _contextsSelected),
                child: const Text('Mint encounter offer'),
              ),
              if (offer != null) ...[
                const SizedBox(height: 20),
                Center(
                  child: QrImageView(
                    data: offer.nonce,
                    size: 220,
                    backgroundColor: Colors.white,
                  ),
                ),
                const SizedBox(height: 12),
                Center(
                  child: Text(
                    offer.nonce,
                    style: theme.textTheme.bodyLarge?.copyWith(fontFamily: 'monospace'),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Claim by scan or paste',
          child: Column(
            children: [
              TextField(
                controller: _claimController,
                decoration: const InputDecoration(labelText: 'Offer nonce', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: widget.state.user == null || widget.state.isBusy
                          ? null
                          : () => widget.controller.claimOffer(_claimController.text.trim()),
                      child: const Text('Claim encounter'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () async {
                        final value = await Navigator.of(context).push<String>(
                          MaterialPageRoute(builder: (_) => const _ScannerPage()),
                        );
                        if (value != null && value.isNotEmpty) {
                          _claimController.text = value;
                        }
                      },
                      child: const Text('Scan QR'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Blind context and negotiation',
          child: Column(
            children: [
              TextField(
                controller: _contextNonceController,
                decoration: const InputDecoration(labelText: 'Encounter nonce', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _context,
                items: _contexts.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
                onChanged: (value) => setState(() => _context = value ?? 'business'),
                decoration: const InputDecoration(labelText: 'Blind context', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: widget.state.user == null || widget.state.isBusy
                    ? null
                    : () => widget.controller.submitContext(_contextNonceController.text.trim(), _context),
                child: const Text('Submit blind context'),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: _negotiateNonceController,
                decoration: const InputDecoration(labelText: 'Negotiation nonce', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _negotiation,
                items: _contexts.map((item) => DropdownMenuItem(value: item, child: Text(item))).toList(),
                onChanged: (value) => setState(() => _negotiation = value ?? 'business'),
                decoration: const InputDecoration(labelText: 'Negotiation proposal', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: widget.state.user == null || widget.state.isBusy
                    ? null
                    : () => widget.controller.negotiate(_negotiateNonceController.text.trim(), _negotiation),
                child: const Text('Submit negotiation proposal'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RatingsPage extends ConsumerStatefulWidget {
  const _RatingsPage({required this.controller, required this.state});

  final AppController controller;
  final AppState state;

  @override
  ConsumerState<_RatingsPage> createState() => _RatingsPageState();
}

class _RatingsPageState extends ConsumerState<_RatingsPage> {
  final Map<String, int> _stars = {};
  final Map<String, TextEditingController> _comments = {};

  @override
  void dispose() {
    for (final controller in _comments.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _SectionCard(
          title: 'Open entitlements',
          child: widget.state.entitlements.isEmpty
              ? const Text('Finalize an encounter to unlock rating rights.')
              : Column(
                  children: widget.state.entitlements.map((entitlement) {
                    final star = _stars[entitlement.entitlementId] ?? 5;
                    final controller = _comments.putIfAbsent(
                      entitlement.entitlementId,
                      () => TextEditingController(),
                    );
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                entitlement.targetDisplayName ?? entitlement.targetUserId,
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Text('${entitlement.context} encounter'),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                children: _ratingStars.map((value) {
                                  return ChoiceChip(
                                    label: Text('$value'),
                                    selected: star == value,
                                    onSelected: (_) => setState(() => _stars[entitlement.entitlementId] = value),
                                  );
                                }).toList(),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: controller,
                                maxLines: 3,
                                decoration: const InputDecoration(
                                  labelText: 'Review note',
                                  border: OutlineInputBorder(),
                                ),
                              ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed: widget.state.isBusy
                                    ? null
                                    : () => widget.controller.submitRating(
                                          entitlement.entitlementId,
                                          star,
                                          controller.text.trim(),
                                        ),
                                child: const Text('Submit rating'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Recent ratings',
          child: widget.state.ratings.isEmpty
              ? const Text('Your ratings will appear here after submission.')
              : Column(
                  children: widget.state.ratings.map((rating) {
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text(rating.targetDisplayName ?? rating.targetUserId),
                      subtitle: Text('${rating.stars} stars · ${rating.category} · ${rating.state}'),
                      trailing: rating.disputeId != null ? const Icon(Icons.gavel_outlined) : null,
                    );
                  }).toList(),
                ),
        ),
      ],
    );
  }
}

class _GovernancePage extends ConsumerStatefulWidget {
  const _GovernancePage({required this.controller, required this.state});

  final AppController controller;
  final AppState state;

  @override
  ConsumerState<_GovernancePage> createState() => _GovernancePageState();
}

class _GovernancePageState extends ConsumerState<_GovernancePage> {
  final Map<String, TextEditingController> _replyControllers = {};
  final Map<String, TextEditingController> _resolveControllers = {};
  final Map<String, TextEditingController> _juryControllers = {};
  final Map<String, String> _juryDecision = {};

  @override
  void dispose() {
    for (final controller in [
      ..._replyControllers.values,
      ..._resolveControllers.values,
      ..._juryControllers.values,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final userId = widget.state.user?.userId;

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _SectionCard(
          title: 'Disputes',
          child: widget.state.disputes.isEmpty
              ? const Text('Low-score disputes will surface here for reply and escalation.')
              : Column(
                  children: widget.state.disputes.map((dispute) {
                    final reply = _replyControllers.putIfAbsent(dispute.disputeId, TextEditingController.new);
                    final resolution = _resolveControllers.putIfAbsent(dispute.disputeId, TextEditingController.new);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${dispute.authorDisplayName ?? 'Author'} vs ${dispute.targetDisplayName ?? 'Target'}',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Text('${dispute.category} · ${dispute.status}'),
                              if (dispute.comment != null) ...[
                                const SizedBox(height: 8),
                                Text(dispute.comment!),
                              ],
                              if (dispute.replyMessage != null) ...[
                                const SizedBox(height: 8),
                                Text('Reply: ${dispute.replyMessage!}'),
                              ],
                              if (userId == dispute.targetUserId) ...[
                                const SizedBox(height: 12),
                                TextField(
                                  controller: reply,
                                  maxLines: 2,
                                  decoration: const InputDecoration(
                                    labelText: 'Right of reply',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                OutlinedButton(
                                  onPressed: widget.state.isBusy
                                      ? null
                                      : () => widget.controller.replyToDispute(
                                            dispute.disputeId,
                                            reply.text.trim(),
                                          ),
                                  child: const Text('Submit reply'),
                                ),
                              ],
                              if (userId == dispute.authorUserId) ...[
                                const SizedBox(height: 12),
                                TextField(
                                  controller: resolution,
                                  maxLines: 2,
                                  decoration: const InputDecoration(
                                    labelText: 'Resolution note',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: widget.state.isBusy
                                            ? null
                                            : () => widget.controller.resolveDispute(
                                                  dispute.disputeId,
                                                  resolution.text.trim(),
                                                ),
                                        child: const Text('Resolve'),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: FilledButton(
                                        onPressed: widget.state.isBusy
                                            ? null
                                            : () => widget.controller.escalateDispute(dispute.disputeId),
                                        child: const Text('Escalate'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Assigned jury cases',
          child: widget.state.juryCases.isEmpty
              ? const Text('You have no active jury assignments.')
              : Column(
                  children: widget.state.juryCases.map((juryCase) {
                    final rationale = _juryControllers.putIfAbsent(juryCase.juryCaseId, TextEditingController.new);
                    final decision = _juryDecision[juryCase.juryCaseId] ?? 'uphold';
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${juryCase.authorDisplayName ?? 'Author'} vs ${juryCase.targetDisplayName ?? 'Target'}',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Text(
                                '${juryCase.category} · ${juryCase.votesCast}/${juryCase.assignedJurors} votes · ${juryCase.status}',
                              ),
                              if (juryCase.status != 'decided') ...[
                                const SizedBox(height: 12),
                                SegmentedButton<String>(
                                  segments: const [
                                    ButtonSegment(value: 'uphold', label: Text('Uphold')),
                                    ButtonSegment(value: 'reject', label: Text('Reject')),
                                  ],
                                  selected: {decision},
                                  onSelectionChanged: (selection) => setState(
                                    () => _juryDecision[juryCase.juryCaseId] = selection.first,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                TextField(
                                  controller: rationale,
                                  maxLines: 2,
                                  decoration: const InputDecoration(
                                    labelText: 'Optional rationale',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                FilledButton(
                                  onPressed: widget.state.isBusy
                                      ? null
                                      : () => widget.controller.voteJury(
                                            juryCase.juryCaseId,
                                            decision,
                                            rationale.text.trim(),
                                          ),
                                  child: const Text('Submit jury vote'),
                                ),
                              ] else ...[
                                const SizedBox(height: 8),
                                Text('Final decision: ${juryCase.finalDecision ?? 'unknown'}'),
                              ],
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
        ),
      ],
    );
  }
}

class _BusinessAndSignalsPage extends ConsumerStatefulWidget {
  const _BusinessAndSignalsPage({required this.controller, required this.state});

  final AppController controller;
  final AppState state;

  @override
  ConsumerState<_BusinessAndSignalsPage> createState() => _BusinessAndSignalsPageState();
}

class _BusinessAndSignalsPageState extends ConsumerState<_BusinessAndSignalsPage> {
  final _legalNameController = TextEditingController();
  final _displayNameController = TextEditingController();
  final _categoriesController = TextEditingController(text: 'business');
  final _employeeUserIdController = TextEditingController();
  final _employeeRoleController = TextEditingController(text: 'associate');
  String? _selectedBusinessId;
  late final Future<bool> _nfcAvailableFuture;

  @override
  void initState() {
    super.initState();
    _nfcAvailableFuture = NfcManager.instance.checkAvailability().then((value) => value == NfcAvailability.enabled);
  }

  @override
  void dispose() {
    _legalNameController.dispose();
    _displayNameController.dispose();
    _categoriesController.dispose();
    _employeeUserIdController.dispose();
    _employeeRoleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        _SectionCard(
          title: 'Founder-linked businesses',
          child: Column(
            children: [
              TextField(
                controller: _legalNameController,
                decoration: const InputDecoration(labelText: 'Legal name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _displayNameController,
                decoration: const InputDecoration(labelText: 'Display name', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _categoriesController,
                decoration: const InputDecoration(labelText: 'Categories', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: widget.state.user == null || widget.state.isBusy
                    ? null
                    : () => widget.controller.createBusiness(
                          _legalNameController.text.trim(),
                          _displayNameController.text.trim(),
                          _categoriesController.text
                              .split(',')
                              .map((entry) => entry.trim())
                              .where((entry) => entry.isNotEmpty)
                              .toList(),
                        ),
                child: const Text('Create business'),
              ),
              const SizedBox(height: 16),
              if (widget.state.businesses.isNotEmpty)
                DropdownButtonFormField<String>(
                  initialValue: _selectedBusinessId,
                  items: widget.state.businesses
                      .map(
                        (business) => DropdownMenuItem(
                          value: business.businessId,
                          child: Text(business.displayName),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setState(() => _selectedBusinessId = value),
                  decoration: const InputDecoration(
                    labelText: 'Business for employee link',
                    border: OutlineInputBorder(),
                  ),
                ),
              const SizedBox(height: 12),
              TextField(
                controller: _employeeUserIdController,
                decoration: const InputDecoration(labelText: 'Employee user ID', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _employeeRoleController,
                decoration: const InputDecoration(labelText: 'Role', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: widget.state.user == null || widget.state.isBusy || _selectedBusinessId == null
                    ? null
                    : () => widget.controller.linkEmployee(
                          _selectedBusinessId!,
                          _employeeUserIdController.text.trim(),
                          _employeeRoleController.text.trim(),
                        ),
                child: const Text('Link employee'),
              ),
              const SizedBox(height: 16),
              for (final business in widget.state.businesses)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(business.displayName),
                  subtitle: Text('${business.categories.join(', ')} · ${business.employeeCount} employees'),
                ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _SectionCard(
          title: 'Hardware readiness',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StreamBuilder<BluetoothAdapterState>(
                stream: FlutterBluePlus.adapterState,
                initialData: BluetoothAdapterState.unknown,
                builder: (context, snapshot) {
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('BLE adapter'),
                    subtitle: Text(snapshot.data?.name ?? 'unknown'),
                  );
                },
              ),
              FutureBuilder<bool>(
                future: _nfcAvailableFuture,
                builder: (context, snapshot) {
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('NFC availability'),
                    subtitle: Text(snapshot.data == true ? 'available' : 'unavailable or unchecked'),
                  );
                },
              ),
              const ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('QR mode'),
                subtitle: Text('Scanner flow active through the encounter claim tab.'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _ScannerPage extends StatelessWidget {
  const _ScannerPage();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan encounter QR')),
      body: MobileScanner(
        onDetect: (capture) {
          final barcode = capture.barcodes.isEmpty ? null : capture.barcodes.first.rawValue;
          if (barcode != null && context.mounted) {
            Navigator.of(context).pop(barcode);
          }
        },
      ),
    );
  }
}

class _HeroCard extends StatelessWidget {
  const _HeroCard({required this.title, required this.subtitle, required this.trailing});

  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 8),
                  Text(subtitle, style: theme.textTheme.bodyLarge),
                ],
              ),
            ),
            const SizedBox(width: 16),
            trailing,
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    );
  }
}

class _MetricChip extends StatelessWidget {
  const _MetricChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(label));
  }
}
