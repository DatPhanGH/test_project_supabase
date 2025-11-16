import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '/services/api_service.dart';
import '/models/prediction_model.dart';
import '/views/screens/result_screen.dart';
import '/views/widgets/app_drawer.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  File? _pickedImage;
  bool _isLoading = false;

  Future<void> _pickImage(ImageSource source) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: source);

    if (pickedFile != null) {
      setState(() {
        _pickedImage = File(pickedFile.path);
      });
    }
  }

  Future<void> _classifyImage() async {
    if (_pickedImage == null) {
      _showErrorDialog('Vui lòng chọn hoặc chụp ảnh rác trước!');
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final ClassificationResult result = await _apiService.classifyImage(
        _pickedImage!,
      );

      // Chuyển sang màn hình kết quả
      if (mounted) {
        Navigator.of(
          context,
        ).pushNamed(ResultScreen.routeName, arguments: result).then((_) {
          // Reset trạng thái sau khi quay lại từ màn hình kết quả
          setState(() {
            _pickedImage = null;
          });
        });
      }
    } catch (e) {
      _showErrorDialog(
        'Lỗi phân loại: ${e.toString().replaceAll("Exception:", "")}',
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Lỗi'),
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
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: Image.file(
                          _pickedImage!,
                          fit: BoxFit.cover,
                          width: double.infinity,
                        ),
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
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton.icon(
                    icon: const Icon(Icons.send),
                    label: const Text('GỬI VÀ PHÂN LOẠI'),
                    onPressed: _classifyImage,
                  ),
          ],
        ),
      ),
    );
  }
}
