import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '/constants.dart';
import '/views/screens/auth_screen.dart';
import '/views/screens/history_screen.dart';
import '/views/screens/home_screen.dart'; // ĐÃ SỬA: Import từ home_screen.dart chính thức
import '/views/screens/guideline_screen.dart';
import '/views/screens/result_screen.dart';
import '/views/screens/detail_screen.dart';
import '/views/screens/camera_realtime_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Khởi tạo Supabase
  await Supabase.initialize(
    url: Constants.supabaseUrl,
    anonKey: Constants.supabaseAnonKey,
  );
  
  runApp(const WasteClassificationApp());
}

class WasteClassificationApp extends StatelessWidget {
  const WasteClassificationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Phân loại rác thông minh',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.green,
        primaryColor: const Color(0xFF4CAF50),
        scaffoldBackgroundColor: const Color(0xFFF0F4F8),
        fontFamily: 'Inter',
        useMaterial3: true,

        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF4CAF50),
          foregroundColor: Colors.white,
          elevation: 0,
        ),

        // ✅ CardThemeData theo API mới
        cardTheme: CardThemeData(
          color: Colors.white,
          margin: const EdgeInsets.all(12),
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),

        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1B5E20),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),

      initialRoute: '/',
      routes: {
        '/': (context) => const HomeScreen(),
        '/auth': (context) => const AuthScreen(),
        '/history': (context) => const HistoryScreen(),
        '/guideline': (context) => const GuidelineScreen(),
        CameraRealtimeScreen.routeName: (context) => CameraRealtimeScreen(),
        ResultScreen.routeName: (context) => const ResultScreen(),
        DetailScreen.routeName: (context) {
          final imageId = ModalRoute.of(context)!.settings.arguments as int;
          return DetailScreen(imageId: imageId);
        },
      },
    );
  }
}
