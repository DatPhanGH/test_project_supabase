import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '/controllers/auth_controller.dart';
import '/models/user_model.dart';

class AppDrawer extends StatefulWidget {
  const AppDrawer({super.key});

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  final AuthController _authController = AuthController();
  
  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;
    
    // Sử dụng StreamBuilder để tự động cập nhật khi auth state thay đổi
    return StreamBuilder<AuthState>(
      stream: _authController.authStateChanges,
      initialData: AuthState(
        AuthChangeEvent.initialSession,
        _authController.currentSession,
      ),
      builder: (context, snapshot) {
        final isAuthenticated = _authController.isAuthenticated;
        
        // Lấy thông tin user từ controller
        return FutureBuilder<UserDisplayInfo>(
          future: _authController.getUserDisplayInfo(),
          builder: (context, userSnapshot) {
            final userInfo = userSnapshot.data ?? UserDisplayInfo(
              name: 'Người dùng',
              email: '',
              avatarUrl: null,
              isAuthenticated: false,
            );

            return _buildDrawerContent(
              context,
              primaryColor: primaryColor,
              isAuthenticated: isAuthenticated,
              userName: userInfo.name,
              userEmail: userInfo.email,
              avatarUrl: userInfo.avatarUrl,
            );
          },
        );
      },
    );
  }

  Widget _buildDrawerContent(
    BuildContext context, {
    required Color primaryColor,
    required bool isAuthenticated,
    required String userName,
    required String userEmail,
    String? avatarUrl,
  }) {

    return Drawer(
      child: Column(
        children: <Widget>[
          // HEADER với thông tin user
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(
              top: 50,
              bottom: 20,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [primaryColor.withOpacity(0.9), primaryColor],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              boxShadow: [
                BoxShadow(
                  color: primaryColor.withOpacity(0.5),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: Colors.white,
                  backgroundImage: avatarUrl != null && avatarUrl.isNotEmpty
                      ? NetworkImage(avatarUrl)
                      : null,
                  child: avatarUrl == null || avatarUrl.isEmpty
                      ? const Icon(Icons.person, size: 45, color: Color(0xFF4CAF50))
                      : null,
                ),
                const SizedBox(height: 10),
                Text(
                  userName,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 20,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  isAuthenticated ? userEmail : 'Chưa đăng nhập',
                  style: const TextStyle(fontSize: 15, color: Colors.white70),
                ),
              ],
            ),
          ),

          // CÁC MỤC DANH SÁCH
          // Luôn hiển thị: Trang chủ
          _buildDrawerItem(
            context,
            icon: Icons.home,
            title: 'Trang Chủ',
            routeName: '/',
            color: _getTileColor(0),
            isReplacement: true,
          ),

          // Chỉ hiển thị khi đã đăng nhập: Lịch sử
          if (isAuthenticated)
            _buildDrawerItem(
              context,
              icon: Icons.history,
              title: 'Lịch Sử Phân Loại',
              routeName: '/history',
              color: _getTileColor(1),
            ),

          // Luôn hiển thị: Hướng dẫn
          _buildDrawerItem(
            context,
            icon: Icons.menu_book,
            title: 'Hướng Dẫn Phân Loại',
            routeName: '/guideline',
            color: _getTileColor(2),
          ),

          const Divider(height: 1, thickness: 1, indent: 15, endIndent: 15),

          // Đăng nhập/Đăng ký (chỉ hiển thị khi chưa đăng nhập)
          if (!isAuthenticated)
            _buildDrawerItem(
              context,
              icon: Icons.login,
              title: 'Đăng Nhập / Đăng Ký',
              routeName: '/auth',
              color: _getTileColor(3),
            ),

          // Đẩy phần Đăng Xuất xuống dưới cùng (chỉ hiển thị khi đã đăng nhập)
          const Spacer(),

          if (isAuthenticated)
            _buildDrawerItem(
              context,
              icon: Icons.logout,
              title: 'Đăng Xuất',
              routeName: '/',
              color: _getTileColor(4),
              isReplacement: true,
              isLogout: true,
            ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  // Hàm xây dựng ListItem chung
  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String routeName,
    required Color color,
    bool isReplacement = false,
    bool isLogout = false,
  }) {
    return ListTile(
      leading: Icon(icon, color: color, size: 26),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 17,
          fontWeight: isLogout ? FontWeight.bold : FontWeight.normal,
          color: isLogout ? color : Colors.black87,
        ),
      ),
      // Hiệu ứng lên khi chạm (hover/splash effect)
      hoverColor: color.withOpacity(0.1),
      splashColor: color.withOpacity(0.2),
      onTap: () async {
        Navigator.of(context).pop(); // Đóng Drawer trước
        
        if (isLogout) {
          // Xử lý đăng xuất
          await _handleLogout(context);
          return;
        }
        
        if (isReplacement) {
          Navigator.of(context).pushReplacementNamed(routeName);
        } else {
          Navigator.of(context).pushNamed(routeName);
        }
      },
    );
  }

  /// Xử lý đăng xuất
  Future<void> _handleLogout(BuildContext context) async {
    try {
      // Hiển thị dialog xác nhận
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Xác nhận đăng xuất'),
          content: const Text('Bạn có chắc chắn muốn đăng xuất?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Hủy'),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Đăng xuất', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      );

      if (confirm == true) {
        // Đăng xuất thông qua controller
        await _authController.signOut();
        
        // Chuyển về trang chủ
        if (mounted) {
          Navigator.of(context).pushReplacementNamed('/');
          
          // Hiển thị thông báo
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã đăng xuất thành công'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi khi đăng xuất: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // Định nghĩa màu sắc cho từng mục (tăng tính trực quan)
  Color _getTileColor(int index) {
    switch (index) {
      case 0: // Trang Chủ
        return Colors.blue.shade600;
      case 1: // Lịch Sử
        return Colors.orange.shade700;
      case 2: // Hướng Dẫn
        return Colors.green.shade700;
      case 3: // Đăng Nhập
        return Colors.deepPurple.shade600;
      case 4: // Đăng Xuất
        return Colors.red.shade600;
      default:
        return Colors.grey.shade600;
    }
  }
}
