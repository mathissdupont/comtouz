class MobileUser {
  const MobileUser({
    required this.userId,
    required this.worldPassSubjectId,
    required this.reputationScore,
    required this.effectiveWeight,
    this.displayName,
    this.countryCode,
  });

  factory MobileUser.fromJson(Map<String, dynamic> json) {
    return MobileUser(
      userId: json['userId'] as String,
      worldPassSubjectId: json['worldPassSubjectId'] as String,
      displayName: json['displayName'] as String?,
      countryCode: json['countryCode'] as String?,
      reputationScore: (json['reputationScore'] as num?)?.toDouble() ?? 0,
      effectiveWeight: (json['effectiveWeight'] as num?)?.toDouble() ?? 0,
    );
  }

  final String userId;
  final String worldPassSubjectId;
  final String? displayName;
  final String? countryCode;
  final double reputationScore;
  final double effectiveWeight;
}

class EncounterOffer {
  const EncounterOffer({
    required this.nonce,
    required this.channel,
    required this.createdAt,
    required this.expiresAt,
  });

  factory EncounterOffer.fromJson(Map<String, dynamic> json) {
    return EncounterOffer(
      nonce: json['nonce'] as String,
      channel: json['channel'] as String,
      createdAt: json['createdAt'] as String,
      expiresAt: json['expiresAt'] as String,
    );
  }

  final String nonce;
  final String channel;
  final String createdAt;
  final String expiresAt;
}

class RatingEntitlement {
  const RatingEntitlement({
    required this.entitlementId,
    required this.encounterId,
    required this.targetUserId,
    required this.context,
    required this.status,
    required this.createdAt,
    this.targetDisplayName,
  });

  factory RatingEntitlement.fromJson(Map<String, dynamic> json) {
    return RatingEntitlement(
      entitlementId: json['entitlementId'] as String,
      encounterId: json['encounterId'] as String,
      targetUserId: json['targetUserId'] as String,
      targetDisplayName: json['targetDisplayName'] as String?,
      context: json['context'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
    );
  }

  final String entitlementId;
  final String encounterId;
  final String targetUserId;
  final String? targetDisplayName;
  final String context;
  final String status;
  final String createdAt;
}

class RatingItem {
  const RatingItem({
    required this.ratingId,
    required this.stars,
    required this.state,
    required this.category,
    required this.createdAt,
    required this.targetUserId,
    this.comment,
    this.targetDisplayName,
    this.disputeId,
  });

  factory RatingItem.fromJson(Map<String, dynamic> json) {
    return RatingItem(
      ratingId: json['ratingId'] as String,
      stars: json['stars'] as int,
      state: json['state'] as String,
      category: json['category'] as String,
      comment: json['comment'] as String?,
      createdAt: json['createdAt'] as String,
      targetDisplayName: json['targetDisplayName'] as String?,
      targetUserId: json['targetUserId'] as String,
      disputeId: json['disputeId'] as String?,
    );
  }

  final String ratingId;
  final int stars;
  final String state;
  final String category;
  final String? comment;
  final String createdAt;
  final String? targetDisplayName;
  final String targetUserId;
  final String? disputeId;
}

class DisputeItem {
  const DisputeItem({
    required this.disputeId,
    required this.ratingId,
    required this.status,
    required this.category,
    required this.authorUserId,
    required this.targetUserId,
    required this.openedAt,
    required this.resolutionDeadline,
    this.replyMessage,
    this.comment,
    this.authorDisplayName,
    this.targetDisplayName,
    this.juryCaseId,
    this.juryStatus,
    this.stars,
  });

  factory DisputeItem.fromJson(Map<String, dynamic> json) {
    return DisputeItem(
      disputeId: json['disputeId'] as String,
      ratingId: json['ratingId'] as String,
      status: json['status'] as String,
      category: json['category'] as String,
      authorUserId: json['authorUserId'] as String,
      targetUserId: json['targetUserId'] as String,
      openedAt: json['openedAt'] as String,
      resolutionDeadline: json['resolutionDeadline'] as String,
      replyMessage: json['replyMessage'] as String?,
      comment: json['comment'] as String?,
      authorDisplayName: json['authorDisplayName'] as String?,
      targetDisplayName: json['targetDisplayName'] as String?,
      juryCaseId: json['juryCaseId'] as String?,
      juryStatus: json['juryStatus'] as String?,
      stars: json['stars'] as int?,
    );
  }

