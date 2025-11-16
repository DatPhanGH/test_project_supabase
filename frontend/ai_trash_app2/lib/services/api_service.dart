import 'dart:io';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:path/path.dart';
import '/controllers/auth_controller.dart';
import '/constants.dart';
import '/models/prediction_model.dart';

// Đây là phần Service chịu trách nhiệm giao tiếp với backend (Flask)
class ApiService {
  final String _baseUrl = Constants.apiBaseUrl;
  final AuthController _authController = AuthController();

  /// Lấy access token từ AuthController
  String? _getAccessToken() {
    final session = _authController.currentSession;
    return session?.accessToken;
  }

  Future<ClassificationResult> classifyImage(File imageFile) async {
    // Lấy access token từ Supabase
    final accessToken = _getAccessToken();
    if (accessToken == null) {
      throw Exception('Chưa đăng nhập. Vui lòng đăng nhập trước.');
    }

    final url = Uri.parse('$_baseUrl${Constants.classifyEndpoint}');

    // Dùng Multipart Request để gửi file và các trường form khác
    final request = http.MultipartRequest('POST', url);

    // Thêm Bearer token vào Authorization header
    request.headers['Authorization'] = 'Bearer $accessToken';

    // Thêm file ảnh
    request.files.add(
      await http.MultipartFile.fromPath(
        'file', // Tên trường file phải khớp với request.files.get("file") trong main.py
        imageFile.path,
        filename: basename(imageFile.path),
      ),
    );

    try {
      // Timeout cho upload (gửi ảnh) - thường nhanh hơn
      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Hệ thống đang bảo trì. Vui lòng thử lại sau.');
        },
      );
      // Timeout cho download (nhận kết quả) - AI xử lý có thể mất thời gian
      // Tăng lên 180 giây (3 phút) để đủ thời gian cho AI inference và nhận response lớn (ảnh base64)
      print('⏳ Đang đợi response từ server...');
      
      http.Response response;
      try {
        response = await http.Response.fromStream(streamedResponse).timeout(
          const Duration(seconds: 180),
          onTimeout: () {
            print('⏰ Timeout khi nhận response (180s)');
            throw Exception('Hệ thống đang xử lý, vui lòng đợi thêm hoặc thử lại sau.');
          },
        );
        print('✅ Đã nhận response: statusCode=${response.statusCode}, size=${response.bodyBytes.length} bytes');
      } catch (e) {
        print('❌ Lỗi khi đọc response stream: $e');
        if (e.toString().contains('timeout') || e.toString().contains('Timeout')) {
          throw Exception('Hệ thống đang xử lý, vui lòng đợi thêm hoặc thử lại sau.');
        } else if (e.toString().contains('connection') || e.toString().contains('socket')) {
          throw Exception('Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet và thử lại.');
        }
        rethrow;
      }

