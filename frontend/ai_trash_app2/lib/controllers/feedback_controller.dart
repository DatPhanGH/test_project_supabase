import 'package:flutter/material.dart';
import '/services/supabase_service.dart';
import '/models/feedback_model.dart';
import '/models/prediction_model.dart';
import '/constants.dart';

/// Controller xử lý logic feedback và chi tiết ảnh
class FeedbackController {
  final SupabaseService _supabaseService = SupabaseService();

  // =========================================================
  // Lấy chi tiết ảnh với predictions
  // =========================================================
  Future<ImageDetailResult> getImageDetail(int imageId) async {
    try {
      final detail = await _supabaseService.getImageDetail(imageId);
      if (detail == null) {
        return ImageDetailResult(
          success: false,
          errorMessage: 'Không tìm thấy thông tin ảnh',
        );
      }

      // Parse predictions
      final List<dynamic>? predictionsData = detail['predictions'];
      final List<Prediction> predictions = [];
      if (predictionsData != null) {
        for (var p in predictionsData) {
          final wasteCategory = p['waste_categories'];
          final categoryName = wasteCategory?['name'] as String? ?? 'Không xác định';
          
          // Xử lý null-safe cho category_id
          final categoryId = p['category_id'] as int? ?? 0;
          
          predictions.add(Prediction(
            categoryId: categoryId,
            categoryName: categoryName,
            confidence: (p['confidence'] as num?)?.toDouble() ?? 0.0,
            bbox: [
              (p['bbox_x1'] as num?)?.toDouble() ?? 0,
              (p['bbox_y1'] as num?)?.toDouble() ?? 0,
              (p['bbox_x2'] as num?)?.toDouble() ?? 0,
              (p['bbox_y2'] as num?)?.toDouble() ?? 0,
            ],
            guidelines: wasteGuidelines[categoryName] ?? wasteGuidelines["Hỗn hợp"]!,
            label: categoryName,
          ));
        }
      }

      // Parse feedback
      final List<dynamic>? feedbacksData = detail['feedbacks'];
      FeedbackModel? feedback;
      if (feedbacksData != null && feedbacksData.isNotEmpty) {
        // Lấy feedback của user hiện tại (nếu có)
        for (var f in feedbacksData) {
          final feedbackData = Map<String, dynamic>.from(f as Map<String, dynamic>);
          // Thêm image_id vào feedback data vì nested query có thể không trả về
          feedbackData['image_id'] = imageId;
          feedback = FeedbackModel.fromJson(feedbackData);
          break; // Lấy feedback đầu tiên (của user hiện tại)
        }
      }

      return ImageDetailResult(
        success: true,
        imageDetail: detail,
        predictions: predictions,
        existingFeedback: feedback,
        fileUrl: detail['file_path'] as String?,
        createdAt: detail['created_at'] is String
            ? DateTime.parse(detail['created_at'])
            : DateTime.now(),
      );
    } catch (e) {
      debugPrint('❌ Lỗi khi lấy chi tiết ảnh: $e');
      return ImageDetailResult(
        success: false,
        errorMessage: 'Lỗi khi tải chi tiết: $e',
      );
    }
  }

  // =========================================================
  // Lấy feedback của user cho một ảnh
  // =========================================================
  Future<FeedbackModel?> getFeedbackForImage(int imageId, String userId) async {
    try {
      return await _supabaseService.getFeedbackForImage(imageId, userId);
    } catch (e) {
      debugPrint('❌ Lỗi khi lấy feedback: $e');
      return null;
    }
  }

  // =========================================================
  // Lưu feedback mới
  // =========================================================
  Future<FeedbackResult> saveFeedback({
    required int imageId,
    required String userId,
    String? comment,
    int? correctedCategoryId,
    List<int>? correctedCategoryIds,
  }) async {
    try {
      final feedback = FeedbackModel(
        userId: userId,
        imageId: imageId,
        comment: comment,
        correctedCategoryId: correctedCategoryId,
        correctedCategoryIds: correctedCategoryIds,
        createdAt: DateTime.now(),
      );

      final savedFeedback = await _supabaseService.saveFeedback(feedback);
      
      if (savedFeedback != null) {
        return FeedbackResult(
          success: true,
          message: 'Đã lưu feedback thành công',
          feedback: savedFeedback,
        );
      } else {
        return FeedbackResult(
          success: false,
          message: 'Lỗi khi lưu feedback',
        );
      }
    } catch (e) {
      debugPrint('❌ Lỗi khi lưu feedback: $e');
      return FeedbackResult(
        success: false,
        message: 'Lỗi: $e',
      );
    }
  }

  // =========================================================
  // Cập nhật feedback đã có
  // =========================================================
  Future<FeedbackResult> updateFeedback({
    required int feedbackId,
    required int imageId,
    required String userId,
    String? comment,
    int? correctedCategoryId,
    List<int>? correctedCategoryIds,
  }) async {
    try {
      final feedback = FeedbackModel(
        feedbackId: feedbackId,
        userId: userId,
        imageId: imageId,
        comment: comment,
        correctedCategoryId: correctedCategoryId,
        correctedCategoryIds: correctedCategoryIds,
        createdAt: DateTime.now(), // Sẽ được cập nhật bởi trigger
      );

      final updatedFeedback = await _supabaseService.updateFeedback(feedback);
      
      if (updatedFeedback != null) {
        return FeedbackResult(
          success: true,
          message: 'Đã cập nhật feedback thành công',
          feedback: updatedFeedback,
        );
      } else {
        return FeedbackResult(
          success: false,
          message: 'Lỗi khi cập nhật feedback',
        );
      }
    } catch (e) {
      debugPrint('❌ Lỗi khi cập nhật feedback: $e');
      return FeedbackResult(
        success: false,
        message: 'Lỗi: $e',
      );
    }
  }

  // =========================================================
  // Lưu hoặc cập nhật feedback (tự động phát hiện)
  // =========================================================
  Future<FeedbackResult> saveOrUpdateFeedback({
    required int imageId,
    required String userId,
    FeedbackModel? existingFeedback,
    String? comment,
    int? correctedCategoryId,
    List<int>? correctedCategoryIds,
  }) async {
    if (existingFeedback != null && existingFeedback.feedbackId != null) {
      // Cập nhật feedback đã có
      return await updateFeedback(
        feedbackId: existingFeedback.feedbackId!,
        imageId: imageId,
        userId: userId,
        comment: comment,
        correctedCategoryId: correctedCategoryId,
        correctedCategoryIds: correctedCategoryIds,
      );
    } else {
      // Tạo feedback mới
      return await saveFeedback(
        imageId: imageId,
        userId: userId,
        comment: comment,
        correctedCategoryId: correctedCategoryId,
        correctedCategoryIds: correctedCategoryIds,
      );
    }
  }
}

// =========================================================
// Model kết quả cho ImageDetail
// =========================================================
class ImageDetailResult {
  final bool success;
  final String? errorMessage;
  final Map<String, dynamic>? imageDetail;
  final List<Prediction> predictions;
  final FeedbackModel? existingFeedback;
  final String? fileUrl;
  final DateTime createdAt;

  ImageDetailResult({
    required this.success,
    this.errorMessage,
    this.imageDetail,
    this.predictions = const [],
    this.existingFeedback,
    this.fileUrl,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();
}

// =========================================================
// Model kết quả cho Feedback operations
// =========================================================
class FeedbackResult {
  final bool success;
  final String message;
  final FeedbackModel? feedback;

  FeedbackResult({
    required this.success,
    required this.message,
    this.feedback,
  });
}

