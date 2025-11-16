import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '/models/user_model.dart';

/// AuthController - Xử lý tất cả logic liên quan đến authentication
class AuthController {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Stream để lắng nghe thay đổi trạng thái authentication
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  /// Lấy session hiện tại
  Session? get currentSession => _supabase.auth.currentSession;

  /// Kiểm tra xem user đã đăng nhập chưa
  bool get isAuthenticated => currentSession != null;

  /// Lấy user hiện tại từ session
  User? get currentUser => currentSession?.user;

  /// Lấy UserModel từ user hiện tại
  UserModel? get currentUserModel {
    final user = currentUser;
    if (user == null) return null;
    try {
      return UserModel.fromSupabaseUser(user);
    } catch (e) {
      return null;
    }
  }

  /// Đăng nhập với email và password
  Future<AuthResult> signIn(String email, String password) async {
    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email.trim(),
        password: password,
      );

      if (response.user == null) {
        return AuthResult(
          success: false,
          message: 'Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu.',
        );
      }

      final session = _supabase.auth.currentSession;
      if (session == null) {
        return AuthResult(
          success: false,
          message: 'Không thể tạo phiên đăng nhập. Vui lòng thử lại.',
        );
      }

      return AuthResult(
        success: true,
        message: 'Đăng nhập thành công',
        user: UserModel.fromSupabaseUser(response.user!),
      );
    } on AuthException catch (e) {
      return AuthResult(
        success: false,
        message: _translateErrorMessage(e.message),
      );
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'Đã xảy ra lỗi: ${e.toString()}',
      );
    }
  }

  /// Đăng ký tài khoản mới
  Future<AuthResult> signUp(
    String email,
    String password, {
    String? fullName,
  }) async {
    try {
      // Chuẩn bị metadata để trigger có thể lấy được full_name
      final Map<String, dynamic> data = {};
      if (fullName != null && fullName.isNotEmpty) {
        data['full_name'] = fullName;
      }

      final response = await _supabase.auth.signUp(
        email: email.trim(),
        password: password,
        data: data.isNotEmpty ? data : null,
      );

      if (response.user == null) {
        return AuthResult(
          success: false,
          message: 'Đăng ký thất bại. Email có thể đã được sử dụng.',
        );
      }

      // Kiểm tra xem có cần xác thực email không
      if (response.session != null) {
        // Không cần xác thực email, đã có session
        return AuthResult(
          success: true,
          message: 'Đăng ký thành công',
          user: UserModel.fromSupabaseUser(response.user!),
        );
      } else {
        // Cần xác thực email
        return AuthResult(
          success: true,
          message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.',
          requiresEmailConfirmation: true,
        );
      }
    } on AuthException catch (e) {
      return AuthResult(
        success: false,
        message: _translateErrorMessage(e.message),
      );
    } catch (e) {
      return AuthResult(
        success: false,
        message: 'Đã xảy ra lỗi: ${e.toString()}',
      );
    }
  }

  /// Đăng xuất
  Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  /// Lấy thông tin user từ bảng public.users
  Future<UserModel?> fetchUserFromDatabase(String userId) async {
    try {
      final response = await _supabase
          .from('users')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (response == null) return null;
      return UserModel.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      print('Lỗi khi lấy thông tin user từ database: $e');
      return null;
    }
  }

  /// Lấy thông tin user hiển thị (từ session hoặc database)
  Future<UserDisplayInfo> getUserDisplayInfo() async {
    final user = currentUser;
    
    if (user == null) {
      return UserDisplayInfo(
        name: 'Người dùng',
        email: '',
        avatarUrl: null,
        isAuthenticated: false,
      );
    }

    // Thử lấy từ database trước
    UserModel? userModel = await fetchUserFromDatabase(user.id);
    
    // Nếu không có trong database, dùng thông tin từ session
    if (userModel == null) {
      userModel = currentUserModel;
    }

    return UserDisplayInfo(
      name: userModel?.displayName ?? user.email?.split('@')[0] ?? 'Người dùng',
      email: user.email ?? '',
      avatarUrl: userModel?.avatarUrl ?? user.userMetadata?['avatar_url'] as String?,
      isAuthenticated: true,
    );
  }

  /// Chuyển đổi thông báo lỗi từ tiếng Anh sang tiếng Việt
  String _translateErrorMessage(String message) {
    final lowerMessage = message.toLowerCase();
    
    if (lowerMessage.contains('invalid login credentials') ||
        lowerMessage.contains('invalid credentials')) {
      return 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.';
    }
    if (lowerMessage.contains('email not confirmed')) {
      return 'Email chưa được xác thực. Vui lòng kiểm tra email và xác thực tài khoản.';
    }
    if (lowerMessage.contains('user not found')) {
      return 'Không tìm thấy tài khoản với email này.';
    }
    if (lowerMessage.contains('email already registered')) {
      return 'Email này đã được đăng ký. Vui lòng đăng nhập.';
    }
    if (lowerMessage.contains('password')) {
      return 'Mật khẩu không hợp lệ. Vui lòng thử lại.';
    }
    
    return message;
  }
}

/// Kết quả của các thao tác authentication
class AuthResult {
  final bool success;
  final String message;
  final UserModel? user;
  final bool requiresEmailConfirmation;

  AuthResult({
    required this.success,
    required this.message,
    this.user,
    this.requiresEmailConfirmation = false,
  });
}

/// Thông tin hiển thị của user
class UserDisplayInfo {
  final String name;
  final String email;
  final String? avatarUrl;
  final bool isAuthenticated;

  UserDisplayInfo({
    required this.name,
    required this.email,
    this.avatarUrl,
    required this.isAuthenticated,
  });
}

