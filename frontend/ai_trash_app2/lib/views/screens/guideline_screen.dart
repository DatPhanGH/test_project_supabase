import 'package:flutter/material.dart';
import '/constants.dart'; // RẤT QUAN TRỌNG: Cần import để dùng getBinIcon và getBinColor

class GuidelineScreen extends StatelessWidget {
  const GuidelineScreen({super.key});

  // ... (Các hàm _getCategoryIcon và _getCategoryColor giữ nguyên) ...

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'Nhựa':
        return Icons.local_drink;
      case 'Giấy':
        return Icons.description;
      case 'Kim loại':
        return Icons.hardware;
      case 'Thủy tinh':
        return Icons.wine_bar;
      case 'Hữu cơ':
        return Icons.eco;
      default:
        return Icons.category;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'Nhựa':
        return Colors.blueAccent;
      case 'Giấy':
        return Colors.brown;
      case 'Kim loại':
        return Colors.grey;
      case 'Thủy tinh':
        return Colors.green.shade800;
      case 'Hữu cơ':
        return Colors.deepOrange;
      default:
        return Colors.black;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Hướng Dẫn Phân Loại Rác',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20.0),
        // Giả định wasteGuidelines là một Map<String, List<String>> được định nghĩa trong constants.dart
        children: wasteGuidelines.entries.map((entry) {
          final category = entry.key;
          final guidelines = entry.value;

          final categoryColor = _getCategoryColor(category);
          final binColor = getBinColor(category); // Lấy màu từ constants
          final binName = category;

          return Card(
            margin: const EdgeInsets.only(bottom: 15),
            elevation: 4,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: ExpansionTile(
              leading: Icon(_getCategoryIcon(category), color: categoryColor),
              title: Text(
                category,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: categoryColor,
                ),
              ),
              children: [
                // 1. DÒNG THÔNG TIN PHÂN LOẠI IN MÀU VÀ ICON THÙNG RÁC
                Padding(
                  padding: const EdgeInsets.only(
                    left: 20,
                    right: 20,
                    top: 10,
                    bottom: 10,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.info_outline, color: binColor, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: RichText(
                          text: TextSpan(
                            text: 'Thuộc loại rác ',
                            style: const TextStyle(
                              fontSize: 15,
                              color: Colors.black87,
                              height: 1.4,
                            ), // Thêm height
                            children: <InlineSpan>[
                              // Sử dụng InlineSpan thay vì TextSpan để chứa WidgetSpan
                              TextSpan(
                                text: binName.toUpperCase(),
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: binColor,
                                ),
                              ),
                              const TextSpan(text: ', bỏ vào thùng '),
                              // ICON THÙNG RÁC IN MÀU
                              WidgetSpan(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 2.0,
                                  ),
                                  child: Icon(
                                    getBinIcon(category), // Lấy icon thùng rác
                                    color: binColor, // In màu thùng rác
                                    size: 18,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // 2. DANH SÁCH HƯỚNG DẪN CHI TIẾT
                // ... (phần guidelines map giữ nguyên) ...
                ...guidelines
                    .map(
                      (guideline) => Padding(
                        padding: const EdgeInsets.only(
                          left: 20,
                          right: 20,
                          top: 10,
                          bottom: 10,
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '• ',
                              style: TextStyle(
                                fontSize: 16,
                                color: Colors.grey,
                              ),
                            ),
                            Expanded(
                              child: Text(
                                guideline,
                                style: const TextStyle(
                                  fontSize: 15,
                                  height: 1.5,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                    .toList(),
                const SizedBox(height: 5),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}
