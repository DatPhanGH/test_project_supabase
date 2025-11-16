import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'dart:ui' as ui;
import '/services/api_service.dart';
import '/models/prediction_model.dart';

class CameraRealtimeScreen extends StatefulWidget {
  static const String routeName = '/camera-realtime';

  @override
  _CameraRealtimeScreenState createState() => _CameraRealtimeScreenState();
}

class _CameraRealtimeScreenState extends State<CameraRealtimeScreen> {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isProcessing = false;
  Timer? _frameTimer;
  List<Prediction> _currentPredictions = [];
  final ApiService _apiService = ApiService();
  bool _isAutoScan = false;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras != null && _cameras!.isNotEmpty) {
        _controller = CameraController(
          _cameras![0],
          ResolutionPreset.medium, // Medium để tăng tốc độ
          enableAudio: false,
        );
        await _controller!.initialize();
        setState(() {});
      }
    } catch (e) {
      print('❌ Lỗi khởi tạo camera: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể khởi tạo camera: $e')),
        );
      }
    }
  }

  void _toggleAutoScan() {
    setState(() {
      _isAutoScan = !_isAutoScan;
    });

    if (_isAutoScan) {
      // Bắt đầu auto scan mỗi 2 giây
      _frameTimer = Timer.periodic(Duration(seconds: 2), (timer) async {
        if (!_isProcessing && _controller != null && _controller!.value.isInitialized) {
          await _captureAndProcessFrame();
        }
      });
    } else {
      // Dừng auto scan
      _frameTimer?.cancel();
      _frameTimer = null;
    }
  }

  Future<void> _captureAndProcessFrame() async {
    if (_controller == null || !_controller!.value.isInitialized || _isProcessing) {
      return;
    }

    setState(() => _isProcessing = true);

    try {
      // Capture frame
      final XFile image = await _controller!.takePicture();
      
      // Gọi API test (không lưu vào Supabase)
      final result = await _apiService.testClassifyImage(File(image.path));
      
      setState(() {
        _currentPredictions = result.predictions;
      });

      // Xóa file tạm sau khi xử lý
      try {
        await File(image.path).delete();
      } catch (e) {
        print('⚠️ Không thể xóa file tạm: $e');
      }
    } catch (e) {
      print('❌ Lỗi xử lý frame: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi: ${e.toString()}'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } finally {
      setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return Scaffold(
        appBar: AppBar(
          title: Text('Quét Real-time'),
          backgroundColor: Colors.green,
        ),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final size = MediaQuery.of(context).size;
    final cameraSize = _controller!.value.previewSize!;
    final aspectRatio = _controller!.value.aspectRatio;
    final screenAspectRatio = size.width / size.height;
    
    // Tính toán kích thước camera preview vừa phải (80% màn hình)
    final previewWidth = size.width * 0.8;
    final previewHeight = previewWidth / aspectRatio;
    
    // Nếu chiều cao vượt quá 70% màn hình, điều chỉnh lại
    final maxHeight = size.height * 0.7;
    final finalPreviewHeight = previewHeight > maxHeight ? maxHeight : previewHeight;
    final finalPreviewWidth = finalPreviewHeight * aspectRatio;
    
    // Scale để map tọa độ bounding boxes
    final scaleX = finalPreviewWidth / cameraSize.width;
    final scaleY = finalPreviewHeight / cameraSize.height;

    return Scaffold(
      appBar: AppBar(
        title: Text('Quét Real-time (Test)'),
        backgroundColor: Colors.green,
      ),
      body: Stack(
        children: [
          // Camera preview - kích thước vừa phải
          Positioned.fill(
            child: Center(
              child: SizedBox(
                width: finalPreviewWidth,
                height: finalPreviewHeight,
                child: AspectRatio(
                  aspectRatio: aspectRatio,
                  child: CameraPreview(_controller!),
                ),
              ),
            ),
          ),

          // Vẽ bounding boxes - Đã tắt
          // if (_currentPredictions.isNotEmpty)
          //   Positioned.fill(
          //     child: CustomPaint(
          //       painter: BBoxPainter(
          //         predictions: _currentPredictions,
          //         scaleX: scaleX,
          //         scaleY: scaleY,
          //         imageWidth: cameraSize.width,
          //         imageHeight: cameraSize.height,
          //       ),
          //     ),
          //   ),

          // UI overlay
          Positioned(
            bottom: 30,
            left: 0,
            right: 0,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Thông tin predictions
                if (_currentPredictions.isNotEmpty)
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: _currentPredictions.map((pred) {
                        return Padding(
                          padding: EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            children: [
                              Icon(Icons.recycling, color: Colors.green, size: 16),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  '${pred.categoryName} (${(pred.confidence * 100).toStringAsFixed(1)}%)',
                                  style: TextStyle(color: Colors.white, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                // Nút bắt đầu/dừng quét tự động với loading indicator cố định
                Stack(
                  alignment: Alignment.center,
                  clipBehavior: Clip.none,
                  children: [
                    // Nút bắt đầu/dừng - luôn ở giữa, không dịch chuyển
                    FloatingActionButton(
                      onPressed: _isProcessing ? null : _toggleAutoScan,
                      backgroundColor: _isAutoScan ? Colors.red : Colors.green,
                      child: Icon(_isAutoScan ? Icons.pause : Icons.play_arrow),
                      tooltip: _isAutoScan ? 'Dừng quét tự động' : 'Bắt đầu quét tự động',
                    ),
                    // Loading indicator - cố định bên trái nút, không làm dịch chuyển nút
                    if (_isProcessing)
                      Positioned(
                        left: -60,
                        child: Container(
                          padding: EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.black54,
                            shape: BoxShape.circle,
                          ),
                          child: SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _frameTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }
}

// CustomPainter để vẽ bounding boxes
class BBoxPainter extends CustomPainter {
  final List<Prediction> predictions;
  final double scaleX;
  final double scaleY;
  final double imageWidth;
  final double imageHeight;

  BBoxPainter({
    required this.predictions,
    required this.scaleX,
    required this.scaleY,
    required this.imageWidth,
    required this.imageHeight,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (var pred in predictions) {
      if (pred.bbox.length >= 4) {
        // Bbox format: [x1, y1, x2, y2]
        final x1 = pred.bbox[0];
        final y1 = pred.bbox[1];
        final x2 = pred.bbox[2];
        final y2 = pred.bbox[3];
        
        // Tính toán tọa độ trên màn hình
        // Camera preview có thể bị xoay, cần điều chỉnh tọa độ
        final left = x1 * scaleX;
        final top = y1 * scaleY;
        final right = x2 * scaleX;
        final bottom = y2 * scaleY;

        // Vẽ bounding box
        final paint = Paint()
          ..color = Colors.green
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3;

        canvas.drawRect(
          Rect.fromLTRB(left, top, right, bottom),
          paint,
        );

        // Vẽ background cho label
        final textPainter = TextPainter(
          text: TextSpan(
            text: '${pred.categoryName} (${(pred.confidence * 100).toStringAsFixed(1)}%)',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          textDirection: TextDirection.ltr,
        );
        textPainter.layout();
        
        // Vẽ background đen cho text
        final bgPaint = Paint()
          ..color = Colors.black54
          ..style = PaintingStyle.fill;
        canvas.drawRect(
          Rect.fromLTWH(left, top - 25, textPainter.width + 8, 20),
          bgPaint,
        );
        
        textPainter.paint(canvas, Offset(left + 4, top - 22));
      }
    }
  }

  @override
  bool shouldRepaint(BBoxPainter oldDelegate) {
    return oldDelegate.predictions != predictions;
  }
}

