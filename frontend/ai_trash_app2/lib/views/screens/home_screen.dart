import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '/controllers/auth_controller.dart';
import '/services/api_service.dart';
import '/models/prediction_model.dart';
import '/views/screens/result_screen.dart';
import '/views/screens/camera_realtime_screen.dart';
import '/views/widgets/app_drawer.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  final AuthController _authController = AuthController();
  File? _pickedImage;
  bool _isLoading = false;

  // --- HÀM CHỌN ẢNH ---
  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(
        source: source,
        imageQuality: 85, // Giảm chất lượng để giảm kích thước file
        maxWidth: 1920, // Giới hạn kích thước
        maxHeight: 1920,
      );

      if (pickedFile != null) {
        setState(() {
          _pickedImage = File(pickedFile.path);
        });
      }
    } catch (e) {
      // Xử lý lỗi khi chọn ảnh (ví dụ: permission denied)
      if (mounted) {
        String errorMessage = 'Không thể chọn ảnh. ';
        if (e.toString().contains('permission') || 
            e.toString().contains('Permission')) {
          errorMessage += 'Vui lòng cấp quyền truy cập camera/thư viện ảnh.';
        } else {
          errorMessage += e.toString();
        }
        _showErrorDialog(errorMessage);
      }
    }
  }

  // --- HÀM PHÂN LOẠI ẢNH ---
  Future<void> _classifyImage() async {
    // Kiểm tra authentication
    if (!_authController.isAuthenticated) {
      _showErrorDialog(
        'Bạn cần đăng nhập để sử dụng tính năng này.',
        onOk: () {
          Navigator.of(context).pushReplacementNamed('/auth');
        },
      );
      return;
    }

    if (_pickedImage == null) {
      _showErrorDialog('Vui lòng chọn hoặc chụp ảnh rác trước!');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      // Gọi API thật để phân loại ảnh
      final result = await _apiService.classifyImage(_pickedImage!);

      // Kiểm tra xem có predictions không
      if (!mounted) return;

      if (result.predictions.isEmpty) {
        // Không phát hiện vật thể nào
        _showInfoDialog(
          'Không phát hiện vật thể',
          'Không tìm thấy vật thể nào trong ảnh. Vui lòng thử lại với ảnh khác.',
        );
      } else {
        // Chuyển sang màn hình kết quả
        Navigator.of(context)
            .pushNamed(ResultScreen.routeName, arguments: result)
            .then((_) {
          // Reset trạng thái sau khi quay lại từ màn hình kết quả
          if (mounted) {
            setState(() {
              _pickedImage = null;
            });
          }
        });
      }
    } catch (e) {
      if (!mounted) return;
      
      // Tắt loading ngay khi có lỗi
      setState(() {
        _isLoading = false;
      });
      
      String errorMessage = e.toString().replaceAll('Exception: ', '');
      final lowerMessage = errorMessage.toLowerCase();
      
      // Xử lý các loại lỗi khác nhau
      if (lowerMessage.contains('chưa đăng nhập') ||
          lowerMessage.contains('hết hạn') ||
          lowerMessage.contains('không hợp lệ')) {
        _showErrorDialog(
          errorMessage,
          onOk: () {
            Navigator.of(context).pushReplacementNamed('/auth');
          },
        );
      } else if (lowerMessage.contains('hệ thống đang bảo trì') ||
                 lowerMessage.contains('bảo trì') ||
                 lowerMessage.contains('connection refused') ||
                 lowerMessage.contains('socketexception') ||
                 lowerMessage.contains('failed host lookup') ||
                 lowerMessage.contains('network is unreachable')) {
        // Backend không chạy - hiển thị thông báo bảo trì
        _showMaintenanceDialog();
      } else if (lowerMessage.contains('timeout') || 
                 lowerMessage.contains('đang xử lý')) {
        // Timeout hoặc đang xử lý - có thể là backend đang xử lý AI
        if (lowerMessage.contains('đang xử lý')) {
          _showErrorDialog(
            'Hệ thống đang xử lý ảnh của bạn. Quá trình này có thể mất vài phút.\n\nVui lòng thử lại sau một lúc hoặc kiểm tra kết nối internet.',
          );
        } else {
          _showMaintenanceDialog();
        }
      } else if (lowerMessage.contains('network') ||
                 lowerMessage.contains('connection')) {
        _showErrorDialog(
          'Lỗi kết nối: Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet và thử lại.',
        );
      } else {
        _showErrorDialog('Lỗi phân loại: $errorMessage');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  // --- HÀM HIỂN THỊ LỖI ---
  void _showErrorDialog(String message, {VoidCallback? onOk}) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.error_outline, color: Colors.red),
            SizedBox(width: 8),
            Text('Lỗi'),
          ],
        ),
        content: Text(message),
        actions: <Widget>[
          TextButton(
            child: const Text('OK'),
            onPressed: () {
              Navigator.of(ctx).pop();
              onOk?.call();
            },
          ),
        ],
      ),
    );
  }

  // --- HÀM HIỂN THỊ THÔNG TIN ---
  void _showInfoDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.info_outline, color: Theme.of(context).primaryColor),
            const SizedBox(width: 8),
            Text(title),
          ],
        ),
        content: Text(message),
        actions: <Widget>[
          TextButton(
            child: const Text('OK'),
            onPressed: () {
              Navigator.of(ctx).pop();
            },
          ),
        ],
      ),
    );
  }

  // --- HÀM HIỂN THỊ THÔNG BÁO BẢO TRÌ ---
  void _showMaintenanceDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.build, color: Colors.orange),
            SizedBox(width: 8),
            Text('Hệ Thống Đang Bảo Trì'),
          ],
        ),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Xin lỗi, hệ thống đang được bảo trì.',
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 12),
            Text(
              'Vui lòng thử lại sau một vài phút.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          ],
        ),
        actions: <Widget>[
          TextButton(
            child: const Text('Đóng'),
            onPressed: () {
              Navigator.of(ctx).pop();
            },
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.refresh),
            label: const Text('Thử Lại'),
            onPressed: () {
              Navigator.of(ctx).pop();
              // Có thể thêm logic refresh nếu cần
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Nhận Diện & Phân Loại Rác',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      drawer: const AppDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            // Khu vực hiển thị ảnh đã chọn
            Card(
              elevation: 8,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              child: Container(
                height: 300,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Theme.of(context).primaryColor,
                    width: 2,
                  ),
                ),
                child: _pickedImage != null
                    ? Stack(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(18),
                            child: Image.file(
                              _pickedImage!,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              height: double.infinity,
                            ),
                          ),
                          // Nút xóa ảnh
                          Positioned(
                            top: 8,
                            right: 8,
                            child: Material(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(20),
                              child: InkWell(
                                onTap: () {
                                  setState(() {
                                    _pickedImage = null;
                                  });
                                },
                                borderRadius: BorderRadius.circular(20),
                                child: const Padding(
                                  padding: EdgeInsets.all(8.0),
                                  child: Icon(
                                    Icons.close,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    : const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.photo_camera_rounded,
                              size: 80,
                              color: Color(0xFF66BB6A),
                            ),
                            SizedBox(height: 10),
                            Text(
                              'Chọn ảnh rác để phân loại',
                              style: TextStyle(
                                fontSize: 18,
                                color: Colors.grey,
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 30),

            // Các nút chọn ảnh
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.camera_alt),
                    label: const Text(
                      'Chụp Ảnh',
                      style: TextStyle(fontSize: 16),
                    ),
                    onPressed: _isLoading
                        ? null
                        : () => _pickImage(ImageSource.camera),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Theme.of(context).primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      side: BorderSide(
                        color: Theme.of(context).primaryColor,
                        width: 2,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 15),
                Expanded(
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.photo_library),
                    label: const Text(
                      'Thư Viện',
                      style: TextStyle(fontSize: 16),
                    ),
                    onPressed: _isLoading
                        ? null
                        : () => _pickImage(ImageSource.gallery),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Theme.of(context).primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      side: BorderSide(
                        color: Theme.of(context).primaryColor,
                        width: 2,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 40),

            // Nút GỬI để phân loại
            _isLoading
                ? Column(
                    children: [
                      const CircularProgressIndicator(),
                      const SizedBox(height: 16),
                      Text(
                        'Đang phân loại ảnh...',
                        style: TextStyle(
                          color: Theme.of(context).primaryColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Quá trình này có thể mất vài phút, vui lòng đợi...',
                        style: TextStyle(
                          color: Colors.grey[600],
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  )
                : ElevatedButton.icon(
                    icon: const Icon(Icons.send),
                    label: const Text('GỬI VÀ PHÂN LOẠI'),
                    onPressed: _pickedImage != null ? _classifyImage : null,
                    style: ElevatedButton.styleFrom(
                      disabledBackgroundColor: Colors.grey[300],
                      disabledForegroundColor: Colors.grey[600],
                    ),
                  ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.pushNamed(context, CameraRealtimeScreen.routeName);
        },
        icon: Icon(Icons.qr_code_scanner),
        label: Text('Quét Real-time'),
        backgroundColor: Colors.green,
        tooltip: 'Quét và nhận diện real-time (không lưu)',
      ),
    );
  }
}
