import '/constants.dart'; // Đảm bảo import constants

class HistoryEntry {
  final int imageId;
  final String fileUrl; // URL ảnh từ Google Drive
  final String status;
  final DateTime createdAt;
  final List<String> categories; // Các loại rác phát hiện

  HistoryEntry({
    required this.imageId,
    required this.fileUrl,
    required this.status,
    required this.createdAt,
    required this.categories,
  });

  factory HistoryEntry.fromJson(Map<String, dynamic> json) {
    // Lấy danh sách các category từ mảng predictions
    final List<dynamic>? predictions = json['predictions'];

    // Sử dụng Set để đảm bảo các tên category là duy nhất
    final Set<String> categorySet = {};
    if (predictions != null && predictions.isNotEmpty) {
      for (var p in predictions) {
        // Lấy tên category từ nested object waste_categories
        // Cấu trúc: predictions -> waste_categories -> name
        final wasteCategory = p['waste_categories'];
        final categoryName = (wasteCategory?['name'] as String?)?.trim();
        
        if (categoryName != null && categoryName.isNotEmpty) {
          // Thêm tất cả category, không cần kiểm tra wasteBinInfo
          categorySet.add(categoryName);
        }
      }
    }

    // Nếu không có category nào, thêm "Không xác định"
    List<String> categories = categorySet.toList();
    if (categories.isEmpty) {
      categories.add('Không xác định');
    }

    // Sort categories theo thứ tự Alphabetical cho hiển thị nhất quán
    categories.sort();

    // Parse created_at - có thể là String hoặc DateTime
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

    return HistoryEntry(
      imageId: json['image_id'] as int,
      // file_path là URL công khai từ Google Drive
      fileUrl: json['file_path'] as String? ??
          'https://placehold.co/600x400/E57373/FFFFFF?text=No+Image',
      status: json['status'] as String? ?? 'done',
      createdAt: createdAt,
      categories: categories,
    );
  }
}
