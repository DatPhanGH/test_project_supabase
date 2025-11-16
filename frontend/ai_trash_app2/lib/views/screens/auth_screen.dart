import 'package:flutter/material.dart';
import '/controllers/auth_controller.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController(); // Thêm controller cho tên
  final _confirmPasswordController = TextEditingController(); // Thêm controller cho xác nhận mật khẩu
  final _formKey = GlobalKey<FormState>();
  final _authController = AuthController();
  bool _isLogin = true;
  bool _isLoading = false;

  Future<void> _submitAuthForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      AuthResult result;
      
      if (_isLogin) {
        // Đăng nhập
        result = await _authController.signIn(
          _emailController.text.trim(),
          _passwordController.text,
        );
      } else {
        // Đăng ký
        result = await _authController.signUp(
          _emailController.text.trim(),
          _passwordController.text,
          fullName: _nameController.text.trim(),
        );
      }

      if (result.success) {
        if (result.requiresEmailConfirmation) {
          // Cần xác thực email
          if (mounted) {
            _showSuccessDialog(result.message);
          }
        } else {
          // Đăng nhập/Đăng ký thành công
          if (mounted) {
            Navigator.of(context).pushReplacementNamed('/');
          }
        }
      } else {
        // Hiển thị lỗi
        if (mounted) {
          _showErrorDialog(result.message);
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorDialog('Đã xảy ra lỗi: ${e.toString()}');
      }
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

  void _showSuccessDialog(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thành công'),
        content: Text(message),
        actions: <Widget>[
          TextButton(
            child: const Text('OK'),
            onPressed: () {
              Navigator.of(ctx).pop();
              // Chuyển sang màn hình đăng nhập
              setState(() {
                _isLogin = true;
              });
            },
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isLogin ? 'Đăng Nhập' : 'Đăng Ký')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(30.0),
          child: Card(
            elevation: 10,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            child: Padding(
              padding: const EdgeInsets.all(25.0),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Text(
                      _isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản mới',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                    const SizedBox(height: 20),
                    // Trường tên người dùng (chỉ hiển thị khi đăng ký)
                    if (!_isLogin)
                      TextFormField(
                        controller: _nameController,
                        textCapitalization: TextCapitalization.words,
                        validator: (value) {
                          if (!_isLogin) {
                            if (value == null || value.isEmpty) {
                              return 'Vui lòng nhập tên người dùng';
                            }
                            if (value.trim().length < 2) {
                              return 'Tên người dùng phải có ít nhất 2 ký tự';
                            }
                          }
                          return null;
                        },
                        decoration: const InputDecoration(
                          labelText: 'Tên người dùng',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(10)),
                          ),
                          prefixIcon: Icon(Icons.person),
                        ),
                      ),
                    if (!_isLogin) const SizedBox(height: 15),
                    TextFormField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập email';
                        }
                        if (!value.contains('@')) {
                          return 'Email không hợp lệ';
                        }
                        return null;
                      },
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                        ),
                        prefixIcon: Icon(Icons.email),
                      ),
                    ),
                    const SizedBox(height: 15),
                    TextFormField(
                      controller: _passwordController,
                      obscureText: true,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Vui lòng nhập mật khẩu';
                        }
                        if (value.length < 6) {
                          return 'Mật khẩu phải có ít nhất 6 ký tự';
                        }
                        return null;
                      },
                      decoration: const InputDecoration(
                        labelText: 'Mật khẩu',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.all(Radius.circular(10)),
                        ),
                        prefixIcon: Icon(Icons.lock),
                      ),
                    ),
                    // Trường xác nhận mật khẩu (chỉ hiển thị khi đăng ký)
                    if (!_isLogin) ...[
                      const SizedBox(height: 15),
                      TextFormField(
                        controller: _confirmPasswordController,
                        obscureText: true,
                        validator: (value) {
                          if (!_isLogin) {
                            if (value == null || value.isEmpty) {
                              return 'Vui lòng xác nhận mật khẩu';
                            }
                            if (value != _passwordController.text) {
                              return 'Mật khẩu xác nhận không khớp';
                            }
                          }
                          return null;
                        },
                        decoration: const InputDecoration(
                          labelText: 'Xác nhận mật khẩu',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.all(Radius.circular(10)),
                          ),
                          prefixIcon: Icon(Icons.lock_outline),
                        ),
                      ),
                    ],
                    const SizedBox(height: 30),
                    SizedBox(
                      width: double.infinity,
                      child: _isLoading
                          ? const Center(child: CircularProgressIndicator())
                          : ElevatedButton(
                              onPressed: _submitAuthForm,
                              child: Text(_isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'),
                            ),
                    ),
                    TextButton(
                      onPressed: _isLoading
                          ? null
                          : () {
                              setState(() {
                                _isLogin = !_isLogin;
                                // Xóa các trường khi chuyển đổi
                                if (_isLogin) {
                                  // Chuyển sang đăng nhập: xóa tên và xác nhận mật khẩu
                                  _nameController.clear();
                                  _confirmPasswordController.clear();
                                } else {
                                  // Chuyển sang đăng ký: xóa tất cả để người dùng nhập lại
                                  _emailController.clear();
                                  _passwordController.clear();
                                  _nameController.clear();
                                  _confirmPasswordController.clear();
                                }
                              });
                            },
                      child: Text(
                        _isLogin
                            ? 'Chưa có tài khoản? Đăng ký ngay!'
                            : 'Đã có tài khoản? Đăng nhập!',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
