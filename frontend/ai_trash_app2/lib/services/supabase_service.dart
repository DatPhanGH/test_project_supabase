import 'dart:convert';
import 'package:supabase_flutter/supabase_flutter.dart';
import '/models/history_model.dart';
import '/models/feedback_model.dart';
import '/models/prediction_model.dart';

class SupabaseService {
  // Sử dụng SupabaseFlutter instance đã được khởi tạo trong main.dart
  // Điều này đảm bảo sử dụng authenticated session
  SupabaseClient get supabase => Supabase.instance.client;

  // =========================================================
  // Lấy Lịch Sử Phân Loại (Kết hợp bảng images và predictions)
  // =========================================================
  Future<List<HistoryEntry>> fetchHistory(String userId) async {
    try {
      // Truy vấn bảng 'images' và join với bảng 'predictions' và 'waste_categories'
      // Chỉ lấy các bản ghi có status = 'done' (hoàn thành xử lý)
      // Cấu trúc query: images -> predictions -> waste_categories
      final response = await supabase
          .from('images')
          .select('''
            image_id,
            created_at,
            file_path,
            status,
            predictions(
              prediction_id,
              category_id,
              confidence,
              waste_categories(
                category_id,
                name
              )
            )
          ''')
          .eq('user_id', userId)
          .eq('status', 'done')
          .order('created_at', ascending: false)
          .limit(50); // Tăng limit để hiển thị nhiều hơn

      // response đã là List<Map<String, dynamic>>, không cần .data
      final List<dynamic> data = response;

      // Ánh xạ dữ liệu sang HistoryEntry model
      return data.map((item) => HistoryEntry.fromJson(item)).toList();
    } on PostgrestException catch (e) {
      // Bắt lỗi Supabase cụ thể
      print('❌ Lỗi Postgrest (Supabase): ${e.message}');
      print('❌ Chi tiết lỗi: ${e.details}');
      print('❌ Code: ${e.code}');
      return [];
    } catch (e) {
      // Bắt các lỗi khác
      print('❌ Lỗi khi tải lịch sử: $e');
      return [];
    }
  }

  // =========================================================
  // Lấy danh sách waste categories
  // =========================================================
  Future<List<Map<String, dynamic>>> getWasteCategories() async {
    try {
      final response = await supabase
          .from('waste_categories')
          .select('category_id, name')
          .order('name');

      return List<Map<String, dynamic>>.from(response);
    } on PostgrestException catch (e) {
      print('❌ Lỗi Postgrest khi lấy waste categories: ${e.message}');
      return [];
    } catch (e) {
      print('❌ Lỗi khi lấy waste categories: $e');
      return [];
    }
  }

  // =========================================================
  // Lấy chi tiết ảnh với predictions và feedback
  // =========================================================
  Future<Map<String, dynamic>?> getImageDetail(int imageId) async {
    try {
      // Lấy thông tin ảnh với predictions và feedback
      final response = await supabase
          .from('images')
          .select('''
            image_id,
            created_at,
            file_path,
            status,
            predictions(
              prediction_id,
              category_id,
              confidence,
              bbox_x1,
              bbox_y1,
              bbox_x2,
              bbox_y2,
              waste_categories(
                category_id,
                name
              )
            ),
            feedbacks(
              feedback_id,
              user_id,
              comment,
              corrected_category_id,
              created_at,
              updated_at
            )
          ''')
          .eq('image_id', imageId)
          .single();

      return response as Map<String, dynamic>?;
    } on PostgrestException catch (e) {
      print('❌ Lỗi Postgrest khi lấy chi tiết ảnh: ${e.message}');
      return null;
    } catch (e) {
      print('❌ Lỗi khi lấy chi tiết ảnh: $e');
      return null;
    }
  }

