// prediction_model.dart

import 'dart:math';
import '/constants.dart'; // Chứa wasteGuidelines

// Map giả lập ID cho các loại rác (Trong thực tế sẽ dùng Supabase/Backend)
const Map<String, int> _categoryMap = {
  "Nhựa": 1,
  "Giấy": 2,
  "Kim loại": 3,
  "Thủy tinh": 4,
  "Hữu cơ": 5,
  "Nguy hại": 6,
  "Hỗn hợp": 7,
};

// Map giả lập tên vật phẩm (label) cho mục đích mocking
const Map<String, List<String>> _mockItemLabels = {
  "Nhựa": ["Chai PET", "Túi ni lông", "Hộp đựng thức ăn", "Ly nhựa"],
  "Giấy": ["Thùng carton", "Báo cũ", "Giấy in", "Hộp pizza sạch"],
  "Kim loại": ["Lon nhôm", "Vỏ hộp sữa kim loại", "Dây cáp hỏng"],
  "Thủy tinh": ["Chai rượu", "Lọ mứt", "Bình hoa vỡ"],
  "Hữu cơ": ["Vỏ chuối", "Bã cà phê", "Thức ăn thừa", "Lá cây khô"],
  "Nguy hại": [
    "Pin đã qua sử dụng",
    "Bóng đèn huỳnh quang",
    "Kim tiêm (giả lập)",
  ],
  "Hỗn hợp": ["Giày cũ", "Bao bì phức hợp", "Khẩu trang đã dùng"],
};

// ==========================================================
// 1. Model cho kết quả dự đoán của từng vật thể trong ảnh
// ==========================================================
class Prediction {
  final int categoryId;
  final String categoryName; // Tên danh mục (ví dụ: Nhựa, Giấy)
  final double confidence;
  final List<double> bbox; // Bounding box [x1, y1, x2, y2]
  final List<String> guidelines;
  final String label; // Tên vật phẩm được nhận diện (vd: "Chai PET")

  Prediction({
    required this.categoryId,
    required this.categoryName,
    required this.confidence,
    required this.bbox,
    required this.guidelines,
    required this.label,
  });

  // --- Factory constructor từ JSON (dùng cho API thật) ---
  factory Prediction.fromJson(Map<String, dynamic> json) {
    // Backend đã trả về category_name, không cần map từ category_id nữa
    final categoryName = json['category_name'] as String? ?? 'Không xác định';

    final guidelines =
        wasteGuidelines[categoryName] ?? wasteGuidelines["Hỗn hợp"]!;

    // Parse bbox từ backend: [x1, y1, x2, y2]
    List<double> bbox = [];
    if (json['bbox'] != null) {
      bbox = List<double>.from(json['bbox']);
    }

    return Prediction(
      categoryId: json['category_id'] as int,
      categoryName: categoryName,
      confidence: (json['confidence'] as num).toDouble(),
      bbox: bbox,
      guidelines: guidelines,
      label: json['label'] as String? ?? categoryName,
    );
  }

  // --- Factory constructor TẠO DỮ LIỆU GIẢ LẬP NGẪU NHIÊN ---
  factory Prediction.random(String categoryName) {
    final random = Random();

    // Lấy ID từ map giả lập
    final categoryId = _categoryMap[categoryName] ?? 7;

    // Lấy tên vật phẩm (label) ngẫu nhiên
    final itemLabels = _mockItemLabels[categoryName] ?? [categoryName];
    final label = itemLabels[random.nextInt(itemLabels.length)];

    // Giả lập độ tin cậy cao
    final confidence = 0.85 + random.nextDouble() * 0.1; // 85% - 95%

    // Lấy hướng dẫn từ Constants
    final guidelines =
        wasteGuidelines[categoryName] ?? wasteGuidelines["Hỗn hợp"]!;

    // Giả lập Bounding Box (chỉ là giá trị ngẫu nhiên, không quan trọng cho UI)
    final bbox = [
      random.nextDouble() * 100,
      random.nextDouble() * 100,
      100 + random.nextDouble() * 100,
      100 + random.nextDouble() * 100,
    ];

    return Prediction(
      categoryId: categoryId,
      categoryName: categoryName,
      confidence: confidence,
      bbox: bbox,
      guidelines: guidelines,
      label: label,
    );
  }
}

// ==========================================================
// 2. Model cho phản hồi tổng thể từ API phân loại
// ==========================================================
class ClassificationResult {
  final int? imageId; // ID của ảnh trong database (để lưu feedback)
  final String? fileUrl; // URL ảnh đã upload lên Google Drive (cho lịch sử)
  final String? originalImageBase64; // Ảnh gốc dạng base64 để hiển thị và vẽ bbox
  final List<Prediction> predictions;
  final DateTime timestamp;

  ClassificationResult({
    this.imageId,
    this.fileUrl,
    this.originalImageBase64,
    required this.predictions,
    required this.timestamp,
  });

  // --- Factory constructor từ JSON (dùng cho API thật) ---
  factory ClassificationResult.fromJson(Map<String, dynamic> json) {
    List<dynamic> predictionsJson = json['predictions'] as List<dynamic>? ?? [];

    // Backend đã trả về category_name trong mỗi prediction, không cần map nữa
    List<Prediction> predictions = predictionsJson.map((p) {
      return Prediction.fromJson(p as Map<String, dynamic>);
    }).toList();

    return ClassificationResult(
      imageId: json['image_id'] as int?,
      fileUrl: json['file_url'] as String?,
      originalImageBase64: json['original_image_base64'] as String?,
      predictions: predictions,
      timestamp: DateTime.now(),
    );
  }

  // --- Hàm tạo kết quả GIẢ LẬP NGẪU NHIÊN (sử dụng trong HomeScreen) ---
  static ClassificationResult createMockResult(String imagePath) {
    final random = Random();

    // Loại bỏ "Nguy hại" và "Hỗn hợp" khỏi danh sách chọn ngẫu nhiên các loại rác chính
    final allCategories = wasteGuidelines.keys
        .where((k) => k != "Nguy hại" && k != "Hỗn hợp")
        .toList();

    // Ngẫu nhiên chọn số lượng loại rác (từ 1 đến 4)
    final numCategories = random.nextInt(4) + 1;

    final selectedCategories = <String>{};
    while (selectedCategories.length < numCategories) {
      selectedCategories.add(
        allCategories[random.nextInt(allCategories.length)],
      );
    }

    // Tỉ lệ nhỏ thêm rác Nguy hại hoặc Hỗn hợp
    if (random.nextDouble() < 0.15) selectedCategories.add("Nguy hại");
    if (random.nextDouble() < 0.25) selectedCategories.add("Hỗn hợp");

    final List<Prediction> mockPredictions = [];

    // Với mỗi loại rác đã chọn, tạo ngẫu nhiên từ 1 đến 3 vật phẩm
    selectedCategories.forEach((category) {
      final numItems = random.nextInt(3) + 1; // 1 đến 3 vật phẩm
      for (int i = 0; i < numItems; i++) {
        mockPredictions.add(Prediction.random(category));
      }
    });

    return ClassificationResult(
      // Chuyển đường dẫn File path thành URL để tương thích với CachedNetworkImage
      fileUrl: 'file://$imagePath',
      predictions: mockPredictions,
      timestamp: DateTime.now(),
    );
  }
}
