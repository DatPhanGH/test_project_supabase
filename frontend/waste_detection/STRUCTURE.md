# Cấu trúc thư mục dự án Waste Detection

## 📁 Tổ chức thư mục

```
waste_detection/
│
├── public/                          # Thư mục chứa các file tĩnh
│   ├── css/                         # Stylesheet
│   │   └── style.css               # File CSS chính cho toàn bộ ứng dụng
│   │
│   ├── images/                      # Hình ảnh, logo, icons
│   │   └── logo.png                # Logo của EcoSort
│   │
│   └── pages/                       # Các trang HTML tĩnh
│       ├── login.html              # Trang đăng nhập
│       └── register.html           # Trang đăng ký
│
├── src/                             # Mã nguồn React
│   ├── assets/                      # Tài nguyên (images, fonts, etc)
│   │
│   ├── hooks/                       # Custom React hooks
│   │
│   ├── utils/                       # Các hàm tiện ích
│   │   ├── auth.js                 # Xử lý xác thực (login, register, validation)
│   │   ├── admin.js                # Chức năng quản trị
│   │   └── main.js                 # Các hàm tiện ích chung
│   │
│   ├── App.jsx                      # Component React chính
│   └── main.jsx                     # Entry point của React
│
├── .env                             # Biến môi trường (không commit)
├── .env.example                     # Mẫu file biến môi trường
├── .gitignore                       # File gitignore
├── eslint.config.js                 # Cấu hình ESLint
├── package.json                     # Dependencies và scripts
├── vite.config.js                   # Cấu hình Vite
└── README.md                        # Tài liệu dự án

```

## 📝 Giải thích chi tiết

### `/public` - Thư mục tĩnh
Chứa các file không cần xử lý qua build process của React:
- **css/**: Stylesheet cho các trang HTML tĩnh
- **images/**: Hình ảnh, logo, biểu tượng
- **pages/**: Các trang HTML độc lập (login, register)

### `/src` - Mã nguồn React
Chứa code React và logic của ứng dụng:
- **assets/**: Tài nguyên được import vào React components
- **hooks/**: Custom React hooks để tái sử dụng logic
- **utils/**: Các hàm tiện ích JavaScript thuần
  - `auth.js`: Xác thực người dùng, validation form
  - `admin.js`: Chức năng quản trị viên
  - `main.js`: Hàm tiện ích chung

## 🔗 Đường dẫn file

### Từ login.html/register.html:
```html
<!-- CSS -->
<link rel="stylesheet" href="../css/style.css">

<!-- Images -->
<img src="../images/logo.png">

<!-- JavaScript -->
<script src="../../src/utils/auth.js"></script>

<!-- Navigation -->
<a href="../../index.html">Về trang chủ</a>
<a href="./login.html">Đăng nhập</a>
<a href="./register.html">Đăng ký</a>
```

## 🚀 Chạy dự án

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm run dev

# Build cho production
npm run build
```

## 📌 Lưu ý
- File `style.css` được dùng chung cho cả trang HTML tĩnh và React components
- File `auth.js` xử lý logic đăng nhập/đăng ký cho cả 2 trang
- Các trang HTML trong `/public/pages` có thể truy cập trực tiếp mà không cần qua React router