      if (response.statusCode == 200) {
        try {
          // Debug: Log response size
          print('📦 Response size: ${response.bodyBytes.length} bytes');
          
          final data = json.decode(utf8.decode(response.bodyBytes));
          
          // Kiểm tra xem có predictions không
          if (data['predictions'] == null) {
            print('⚠️ Warning: Response không có predictions field');
            data['predictions'] = [];
          }
          
          return ClassificationResult.fromJson(data);
        } catch (e) {
          print('❌ Lỗi khi parse response: $e');
          try {
            final bodyString = utf8.decode(response.bodyBytes);
            final preview = bodyString.length > 500 ? bodyString.substring(0, 500) : bodyString;
            print('📄 Response body preview (first 500 chars): $preview');
          } catch (_) {
            print('📄 Không thể decode response body');
          }
          throw Exception('Lỗi khi xử lý phản hồi từ server: $e');
        }
      } else if (response.statusCode == 401) {
        // Token hết hạn hoặc không hợp lệ
        String errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        try {
          final errorBody = json.decode(utf8.decode(response.bodyBytes));
          final backendError = errorBody['error'] as String?;
          if (backendError != null) {
            // Kiểm tra nếu backend trả về lỗi "invalid login credentials"
            if (backendError.toLowerCase().contains('invalid login credentials') ||
                backendError.toLowerCase().contains('token')) {
              errorMessage = 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
            } else {
              errorMessage = backendError;
            }
          }
        } catch (_) {
          // Nếu không parse được error body, dùng message mặc định
        }
        throw Exception(errorMessage);
      } else {
        String errorMessage = 'Lỗi không xác định';
        try {
          final errorBody = json.decode(utf8.decode(response.bodyBytes));
          errorMessage = errorBody['error'] as String? ?? 
                        'Lỗi API ${response.statusCode}';
        } catch (_) {
          errorMessage = 'Lỗi API ${response.statusCode}';
        }
        throw Exception(errorMessage);
      }
    } on SocketException catch (e) {
      // Lỗi kết nối mạng (Connection refused, No internet, etc.)
      if (e.message.contains('Connection refused') || 
          e.message.contains('connection refused')) {
        // Backend không chạy - hiển thị thông báo bảo trì
        throw Exception('Hệ thống đang bảo trì. Vui lòng thử lại sau.');
      } else if (e.message.contains('Network is unreachable') ||
                 e.message.contains('No address associated')) {
        throw Exception('Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.');
      } else {
        throw Exception('Lỗi kết nối: ${e.message}');
      }
    } on HttpException catch (e) {
      throw Exception('Lỗi HTTP: ${e.message}');
    } on FormatException catch (e) {
      print('❌ FormatException khi parse response: $e');
      throw Exception('Lỗi khi xử lý phản hồi từ server. Vui lòng thử lại.');
    } on TimeoutException {
      // Timeout - backend không phản hồi
      throw Exception('Hệ thống đang bảo trì. Vui lòng thử lại sau.');
    } catch (e) {
      // Log chi tiết lỗi để debug
      print('❌ Lỗi trong classifyImage: ${e.runtimeType} - $e');
      if (e is Exception) {
        print('❌ Exception details: ${e.toString()}');
      }
      
      // Xử lý các lỗi khác, đặc biệt là ClientException từ http package
      final errorString = e.toString().toLowerCase();
      
      // Kiểm tra các loại lỗi connection
      if (errorString.contains('connection refused') ||
          errorString.contains('socketexception') ||
          errorString.contains('failed host lookup') ||
          errorString.contains('network is unreachable') ||
          errorString.contains('no address associated') ||
          errorString.contains('connection closed') ||
          errorString.contains('broken pipe')) {
        // Backend không chạy hoặc connection bị đóng - hiển thị thông báo bảo trì
        throw Exception('Hệ thống đang bảo trì. Vui lòng thử lại sau.');
      }
      
      // Nếu đã là Exception với message rõ ràng (như "Hệ thống đang bảo trì"), rethrow
      if (e is Exception) {
        final message = e.toString().toLowerCase();
        if (message.contains('bảo trì') || 
            message.contains('maintenance') ||
            message.contains('đang xử lý')) {
          rethrow;
        }
        // Kiểm tra các exception khác
        if (message.contains('chưa đăng nhập') || 
            message.contains('hết hạn')) {
          rethrow;
        }
        // Nếu là lỗi connection đã được xử lý ở trên
        if (message.contains('không thể kết nối')) {
          rethrow;
        }
      }
      
      // Lỗi khác - throw với message gốc
      throw Exception('Lỗi khi phân loại hình ảnh: $e');
    }
  }

  /// Test classify - chỉ chạy inference, không lưu vào Supabase
  /// Dùng cho chức năng quét real-time
  Future<ClassificationResult> testClassifyImage(File imageFile) async {
    final url = Uri.parse('$_baseUrl/test'); // Endpoint test mới

    // Dùng Multipart Request để gửi file
    final request = http.MultipartRequest('POST', url);

    // Thêm file ảnh
    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        imageFile.path,
        filename: basename(imageFile.path),
      ),
    );

    try {
      // Timeout ngắn hơn cho test mode (10s upload, 30s inference)
      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Hệ thống đang bảo trì. Vui lòng thử lại sau.');
        },
      );

      print('⏳ [TEST] Đang đợi response từ server...');
      
      http.Response response;
      try {
        response = await http.Response.fromStream(streamedResponse).timeout(
          const Duration(seconds: 30), // Timeout ngắn hơn cho test
          onTimeout: () {
            print('⏰ [TEST] Timeout khi nhận response (30s)');
            throw Exception('Hệ thống đang xử lý, vui lòng thử lại sau.');
          },
        );
        print('✅ [TEST] Đã nhận response: statusCode=${response.statusCode}');
      } catch (e) {
        print('❌ [TEST] Lỗi khi đọc response stream: $e');
        rethrow;
      }

      if (response.statusCode == 200) {
        try {
          final jsonData = jsonDecode(response.body) as Map<String, dynamic>;
          
          return ClassificationResult(
            predictions: (jsonData['predictions'] as List<dynamic>?)
                ?.map((p) => Prediction.fromJson(p as Map<String, dynamic>))
                .toList() ?? [],
            timestamp: DateTime.now(),
            fileUrl: null, // Test mode không có file_url
            imageId: null, // Test mode không có image_id
            originalImageBase64: null, // Không cần base64 cho test
          );
        } catch (e) {
          print('❌ [TEST] Lỗi parse JSON: $e');
          throw Exception('Lỗi khi xử lý kết quả từ server.');
        }
      } else {
        final errorBody = response.body;
        print('❌ [TEST] Lỗi từ server: ${response.statusCode} - $errorBody');
        throw Exception('Lỗi từ server: ${response.statusCode}');
      }
    } on SocketException catch (e) {
      print('❌ [TEST] Lỗi kết nối: $e');
      if (e.message.contains('Connection refused') || 
          e.message.contains('connection closed') ||
          e.message.contains('broken pipe')) {
        throw Exception('Hệ thống đang bảo trì. Vui lòng thử lại sau.');
      }
      throw Exception('Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet và thử lại.');
    } catch (e) {
      print('❌ [TEST] Lỗi: $e');
      rethrow;
    }
  }
}
