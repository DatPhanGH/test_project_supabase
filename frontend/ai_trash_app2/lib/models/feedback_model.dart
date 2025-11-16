import 'dart:convert';

class FeedbackModel {
  final int? feedbackId;
  final String userId;
  final int imageId;
  final String? comment;
  final int? correctedCategoryId; // Giữ lại để tương thích với database hiện tại
  final List<int>? correctedCategoryIds; // Danh sách nhiều loại rác đúng
  final DateTime createdAt;
  final DateTime? updatedAt;

  FeedbackModel({
    this.feedbackId,
    required this.userId,
    required this.imageId,
    this.comment,
    this.correctedCategoryId,
    this.correctedCategoryIds,
    required this.createdAt,
    this.updatedAt,
  });

  factory FeedbackModel.fromJson(Map<String, dynamic> json) {
    // Xử lý null-safe cho các trường có thể null
    int? feedbackId;
    if (json['feedback_id'] != null) {
      feedbackId = json['feedback_id'] is int 
          ? json['feedback_id'] as int
          : int.tryParse(json['feedback_id'].toString());
    }

    String userId;
    if (json['user_id'] != null) {
      userId = json['user_id'].toString();
    } else {
      throw Exception('user_id is required but was null');
    }

    int imageId;
    if (json['image_id'] != null) {
      imageId = json['image_id'] is int 
          ? json['image_id'] as int
          : (int.tryParse(json['image_id'].toString()) ?? 0);
    } else {
      // Không throw exception, dùng 0 làm default và log warning
      print('⚠️ Warning: image_id is null in FeedbackModel.fromJson, using 0 as default');
      imageId = 0;
    }

    int? correctedCategoryId;
    if (json['corrected_category_id'] != null) {
      correctedCategoryId = json['corrected_category_id'] is int
          ? json['corrected_category_id'] as int
          : int.tryParse(json['corrected_category_id'].toString());
    }

    // Parse corrected_category_ids từ JSON array hoặc string
    List<int>? correctedCategoryIds;
    if (json['corrected_category_ids'] != null) {
      if (json['corrected_category_ids'] is List) {
        correctedCategoryIds = (json['corrected_category_ids'] as List)
            .map((e) => e is int ? e : int.tryParse(e.toString()))
            .whereType<int>()
            .toList();
      } else if (json['corrected_category_ids'] is String) {
        // Nếu lưu dưới dạng JSON string
        try {
          final List<dynamic> parsed = jsonDecode(json['corrected_category_ids'] as String);
          correctedCategoryIds = parsed
              .map((e) => e is int ? e : int.tryParse(e.toString()))
              .whereType<int>()
              .toList();
        } catch (e) {
          correctedCategoryIds = null;
        }
      }
    }
    
    // Nếu có corrected_category_id nhưng không có corrected_category_ids, tạo list từ nó
    if (correctedCategoryIds == null && correctedCategoryId != null) {
      correctedCategoryIds = [correctedCategoryId];
    }

    DateTime createdAt;
    try {
      if (json['created_at'] is String) {
        createdAt = DateTime.parse(json['created_at']);
      } else {
        createdAt = DateTime.now();
      }
    } catch (e) {
      createdAt = DateTime.now();
    }

    DateTime? updatedAt;
    if (json['updated_at'] != null) {
      try {
        if (json['updated_at'] is String) {
          updatedAt = DateTime.parse(json['updated_at']);
        }
      } catch (e) {
        updatedAt = null;
      }
    }

    // Lấy comment thực sự (loại bỏ metadata nếu có)
    String? comment = json['comment'] as String?;
    if (comment != null && comment.contains('[METADATA:')) {
      comment = comment.split('\n\n[METADATA:').first.trim();
      if (comment.isEmpty) comment = null;
    }

    return FeedbackModel(
      feedbackId: feedbackId,
      userId: userId,
      imageId: imageId,
      comment: comment,
      correctedCategoryId: correctedCategoryId,
      correctedCategoryIds: correctedCategoryIds,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (feedbackId != null) 'feedback_id': feedbackId,
      'user_id': userId,
      'image_id': imageId,
      if (comment != null) 'comment': comment,
      if (correctedCategoryId != null) 'corrected_category_id': correctedCategoryId,
      // Lưu corrected_category_ids dưới dạng JSON string trong comment hoặc field riêng
      if (correctedCategoryIds != null && correctedCategoryIds!.isNotEmpty) 
        'corrected_category_ids': correctedCategoryIds,
    };
  }

  FeedbackModel copyWith({
    int? feedbackId,
    String? userId,
    int? imageId,
    String? comment,
    int? correctedCategoryId,
    List<int>? correctedCategoryIds,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return FeedbackModel(
      feedbackId: feedbackId ?? this.feedbackId,
      userId: userId ?? this.userId,
      imageId: imageId ?? this.imageId,
      comment: comment ?? this.comment,
      correctedCategoryId: correctedCategoryId ?? this.correctedCategoryId,
      correctedCategoryIds: correctedCategoryIds ?? this.correctedCategoryIds,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

