import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '/models/prediction_model.dart';
import '/models/feedback_model.dart';
import '/controllers/auth_controller.dart';
import '/controllers/feedback_controller.dart';
import '/services/supabase_service.dart';
import '/constants.dart'; // Import để lấy wasteBinInfo, getBinIcon, getBinColor

class ResultScreen extends StatefulWidget {
  static const routeName = '/result';

  const ResultScreen({super.key});

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final FeedbackController _feedbackController = FeedbackController();
  final AuthController _authController = AuthController();
  final SupabaseService _supabaseService = SupabaseService();
  final TextEditingController _commentController = TextEditingController();
  
  List<Map<String, dynamic>> _wasteCategories = [];
  int? _selectedCorrectedCategoryId; // Giữ lại để tương thích
  Set<int> _selectedCorrectedCategoryIds = {}; // Set để lưu nhiều loại rác đã chọn
  bool _isLoadingCategories = false;
  bool _isSavingFeedback = false;
  bool _showFeedbackForm = false;
  bool _isLoadingFeedback = false;
  FeedbackModel? _existingFeedback;

  /// Widget hiển thị ảnh với bounding boxes
  Widget _buildImageWithBBoxes(ClassificationResult result) {
    // Ưu tiên dùng original_image_base64, fallback về file_url nếu không có
    if (result.originalImageBase64 != null) {
      // Decode base64 image
      final base64String = result.originalImageBase64!.replaceFirst(
        RegExp(r'data:image/[^;]+;base64,'),
        '',
      );
      final imageBytes = base64Decode(base64String);

      return FutureBuilder<ui.Image>(
        future: _loadImageFromMemory(imageBytes),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const SizedBox(
              height: 250,
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final uiImage = snapshot.data!;
          final imageWidth = uiImage.width.toDouble();
          final imageHeight = uiImage.height.toDouble();

          return LayoutBuilder(
            builder: (context, constraints) {
              // Tính toán kích thước hiển thị
              final displayWidth = constraints.maxWidth;
              final scaleX = displayWidth / imageWidth;
              final displayHeight = imageHeight * scaleX;
              final scaleY = scaleX; // Giữ tỷ lệ

              return SizedBox(
                height: displayHeight,
                width: displayWidth,
                child: Stack(
                  children: [
                    // Hiển thị ảnh
                    Image.memory(
                      imageBytes,
                      fit: BoxFit.cover,
                      width: displayWidth,
                      height: displayHeight,
                    ),
                    // Vẽ bounding boxes
                    CustomPaint(
                      size: Size(displayWidth, displayHeight),
                      painter: BBoxPainter(
                        predictions: result.predictions,
                        scaleX: scaleX,
                        scaleY: scaleY,
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      );
    } else if (result.fileUrl != null) {
      // Dùng file_url từ Google Drive và vẽ bounding box
      return FutureBuilder<ui.Image>(
        future: _loadImageFromNetwork(result.fileUrl!),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const SizedBox(
              height: 250,
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final uiImage = snapshot.data!;
          final imageWidth = uiImage.width.toDouble();
          final imageHeight = uiImage.height.toDouble();

          return LayoutBuilder(
            builder: (context, constraints) {
              // Tính toán kích thước hiển thị
              final displayWidth = constraints.maxWidth;
              final scaleX = displayWidth / imageWidth;
              final displayHeight = imageHeight * scaleX;
              final scaleY = scaleX; // Giữ tỷ lệ

              return SizedBox(
                height: displayHeight,
                width: displayWidth,
                child: Stack(
                  children: [
                    // Hiển thị ảnh từ URL
                    ClipRRect(
                      borderRadius: BorderRadius.circular(15),
                      child: Image.network(
                        result.fileUrl!,
                        width: displayWidth,
                        height: displayHeight,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(Icons.error_outline, size: 50),
                      ),
                    ),
                    // Vẽ bounding boxes
                    CustomPaint(
                      size: Size(displayWidth, displayHeight),
                      painter: BBoxPainter(
                        predictions: result.predictions,
                        scaleX: scaleX,
                        scaleY: scaleY,
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      );
    } else {
      return const SizedBox(
        height: 250,
        child: Center(child: Icon(Icons.image_not_supported, size: 50)),
      );
    }
  }

  /// Load image từ bytes để lấy kích thước thực
  Future<ui.Image> _loadImageFromMemory(Uint8List bytes) async {
    final codec = await ui.instantiateImageCodec(bytes);
    final frame = await codec.getNextFrame();
    return frame.image;
  }

  /// Load image từ network URL để lấy kích thước thực
  Future<ui.Image> _loadImageFromNetwork(String url) async {
    final response = await http.get(Uri.parse(url));
    if (response.statusCode == 200) {
      final bytes = response.bodyBytes;
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      return frame.image;
    } else {
      throw Exception('Failed to load image from URL: ${response.statusCode}');
    }
  }

  /// Widget xây dựng từng ý hướng dẫn (không khung, chỉ có icon và text)
  /// CẬP NHẬT: Nhận thêm 'binColor' để tô màu Icon theo loại rác
  Widget _buildGuidelineCard(
    BuildContext context,
    String guideline,
    Color binColor,
  ) {
    // Màu chữ xanh đậm, kết hợp primaryColor với màu đen 54% opacity (giữ nguyên màu chữ)
    final primaryColor = Theme.of(context).primaryColor;
    final darkGreen = Color.alphaBlend(Colors.black54, primaryColor);

    return Padding(
      // Thêm Padding dọc để tạo khoảng cách giữa các mục
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2.0),
            child: Icon(
              Icons.check_circle_outline, // Icon outline hiện đại hơn
              color: binColor, // Dùng MÀU THÙNG RÁC cho Icon
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              guideline,
              style: TextStyle(
                fontSize: 15,
                height: 1.4,
                color: darkGreen, // Màu chữ xanh đậm
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Widget xây dựng khu vực hướng dẫn cho MỘT loại rác cụ thể
  Widget _buildCategorySection(
    BuildContext context,
    String category,
    List<String> guidelines,
  ) {
    final darkGreenHeader = const Color(0xFF1B5E20);
    final binInfo = wasteBinInfo[category] ?? wasteBinInfo["Hỗn hợp"]!;
    final binColor = getBinColor(category); // Lấy màu thùng rác

    return Padding(
      padding: const EdgeInsets.only(top: 10.0), // Khoảng cách giữa các section
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // TIÊU ĐỀ KHUNG (Tên loại rác)
          Row(
            children: [
              Icon(
                getBinIcon(category),
                color: binColor,
                size: 24,
              ), // Icon màu thùng rác
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  'Phân loại Rác ${category.toUpperCase()}: ${binInfo}',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: darkGreenHeader,
                  ),
                ),
              ),
            ],
          ),

          // Danh sách hướng dẫn chi tiết (các _buildGuidelineCard)
          Padding(
            padding: const EdgeInsets.only(
              left: 5.0,
              top: 5.0,
            ), // Thụt đầu dòng cho danh sách hướng dẫn
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: guidelines
                  // TRUYỀN MÀU THÙNG RÁC VÀO _buildGuidelineCard
                  .map(
                    (guideline) =>
                        _buildGuidelineCard(context, guideline, binColor),
                  )
                  .toList(),
            ),
          ),

          // Đường phân cách giữa các loại rác
          const SizedBox(height: 10),
          Divider(height: 1, thickness: 1, color: Colors.grey[300]),
        ],
      ),
    );
  }

  @override
  void initState() {
    super.initState();
    _loadWasteCategories();
    // Load existing feedback nếu có (sau khi build để có context)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadExistingFeedback();
    });
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _loadWasteCategories() async {
    setState(() {
      _isLoadingCategories = true;
    });

    try {
      final categories = await _supabaseService.getWasteCategories();
      setState(() {
        _wasteCategories = categories;
        _isLoadingCategories = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingCategories = false;
      });
    }
  }

  Future<void> _loadExistingFeedback() async {
    if (!_authController.isAuthenticated) return;
    
    final result = ModalRoute.of(context)?.settings.arguments as ClassificationResult?;
    if (result?.imageId == null) return;

    setState(() {
      _isLoadingFeedback = true;
    });

    try {
      final imageDetail = await _feedbackController.getImageDetail(result!.imageId!);
      if (imageDetail.success && imageDetail.existingFeedback != null) {
        setState(() {
          _existingFeedback = imageDetail.existingFeedback;
          _commentController.text = _existingFeedback!.comment ?? '';
          _selectedCorrectedCategoryId = _existingFeedback!.correctedCategoryId;
          // Load nhiều loại rác đã chọn
          if (_existingFeedback!.correctedCategoryIds != null) {
            _selectedCorrectedCategoryIds = _existingFeedback!.correctedCategoryIds!.toSet();
          } else if (_existingFeedback!.correctedCategoryId != null) {
            _selectedCorrectedCategoryIds = {_existingFeedback!.correctedCategoryId!};
          }
        });
      }
    } catch (e) {
      // Ignore errors when loading feedback
    } finally {
      setState(() {
        _isLoadingFeedback = false;
      });
    }
  }

  Future<void> _saveFeedback(ClassificationResult result) async {
    if (!_authController.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng đăng nhập để gửi feedback')),
      );
      return;
    }

    if (result.imageId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không tìm thấy thông tin ảnh. Vui lòng thử lại.')),
      );
      return;
    }

    final userId = _authController.currentUser?.id;
    if (userId == null) return;

    setState(() {
      _isSavingFeedback = true;
    });

    final comment = _commentController.text.trim();
    final feedbackResult = await _feedbackController.saveOrUpdateFeedback(
      imageId: result.imageId!,
      userId: userId,
      existingFeedback: _existingFeedback,
      comment: comment.isEmpty ? null : comment,
      correctedCategoryId: _selectedCorrectedCategoryId,
    );

    setState(() {
      _isSavingFeedback = false;
    });

    if (feedbackResult.success && feedbackResult.feedback != null) {
      setState(() {
        _existingFeedback = feedbackResult.feedback;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(feedbackResult.message),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(feedbackResult.message),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Lấy ClassificationResult từ arguments
    final result =
        ModalRoute.of(context)!.settings.arguments as ClassificationResult;

    // 1. Lấy danh sách các loại rác duy nhất
    final uniqueCategories = result.predictions
        .map((p) => p.categoryName)
        .toSet()
        .toList();

    // 2. Nhóm các hướng dẫn (guidelines) theo loại rác
    final Map<String, List<String>> guidelinesByCategory = {};
    for (var prediction in result.predictions) {
      final category = prediction.categoryName;

      if (!guidelinesByCategory.containsKey(category)) {
        guidelinesByCategory[category] = [];
      }
      // Dùng Set để đảm bảo hướng dẫn không bị lặp lại trong cùng 1 loại rác
      final currentGuidelines = guidelinesByCategory[category]!.toSet();
      currentGuidelines.addAll(prediction.guidelines);
      guidelinesByCategory[category] = currentGuidelines.toList();
    }

    // Màu xanh đậm được sử dụng cho tiêu đề chính (giữ màu cũ để tạo độ nổi bật)
    final darkGreenHeader = const Color(0xFF1B5E20);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Kết Quả Phân Loại',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Colors.white,
        foregroundColor: Theme.of(context).primaryColor,
        elevation: 1,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            // Khu vực Ảnh và Tóm tắt
            Card(
              elevation: 8,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              child: Padding(
                padding: const EdgeInsets.all(15.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Ảnh với bounding boxes
                    ClipRRect(
                      borderRadius: BorderRadius.circular(15),
                      child: _buildImageWithBBoxes(result),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Vật phẩm được phát hiện:',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: darkGreenHeader, // Màu xanh đậm cho title
                      ),
                    ),
                    const SizedBox(height: 10),
                    // HIỂN THỊ CHIP VỚI THÔNG TIN THÙNG RÁC (Đã có màu theo loại rác)
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: uniqueCategories.map((category) {
                        final binInfo =
                            wasteBinInfo[category] ?? wasteBinInfo["Hỗn hợp"]!;

                        return Chip(
                          // CẬP NHẬT: Sử dụng hàm getBinIcon để lấy biểu tượng thùng rác cụ thể
                          avatar: Icon(
                            getBinIcon(category),
                            color: Colors.white,
                            size: 18,
                          ),
                          label: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                category,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                binInfo,
                                style: const TextStyle(
                                  color: Colors.white70,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          // SỬ DỤNG MÀU THÙNG RÁC CHO BACKGROUND
                          backgroundColor: getBinColor(category),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 30),

            // Khu vực Hướng dẫn Chi tiết (ĐÃ NHÓM THEO LOẠI RÁC)
            Text(
              'Hướng Dẫn Phân Loại Chi Tiết Theo Loại Rác',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: darkGreenHeader, // Màu xanh đậm cho title
              ),
            ),
            const SizedBox(height: 5),

            // LẶP QUA TỪNG LOẠI RÁC VÀ HIỂN THỊ KHUNG RIÊNG (Đã có màu thùng rác)
            ...guidelinesByCategory.entries.map((entry) {
              final category = entry.key;
              final guidelines = entry.value;

              return _buildCategorySection(context, category, guidelines);
            }).toList(),

            const SizedBox(height: 20),
            Center(
              child: Text(
                'Tổng cộng ${result.predictions.length} vật thể được phát hiện, thuộc ${uniqueCategories.length} loại rác.',
                style: const TextStyle(
                  fontStyle: FontStyle.italic,
                  color: Colors.grey,
                ),
              ),
            ),
            const SizedBox(height: 30),
            const Divider(),
            const SizedBox(height: 20),

            // Khu vực Feedback
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Đánh Giá Kết Quả Phân Loại',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1B5E20),
                        ),
                      ),
                      if (_existingFeedback != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Đã có feedback',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.green[700],
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                TextButton.icon(
                  icon: Icon(_showFeedbackForm ? Icons.expand_less : Icons.expand_more),
                  label: Text(_showFeedbackForm ? 'Ẩn' : 'Đánh giá'),
                  onPressed: () {
                    setState(() {
                      _showFeedbackForm = !_showFeedbackForm;
                    });
                  },
                ),
              ],
            ),

            if (_showFeedbackForm) ...[
              const SizedBox(height: 16),
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Checkbox list chọn nhiều loại rác đúng
                      const Text(
                        'Loại rác đúng (có thể chọn nhiều loại):',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _isLoadingCategories
                          ? const Center(child: CircularProgressIndicator())
                          : Container(
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.grey[300]!),
                                borderRadius: BorderRadius.circular(10),
                                color: Colors.grey[50],
                              ),
                              constraints: const BoxConstraints(maxHeight: 200),
                              child: ListView.builder(
                                shrinkWrap: true,
                                itemCount: _wasteCategories.length,
                                itemBuilder: (context, index) {
                                  final category = _wasteCategories[index];
                                  final categoryId = category['category_id'] as int;
                                  final categoryName = category['name'] as String;
                                  final isSelected = _selectedCorrectedCategoryIds.contains(categoryId);

                                  return CheckboxListTile(
                                    value: isSelected,
                                    onChanged: (bool? value) {
                                      setState(() {
                                        if (value == true) {
                                          _selectedCorrectedCategoryIds.add(categoryId);
                                        } else {
                                          _selectedCorrectedCategoryIds.remove(categoryId);
                                        }
                                        // Cập nhật _selectedCorrectedCategoryId để tương thích
                                        _selectedCorrectedCategoryId = _selectedCorrectedCategoryIds.isNotEmpty
                                            ? _selectedCorrectedCategoryIds.first
                                            : null;
                                      });
                                    },
                                    title: Row(
                                      children: [
                                        Icon(
                                          getBinIcon(categoryName),
                                          color: getBinColor(categoryName),
                                          size: 20,
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          categoryName,
                                          style: TextStyle(
                                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                          ),
                                        ),
                                      ],
                                    ),
                                    activeColor: getBinColor(categoryName),
                                    dense: true,
                                  );
                                },
                              ),
                            ),
                      if (_selectedCorrectedCategoryIds.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _selectedCorrectedCategoryIds.map((categoryId) {
                            final category = _wasteCategories.firstWhere(
                              (c) => c['category_id'] == categoryId,
                              orElse: () => {'name': 'Unknown'},
                            );
                            final categoryName = category['name'] as String;
                            return Chip(
                              avatar: Icon(
                                getBinIcon(categoryName),
                                color: Colors.white,
                                size: 16,
                              ),
                              label: Text(categoryName),
                              backgroundColor: getBinColor(categoryName),
                              deleteIcon: const Icon(Icons.close, size: 18, color: Colors.white),
                              onDeleted: () {
                                setState(() {
                                  _selectedCorrectedCategoryIds.remove(categoryId);
                                  _selectedCorrectedCategoryId = _selectedCorrectedCategoryIds.isNotEmpty
                                      ? _selectedCorrectedCategoryIds.first
                                      : null;
                                });
                              },
                            );
                          }).toList(),
                        ),
                      ],
                      const SizedBox(height: 20),
                      // TextField cho comment
                      const Text(
                        'Nhận xét / Feedback:',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _commentController,
                        maxLines: 4,
                        decoration: InputDecoration(
                          hintText: 'Nhập nhận xét của bạn về kết quả phân loại...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          filled: true,
                          fillColor: Colors.grey[50],
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Nút gửi feedback
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          icon: _isSavingFeedback
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.send),
                          label: Text(_isSavingFeedback 
                              ? 'Đang gửi...' 
                              : (_existingFeedback != null ? 'Cập nhật Feedback' : 'Gửi Feedback')),
                          onPressed: _isSavingFeedback ? null : () => _saveFeedback(result),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            backgroundColor: Theme.of(context).primaryColor,
                            foregroundColor: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Feedback giúp cải thiện độ chính xác của hệ thống',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[600],
                          fontStyle: FontStyle.italic,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ],

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}

/// CustomPainter để vẽ bounding boxes lên ảnh
class BBoxPainter extends CustomPainter {
  final List<Prediction> predictions;
  final double scaleX;
  final double scaleY;

  BBoxPainter({
    required this.predictions,
    required this.scaleX,
    required this.scaleY,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (var prediction in predictions) {
      if (prediction.bbox.length < 4) continue;

      // Lấy tọa độ bbox từ backend: [x1, y1, x2, y2]
      final x1 = prediction.bbox[0] * scaleX;
      final y1 = prediction.bbox[1] * scaleY;
      final x2 = prediction.bbox[2] * scaleX;
      final y2 = prediction.bbox[3] * scaleY;

      // Lấy màu theo loại rác
      final color = getBinColor(prediction.categoryName);

      // Vẽ rectangle
      final paint = Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0;

      final rect = Rect.fromLTRB(x1, y1, x2, y2);
      canvas.drawRect(rect, paint);

      // Vẽ label với background
      final labelText = '${prediction.categoryName} (${(prediction.confidence * 100).toStringAsFixed(0)}%)';
      final textSpan = TextSpan(
        text: labelText,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      );

      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      );
      textPainter.layout();

      // Vẽ background rectangle cho text
      final labelRect = Rect.fromLTWH(
        x1,
        y1 - textPainter.height - 4,
        textPainter.width + 8,
        textPainter.height + 4,
      );
      final labelPaint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;
      canvas.drawRect(labelRect, labelPaint);

      // Vẽ text
      textPainter.paint(canvas, Offset(x1 + 4, y1 - textPainter.height));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
