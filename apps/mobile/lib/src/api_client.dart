import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter/foundation.dart';

import 'models.dart';

String defaultApiBaseUrl() {
  if (kIsWeb) {
    return 'http://localhost:3000';
  }

  if (defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:3000';
  }

  return 'http://localhost:3000';
}

class MobileApiClient {
  MobileApiClient({String? baseUrl})
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl ?? const String.fromEnvironment('COMTOUZ_API_BASE_URL', defaultValue: 'http://localhost:3000'),
            headers: const {'content-type': 'application/json'},
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 12),
            validateStatus: (status) => status != null && status < 500,
          ),
        ) {
    if (!kIsWeb) {
      _dio.interceptors.add(CookieManager(CookieJar()));
    }
  }

  final Dio _dio;

  Future<Map<String, dynamic>> _requestJson(
    String path, {
    String method = 'GET',
    Map<String, dynamic>? data,
  }) async {
    final response = await _dio.request<Map<String, dynamic>>(
      path,
      data: data,
      options: Options(method: method),
    );

    final body = response.data ?? <String, dynamic>{};
    if (response.statusCode != null && response.statusCode! >= 400) {
      throw Exception(body['error'] ?? 'Request failed with status ${response.statusCode}');
    }

    return body;
  }

  Future<MobileUser> loginDevelopment(String alias) async {
    final body = await _requestJson('/api/auth/dev-session', method: 'POST', data: {'alias': alias});
    return MobileUser.fromJson(body['user'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    final response = await _dio.delete('/api/auth/session');
    if (response.statusCode != null && response.statusCode! >= 400) {
      throw Exception('Failed to clear session');
    }
  }

  Future<MobileUser> getMe() async {
    final body = await _requestJson('/api/me');
    return MobileUser.fromJson(body['user'] as Map<String, dynamic>);
  }

  Future<EncounterOffer> createOffer({required String channel, required List<String> offeredContexts}) async {
    final body = await _requestJson(
      '/api/encounters/offer',
      method: 'POST',
      data: {'channel': channel, 'offeredContexts': offeredContexts},
    );
    return EncounterOffer.fromJson(body['offer'] as Map<String, dynamic>);
  }

  Future<void> claimOffer(String nonce) async {
    await _requestJson('/api/encounters/claim', method: 'POST', data: {'nonce': nonce});
  }

  Future<Map<String, dynamic>> submitContext({required String nonce, required String context}) {
    return _requestJson('/api/encounters/context', method: 'POST', data: {'nonce': nonce, 'context': context});
  }

  Future<Map<String, dynamic>> negotiate({required String nonce, required String context}) {
    return _requestJson('/api/encounters/negotiate', method: 'POST', data: {'nonce': nonce, 'context': context});
  }

  Future<RatingsBundle> getRatingsBundle() async {
    final body = await _requestJson('/api/ratings/entitlements');
    final entitlements = ((body['entitlements'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>())
        .map(RatingEntitlement.fromJson)
        .toList();
    final ratings = ((body['ratings'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>())
        .map(RatingItem.fromJson)
        .toList();
    return RatingsBundle(entitlements: entitlements, ratings: ratings);
  }

  Future<RatingItem> submitRating({required String entitlementId, required int stars, String? comment}) async {
    final body = await _requestJson(
      '/api/ratings',
      method: 'POST',
      data: {'entitlementId': entitlementId, 'stars': stars, 'comment': comment},
    );
    return RatingItem.fromJson(body['rating'] as Map<String, dynamic>);
  }

  Future<GovernanceBundle> getGovernanceBundle() async {
    final body = await _requestJson('/api/disputes');
    final disputes = ((body['disputes'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>())
        .map(DisputeItem.fromJson)
        .toList();
    final juryCases = ((body['juryCases'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>())
        .map(JuryCaseItem.fromJson)
        .toList();
    return GovernanceBundle(disputes: disputes, juryCases: juryCases);
  }

  Future<void> replyToDispute({required String disputeId, required String replyMessage}) async {
    await _requestJson('/api/disputes/reply', method: 'POST', data: {'disputeId': disputeId, 'replyMessage': replyMessage});
  }

  Future<void> resolveDispute({required String disputeId, required String resolutionNote}) async {
    await _requestJson('/api/disputes/resolve', method: 'POST', data: {'disputeId': disputeId, 'resolutionNote': resolutionNote});
  }

  Future<void> escalateDispute(String disputeId) async {
    await _requestJson('/api/disputes/escalate', method: 'POST', data: {'disputeId': disputeId});
  }

  Future<void> voteJury({required String juryCaseId, required String decision, String? rationale}) async {
    await _requestJson('/api/jury/vote', method: 'POST', data: {'juryCaseId': juryCaseId, 'decision': decision, 'rationale': rationale});
  }

  Future<List<BusinessItem>> getBusinesses() async {
    final body = await _requestJson('/api/businesses');
    return ((body['businesses'] as List<dynamic>? ?? const []).cast<Map<String, dynamic>>())
        .map(BusinessItem.fromJson)
        .toList();
  }

  Future<void> createBusiness({required String legalName, required String displayName, required List<String> categories}) async {
    await _requestJson(
      '/api/businesses',
      method: 'POST',
      data: {'legalName': legalName, 'displayName': displayName, 'categories': categories},
    );
  }

  Future<void> linkEmployee({required String businessId, required String employeeUserId, required String role}) async {
    await _requestJson(
      '/api/businesses/employees',
      method: 'POST',
      data: {'businessId': businessId, 'employeeUserId': employeeUserId, 'role': role},
    );
  }
}
