import 'package:flutter/material.dart'; // Cần thiết cho IconData và Color

class Constants {
  // Cấu hình Supabase (Dựa trên thông tin bạn cung cấp)
  static const String supabaseUrl = 'https://abvvhzvedobpmdgdtfba.supabase.co';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidnZoenZlZG9icG1kZ2R0ZmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzIxMDcsImV4cCI6MjA3ODEwODEwN30.x-lHCiZrIpTlBaNsh-dmeT9_sDLJREk9HPaohwNqhLg';

  // API Endpoint (Flask/Python backend)
  // ⚠️ QUAN TRỌNG: Cấu hình URL backend Flask của bạn
  // 
  // Các tùy chọn:
  // 1. Android Emulator: 'http://10.0.2.2:5000'
  //    (10.0.2.2 là địa chỉ đặc biệt trỏ đến localhost của máy host)
  // 
  // 2. iOS Simulator: 'http://localhost:5000' hoặc 'http://127.0.0.1:5000'
  // 
  // 3. Thiết bị thật (Android/iOS):
  //    - Tìm IP máy tính: ipconfig (Windows) hoặc ifconfig (Mac/Linux)
  //    - Ví dụ: 'http://192.168.1.100:5000'
  //    - Đảm bảo máy tính và thiết bị cùng mạng WiFi
  // 
  // 4. Ngrok (để test từ xa):
  //    - Chạy: ngrok http 5000
  //    - Copy URL: 'https://xxxx-xx-xx-xx-xx.ngrok.io'
  // 
  // 5. Backend đã deploy:
  //    - 'https://your-deployed-api.com'
  // 
  // Lưu ý: Đảm bảo backend Flask đã chạy trước khi test app!
  // 
  // 🔧 CẤU HÌNH URL THEO MÔI TRƯỜNG:
  // 
  // ✅ Android Emulator (khuyến nghị):
  // static const String apiBaseUrl = 'http://10.0.2.2:5000';
  // 
  // ✅ Thiết bị thật (Android/iOS) - dùng IP máy tính:
  static const String apiBaseUrl = 'http://192.168.1.6:5000'; // Thay bằng IP máy bạn
  // 
  // ✅ iOS Simulator:
  // static const String apiBaseUrl = 'http://localhost:5000';
  // 
  // ✅ Ngrok (test từ xa):
  // static const String apiBaseUrl = 'https://xxxx.ngrok.io';
  static const String classifyEndpoint =
      '/upload'; // Endpoint upload và phân loại ảnh

  // Asset paths
  static const String appLogo = 'assets/logo.jpg';
  static const String defaultUserAvatar = 'assets/user_avatar.jpg';
}

// Map chứa thông tin thùng rác cần vứt cho từng loại rác
const Map<String, String> wasteBinInfo = {
  "Nhựa": "Thùng Tái Chế (Xanh Lá)",
  "Giấy": "Thùng Tái Chế (Xanh Lá)",
  "Kim loại": "Thùng Tái Chế (Xanh Lá)",
  "Thủy tinh": "Thùng Tái Chế (Xanh Lá)",
  "Hữu cơ": "Thùng Hữu Cơ (Nâu/Đỏ)",
  "Nguy hại": "Thùng Nguy Hại (Đỏ/Cam)",
  "Hỗn hợp": "Thùng Rác Chung (Xám/Đen)",
};

// Giả lập dữ liệu hướng dẫn phân loại rác
Map<String, List<String>> wasteGuidelines = {
  "Nhựa": [
    "Làm sạch chai/hộp nhựa trước khi bỏ.",
    "Bỏ nắp chai, phân loại riêng nếu nắp làm bằng vật liệu khác.",
    "Thuộc loại rác tái chế, bỏ vào thùng **Tái Chế**.",
  ],
  "Giấy": [
    "Giấy báo, thùng carton, giấy in có thể tái chế.",
    "Không tái chế được giấy đã dính dầu mỡ, bẩn (ví dụ: hộp pizza).",
    "Bỏ vào thùng rác **Tái Chế**.",
  ],
  "Kim loại": [
    "Làm sạch lon nhôm/thép trước khi bỏ.",
    "Các vật dụng sắc nhọn (như lưỡi dao cạo) cần được bọc lại an toàn trước khi vứt.",
    "Thuộc loại rác tái chế, bỏ vào thùng **Tái Chế**.",
  ],
  "Thủy tinh": [
    "Rửa sạch chai lọ thủy tinh.",
    "Không tái chế được gương, bóng đèn, hoặc gốm sứ.",
    "Cẩn thận khi xử lý các mảnh vỡ, bỏ vào thùng **Tái Chế**.",
  ],
  "Hữu cơ": [
    "Thức ăn thừa, vỏ trái cây, bã cà phê.",
    "Thuộc loại rác phân hủy sinh học (Compost).",
    "Bỏ vào thùng rác **Hữu Cơ**.",
  ],
  "Hỗn hợp": [
    "Khi có nhiều loại rác trong một ảnh, cần phân tách và xử lý theo từng loại.",
    "Nếu không thể tách, hãy tìm hướng dẫn xử lý chung cho vật phẩm đó, sau đó bỏ vào thùng **Rác Chung**.",
  ],
};

// ==========================================================
// THÊM: Helper để lấy icon và màu thùng rác tương ứng
// ==========================================================

/// Trả về IconData tương ứng với loại rác.
IconData getBinIcon(String category) {
  switch (category) {
    case "Nhựa":
    case "Giấy":
    case "Kim loại":
    case "Thủy tinh":
      return Icons.recycling; // Icon Tái chế
    case "Hữu cơ":
      return Icons.grass; // Icon Hữu cơ/Compost
    case "Nguy hại":
      return Icons.warning_rounded; // Icon Nguy hại
    case "Hỗn hợp":
    default:
      return Icons.delete; // Icon Rác chung
  }
}

/// Trả về Color tương ứng với loại rác.
Color getBinColor(String category) {
  switch (category) {
    case "Nhựa":
    case "Giấy":
    case "Kim loại":
    case "Thủy tinh":
      return const Color(0xFF4CAF50); // Green (Xanh lá - Tái chế)
    case "Hữu cơ":
      return const Color(0xFF795548); // Brown (Nâu - Hữu cơ)
    case "Nguy hại":
      return const Color(0xFFD32F2F); // Red (Đỏ - Nguy hại)
    case "Hỗn hợp":
    default:
      return const Color(0xFF616161); // Grey (Xám - Hỗn hợp)
  }
}