  // =========================================================
  // Lưu feedback
  // =========================================================
  Future<FeedbackModel?> saveFeedback(FeedbackModel feedback) async {
    try {
      // Lưu corrected_category_ids dưới dạng JSON string trong comment nếu có
      final jsonData = feedback.toJson();
      String? finalComment = feedback.comment;
      
      if (feedback.correctedCategoryIds != null && 
          feedback.correctedCategoryIds!.isNotEmpty) {
        // Lưu metadata vào comment dưới dạng JSON
        final metadata = {
          'corrected_category_ids': feedback.correctedCategoryIds,
        };
        final metadataJson = jsonEncode(metadata);
        finalComment = finalComment != null && finalComment.isNotEmpty
            ? '$finalComment\n\n[METADATA:$metadataJson]'
            : '[METADATA:$metadataJson]';
        jsonData['comment'] = finalComment;
      }
      
      // Xóa corrected_category_ids khỏi jsonData vì field này không tồn tại trong DB
      jsonData.remove('corrected_category_ids');
      
      final response = await supabase
          .from('feedbacks')
          .insert(jsonData)
          .select()
          .single();

      return FeedbackModel.fromJson(response as Map<String, dynamic>);
    } on PostgrestException catch (e) {
      print('❌ Lỗi Postgrest khi lưu feedback: ${e.message}');
      print('❌ Chi tiết: ${e.details}');
      return null;
    } catch (e) {
      print('❌ Lỗi khi lưu feedback: $e');
      return null;
    }
  }

  // =========================================================
  // Cập nhật feedback
  // =========================================================
  Future<FeedbackModel?> updateFeedback(FeedbackModel feedback) async {
    try {
      if (feedback.feedbackId == null) {
        print('❌ Không thể cập nhật feedback: thiếu feedback_id');
        return null;
      }

      // Lưu corrected_category_ids dưới dạng JSON string trong comment nếu có
      final jsonData = feedback.toJson();
      String? finalComment = feedback.comment;
      
      if (feedback.correctedCategoryIds != null && 
          feedback.correctedCategoryIds!.isNotEmpty) {
        // Lưu metadata vào comment dưới dạng JSON
        final metadata = {
          'corrected_category_ids': feedback.correctedCategoryIds,
        };
        final metadataJson = jsonEncode(metadata);
        // Xóa metadata cũ nếu có
        if (finalComment != null && finalComment.contains('[METADATA:')) {
          finalComment = finalComment.split('\n\n[METADATA:').first.trim();
        }
        finalComment = finalComment != null && finalComment.isNotEmpty
            ? '$finalComment\n\n[METADATA:$metadataJson]'
            : '[METADATA:$metadataJson]';
        jsonData['comment'] = finalComment;
      }
      
      // Xóa corrected_category_ids khỏi jsonData vì field này không tồn tại trong DB
      jsonData.remove('corrected_category_ids');

      // Kiểm tra xem feedback có tồn tại và user có quyền update không
      final checkResponse = await supabase
          .from('feedbacks')
          .select('feedback_id, user_id')
          .eq('feedback_id', feedback.feedbackId!)
          .maybeSingle();
      
      if (checkResponse == null) {
        print('❌ Không tìm thấy feedback với feedback_id=${feedback.feedbackId}');
        return null;
      }

      // Đảm bảo user_id trong jsonData khớp với feedback hiện tại (để RLS policy cho phép)
      jsonData['user_id'] = feedback.userId;

      final response = await supabase
          .from('feedbacks')
          .update(jsonData)
          .eq('feedback_id', feedback.feedbackId!)
          .eq('user_id', feedback.userId) // Thêm điều kiện user_id để đảm bảo RLS policy
          .select()
          .maybeSingle();

      if (response == null) {
        print('❌ Không thể cập nhật feedback: không tìm thấy sau khi update');
        print('   Có thể do RLS policy không cho phép update. Kiểm tra user_id: ${feedback.userId}');
        return null;
      }

      return FeedbackModel.fromJson(response as Map<String, dynamic>);
    } on PostgrestException catch (e) {
      print('❌ Lỗi Postgrest khi cập nhật feedback: ${e.message}');
      return null;
    } catch (e) {
      print('❌ Lỗi khi cập nhật feedback: $e');
      return null;
    }
  }

  // =========================================================
  // Lấy feedback của user cho một ảnh
  // =========================================================
  Future<FeedbackModel?> getFeedbackForImage(int imageId, String userId) async {
    try {
      final response = await supabase
          .from('feedbacks')
          .select()
          .eq('image_id', imageId)
          .eq('user_id', userId)
          .maybeSingle();

      if (response == null) {
        return null;
      }

      return FeedbackModel.fromJson(response as Map<String, dynamic>);
    } on PostgrestException catch (e) {
      print('❌ Lỗi Postgrest khi lấy feedback: ${e.message}');
      return null;
    } catch (e) {
      print('❌ Lỗi khi lấy feedback: $e');
      return null;
    }
  }
}