  final String disputeId;
  final String ratingId;
  final String status;
  final String category;
  final String authorUserId;
  final String targetUserId;
  final String openedAt;
  final String resolutionDeadline;
  final String? replyMessage;
  final String? comment;
  final String? authorDisplayName;
  final String? targetDisplayName;
  final String? juryCaseId;
  final String? juryStatus;
  final int? stars;
}

class JuryCaseItem {
  const JuryCaseItem({
    required this.juryCaseId,
    required this.disputeId,
    required this.category,
    required this.status,
    required this.votesCast,
    required this.assignedJurors,
    this.finalDecision,
    this.authorDisplayName,
    this.targetDisplayName,
  });

  factory JuryCaseItem.fromJson(Map<String, dynamic> json) {
    return JuryCaseItem(
      juryCaseId: json['juryCaseId'] as String,
      disputeId: json['disputeId'] as String,
      category: json['category'] as String,
      status: json['status'] as String,
      votesCast: json['votesCast'] as int? ?? 0,
      assignedJurors: json['assignedJurors'] as int? ?? 0,
      finalDecision: json['finalDecision'] as String?,
      authorDisplayName: json['authorDisplayName'] as String?,
      targetDisplayName: json['targetDisplayName'] as String?,
    );
  }

  final String juryCaseId;
  final String disputeId;
  final String category;
  final String status;
  final int votesCast;
  final int assignedJurors;
  final String? finalDecision;
  final String? authorDisplayName;
  final String? targetDisplayName;
}

class BusinessItem {
  const BusinessItem({
    required this.businessId,
    required this.legalName,
    required this.displayName,
    required this.categories,
    required this.founderUserId,
    required this.employeeCount,
    this.founderDisplayName,
  });

  factory BusinessItem.fromJson(Map<String, dynamic> json) {
    return BusinessItem(
      businessId: json['businessId'] as String,
      legalName: json['legalName'] as String,
      displayName: json['displayName'] as String,
      categories: (json['categories'] as List<dynamic>? ?? const []).cast<String>(),
      founderUserId: json['founderUserId'] as String,
      founderDisplayName: json['founderDisplayName'] as String?,
      employeeCount: json['employeeCount'] as int? ?? 0,
    );
  }

  final String businessId;
  final String legalName;
  final String displayName;
  final List<String> categories;
  final String founderUserId;
  final String? founderDisplayName;
  final int employeeCount;
}

class GovernanceBundle {
  const GovernanceBundle({required this.disputes, required this.juryCases});

  final List<DisputeItem> disputes;
  final List<JuryCaseItem> juryCases;
}

class RatingsBundle {
  const RatingsBundle({required this.entitlements, required this.ratings});

  final List<RatingEntitlement> entitlements;
  final List<RatingItem> ratings;
}

class AppState {
  const AppState({
    this.user,
    this.activeOffer,
    this.entitlements = const [],
    this.ratings = const [],
    this.disputes = const [],
    this.juryCases = const [],
    this.businesses = const [],
    this.activity = const [],
    this.error,
    this.isBusy = false,
  });

  final MobileUser? user;
  final EncounterOffer? activeOffer;
  final List<RatingEntitlement> entitlements;
  final List<RatingItem> ratings;
  final List<DisputeItem> disputes;
  final List<JuryCaseItem> juryCases;
  final List<BusinessItem> businesses;
  final List<String> activity;
  final String? error;
  final bool isBusy;

  AppState copyWith({
    MobileUser? user,
    EncounterOffer? activeOffer,
    List<RatingEntitlement>? entitlements,
    List<RatingItem>? ratings,
    List<DisputeItem>? disputes,
    List<JuryCaseItem>? juryCases,
    List<BusinessItem>? businesses,
    List<String>? activity,
    String? error,
    bool? isBusy,
    bool clearError = false,
    bool clearOffer = false,
  }) {
    return AppState(
      user: user ?? this.user,
      activeOffer: clearOffer ? null : activeOffer ?? this.activeOffer,
      entitlements: entitlements ?? this.entitlements,
      ratings: ratings ?? this.ratings,
      disputes: disputes ?? this.disputes,
      juryCases: juryCases ?? this.juryCases,
      businesses: businesses ?? this.businesses,
      activity: activity ?? this.activity,
      error: clearError ? null : error ?? this.error,
      isBusy: isBusy ?? this.isBusy,
    );
  }
}
