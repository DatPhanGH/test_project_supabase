/// User Model - Đại diện cho thông tin người dùng
class UserModel {
  final String id;
  final String? email;
  final String? name;
  final String? avatarUrl;
  final String? role;
  final bool? isActive;

  UserModel({
    required this.id,
    this.email,
    this.name,
    this.avatarUrl,
    this.role,
    this.isActive,
  });

  /// Tạo UserModel từ Supabase User
  factory UserModel.fromSupabaseUser(dynamic supabaseUser) {
    if (supabaseUser == null) {
      throw ArgumentError('Supabase user cannot be null');
    }

    return UserModel(
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.userMetadata?['full_name'] as String? ??
            supabaseUser.email?.split('@')[0],
      avatarUrl: supabaseUser.userMetadata?['avatar_url'] as String?,
      role: supabaseUser.userMetadata?['role'] as String?,
      isActive: supabaseUser.userMetadata?['is_active'] as bool? ?? true,
    );
  }

  /// Tạo UserModel từ JSON (từ bảng public.users)
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['user_id'] as String,
      email: json['email'] as String?,
      name: json['name'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      role: json['role'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  /// Chuyển đổi sang JSON
  Map<String, dynamic> toJson() {
    return {
      'user_id': id,
      'email': email,
      'name': name,
      'avatar_url': avatarUrl,
      'role': role,
      'is_active': isActive,
    };
  }

  /// Lấy tên hiển thị (fallback về email hoặc "Người dùng")
  String get displayName {
    return name ?? email?.split('@')[0] ?? 'Người dùng';
  }

  /// Kiểm tra xem user có phải admin không
  bool get isAdmin => role == 'admin';

  /// Copy với các thay đổi
  UserModel copyWith({
    String? id,
    String? email,
    String? name,
    String? avatarUrl,
    String? role,
    bool? isActive,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      role: role ?? this.role,
      isActive: isActive ?? this.isActive,
    );
  }
}

