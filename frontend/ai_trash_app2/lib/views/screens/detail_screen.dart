import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '/controllers/auth_controller.dart';
import '/controllers/feedback_controller.dart';
import '/models/feedback_model.dart';
import '/models/prediction_model.dart';
import '/constants.dart';

class DetailScreen extends StatefulWidget {
  static const routeName = '/detail';
  final int imageId;

  const DetailScreen({
    super.key,
    required this.imageId,
  });

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  final FeedbackController _feedbackController = FeedbackController();
  final AuthController _authController = AuthController();
  final TextEditingController _feedbackTextController = TextEditingController();
  
  ImageDetailResult? _imageDetailResult;
  bool _isLoading = true;
  bool _isSavingFeedback = false;

  @override
  void initState() {
    super.initState();
    _loadImageDetail();
  }

  Future<void> _loadImageDetail() async {
    setState(() {
      _isLoading = true;
    });

    final result = await _feedbackController.getImageDetail(widget.imageId);

    setState(() {
      _imageDetailResult = result;
      if (result.existingFeedback != null) {
        _feedbackTextController.text = result.existingFeedback!.comment ?? '';
      }
      _isLoading = false;
    });
  }

  Future<void> _saveFeedback() async {
    if (!_authController.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng đăng nhập để gửi feedback')),
      );
      return;
    }

    final userId = _authController.currentUser?.id;
    if (userId == null) return;

    setState(() {
      _isSavingFeedback = true;
    });

    final comment = _feedbackTextController.text.trim();
    final result = await _feedbackController.saveOrUpdateFeedback(
      imageId: widget.imageId,
      userId: userId,
      existingFeedback: _imageDetailResult?.existingFeedback,
      comment: comment.isEmpty ? null : comment,
    );

    setState(() {
      _isSavingFeedback = false;
    });

    if (result.success && result.feedback != null) {
      // Cập nhật lại image detail để lấy feedback mới
      await _loadImageDetail();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message)),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result.message)),
      );
    }
  }

  @override
  void dispose() {
    _feedbackTextController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Chi Tiết Phân Loại'),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_imageDetailResult == null || !_imageDetailResult!.success) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Chi Tiết Phân Loại'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                _imageDetailResult?.errorMessage ?? 'Không tìm thấy dữ liệu',
                style: const TextStyle(fontSize: 16, color: Colors.red),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadImageDetail,
                child: const Text('Thử lại'),
              ),
            ],
          ),
        ),
      );
    }

    final result = _imageDetailResult!;
    final fileUrl = result.fileUrl;
    final createdAt = result.createdAt;
    final predictions = result.predictions;
    final existingFeedback = result.existingFeedback;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Chi Tiết Phân Loại'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ảnh
            if (fileUrl != null)
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(15),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(15),
                  child: CachedNetworkImage(
                    imageUrl: fileUrl,
                    fit: BoxFit.cover,
                    width: double.infinity,
                    placeholder: (context, url) => Container(
                      height: 250,
                      color: Colors.grey[300],
                      child: const Center(child: CircularProgressIndicator()),
                    ),
                    errorWidget: (context, url, error) => Container(
                      height: 250,
                      color: Colors.grey[300],
                      child: const Icon(Icons.broken_image, size: 50),
                    ),
                  ),
                ),
              ),

            const SizedBox(height: 20),

            // Thông tin ngày tháng
            Row(
              children: [
                const Icon(Icons.access_time, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Text(
                  'Ngày phân loại: ${DateFormat('dd/MM/yyyy HH:mm').format(createdAt)}',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Danh sách predictions
            const Text(
              'Các loại rác được phát hiện:',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),

            if (predictions.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Text('Không có vật thể nào được phát hiện'),
                ),
              )
            else
              ...predictions.map((prediction) {
                final binColor = getBinColor(prediction.categoryName);
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: binColor,
                      child: Icon(
                        getBinIcon(prediction.categoryName),
                        color: Colors.white,
                      ),
                    ),
                    title: Text(
                      prediction.categoryName,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Độ tin cậy: ${(prediction.confidence * 100).toStringAsFixed(1)}%',
                        ),
                        const SizedBox(height: 4),
                        Text(
                          wasteBinInfo[prediction.categoryName] ?? 'Không xác định',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    trailing: Chip(
                      label: Text(
                        '${(prediction.confidence * 100).toStringAsFixed(0)}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                      backgroundColor: binColor,
                    ),
                  ),
                );
              }),

            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 20),

            // Form feedback
            const Text(
              'Feedback / Nhận xét:',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 10),

            TextField(
              controller: _feedbackTextController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Nhập nhận xét của bạn về kết quả phân loại...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                filled: true,
                fillColor: Colors.grey[100],
              ),
            ),

            const SizedBox(height: 16),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: _isSavingFeedback
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
                label: Text(existingFeedback != null ? 'Cập nhật Feedback' : 'Gửi Feedback'),
                onPressed: _isSavingFeedback ? null : _saveFeedback,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),

            if (existingFeedback != null) ...[
              const SizedBox(height: 10),
              Text(
                'Đã gửi feedback vào: ${DateFormat('dd/MM/yyyy HH:mm').format(existingFeedback.createdAt)}',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

