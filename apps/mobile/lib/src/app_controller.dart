import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'models.dart';

final apiClientProvider = Provider<MobileApiClient>((ref) => MobileApiClient(baseUrl: defaultApiBaseUrl()));

final appControllerProvider = StateNotifierProvider<AppController, AppState>((ref) {
  return AppController(ref.read(apiClientProvider));
});

class AppController extends StateNotifier<AppState> {
  AppController(this._api) : super(const AppState(activity: ['Mobile command center initialized.'])) {
    unawaited(refresh());
  }

  final MobileApiClient _api;

  Future<void> refresh() async {
    try {
      final user = await _api.getMe();
      final ratingsBundle = await _api.getRatingsBundle();
      final governanceBundle = await _api.getGovernanceBundle();
      final businesses = await _api.getBusinesses();

      state = state.copyWith(
        user: user,
        entitlements: ratingsBundle.entitlements,
        ratings: ratingsBundle.ratings,
        disputes: governanceBundle.disputes,
        juryCases: governanceBundle.juryCases,
        businesses: businesses,
        clearError: true,
      );
    } catch (_) {
      state = state.copyWith(
        user: null,
        entitlements: const [],
        ratings: const [],
        disputes: const [],
        juryCases: const [],
        businesses: const [],
      );
    }
  }

  Future<void> _runAction(String message, Future<void> Function() action) async {
    state = state.copyWith(isBusy: true, clearError: true);
    try {
      await action();
      state = state.copyWith(
        isBusy: false,
        activity: [message, ...state.activity].take(12).toList(),
        clearError: true,
      );
    } catch (error) {
      state = state.copyWith(isBusy: false, error: error.toString());
    }
  }

  Future<void> loginDevelopment(String alias) {
    return _runAction('Development session created for $alias.', () async {
      final user = await _api.loginDevelopment(alias);
      final ratingsBundle = await _api.getRatingsBundle();
      final governanceBundle = await _api.getGovernanceBundle();
      final businesses = await _api.getBusinesses();
      state = state.copyWith(
        user: user,
        entitlements: ratingsBundle.entitlements,
        ratings: ratingsBundle.ratings,
        disputes: governanceBundle.disputes,
        juryCases: governanceBundle.juryCases,
        businesses: businesses,
      );
    });
  }

  Future<void> logout() {
    return _runAction('Session cleared on mobile.', () async {
      await _api.logout();
      state = state.copyWith(
        user: null,
        entitlements: const [],
        ratings: const [],
        disputes: const [],
        juryCases: const [],
        businesses: const [],
        clearOffer: true,
      );
    });
  }

  Future<void> createOffer(String channel, List<String> contexts) {
    return _runAction('Encounter offer minted over ${channel.toUpperCase()}.', () async {
      final offer = await _api.createOffer(channel: channel, offeredContexts: contexts);
      state = state.copyWith(activeOffer: offer);
    });
  }

  Future<void> claimOffer(String nonce) {
    return _runAction('Encounter offer claimed.', () async {
      await _api.claimOffer(nonce);
    });
  }

  Future<void> submitContext(String nonce, String context) {
    return _runAction('Context $context submitted for $nonce.', () async {
      final result = await _api.submitContext(nonce: nonce, context: context);
      if (result['status'] == 'finalized') {
        await refresh();
      }
    });
  }

  Future<void> negotiate(String nonce, String context) {
    return _runAction('Negotiation proposal $context submitted.', () async {
      final result = await _api.negotiate(nonce: nonce, context: context);
      if (result['status'] == 'finalized') {
        await refresh();
      }
    });
  }

  Future<void> submitRating(String entitlementId, int stars, String comment) {
    return _runAction('$stars star rating submitted.', () async {
      await _api.submitRating(entitlementId: entitlementId, stars: stars, comment: comment);
      await refresh();
    });
  }

  Future<void> replyToDispute(String disputeId, String message) {
    return _runAction('Right of reply submitted.', () async {
      await _api.replyToDispute(disputeId: disputeId, replyMessage: message);
      await refresh();
    });
  }

  Future<void> resolveDispute(String disputeId, String resolutionNote) {
    return _runAction('Dispute resolved directly.', () async {
      await _api.resolveDispute(disputeId: disputeId, resolutionNote: resolutionNote);
      await refresh();
    });
  }

  Future<void> escalateDispute(String disputeId) {
    return _runAction('Dispute escalated to jury.', () async {
      await _api.escalateDispute(disputeId);
      await refresh();
    });
  }

  Future<void> voteJury(String juryCaseId, String decision, String rationale) {
    return _runAction('Jury vote recorded.', () async {
      await _api.voteJury(juryCaseId: juryCaseId, decision: decision, rationale: rationale);
      await refresh();
    });
  }

  Future<void> createBusiness(String legalName, String displayName, List<String> categories) {
    return _runAction('Founder-linked business created.', () async {
      await _api.createBusiness(legalName: legalName, displayName: displayName, categories: categories);
      await refresh();
    });
  }

  Future<void> linkEmployee(String businessId, String employeeUserId, String role) {
    return _runAction('Employee linked to business.', () async {
      await _api.linkEmployee(businessId: businessId, employeeUserId: employeeUserId, role: role);
      await refresh();
    });
  }
}
