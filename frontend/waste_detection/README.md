# Waste Detection & Classification System

Hệ thống phân loại rác thải thông minh sử dụng AI và React.

## Công nghệ sử dụng

- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI/ML**: TensorFlow.js hoặc Backend API

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Copy file .env.example thành .env và cấu hình
cp .env.example .env

# Chạy development server
npm run dev

# Build production
npm run build
```

## Cấu trúc dự án React

```
waste_detection/
├── public/                 # Static files (favicon, images không cần import)
├── src/                    # Source code chính
│   ├── assets/            # Tài nguyên tĩnh (images, icons, fonts cần import)
│   ├── components/        # React components tái sử dụng
│   ├── contexts/          # React Context API (quản lý state global)
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Các trang chính (routing)
│   ├── services/          # API services, kết nối backend
│   ├── styles/            # CSS/SCSS files
│   ├── utils/             # Utility functions, helper functions
│   ├── App.jsx            # Root component, định nghĩa routes
│   └── main.jsx           # Entry point, render App vào DOM
├── .env                   # Environment variables (không commit)
├── .env.example           # Template cho .env
├── package.json           # Dependencies và scripts
├── vite.config.js         # Vite configuration
└── index.html             # HTML template entry point
```

## Giải thích các thư mục React

### 📁 `src/` - Thư mục gốc source code
- Chứa toàn bộ code React
- **Cách hoạt động**: Vite sẽ bundle tất cả file từ đây thành production build
- **Lưu ý**: Mọi file trong `src/` đều phải được import, không thể truy cập trực tiếp qua URL

### 📁 `public/` - Thư mục static files
- **Cách hoạt động**: Files ở đây được copy trực tiếp vào build folder, không qua Vite processing
- **Sử dụng cho**: favicon.ico, robots.txt, manifest.json, hình ảnh không cần optimize
- **Truy cập**: Dùng absolute path, ví dụ: `/logo.png` → trỏ đến `public/logo.png`
- **Ví dụ**:
  ```html
  <!-- Trong HTML -->
  <img src="/images/logo.png" />
  
  <!-- KHÔNG import trong React -->
  ```

### 📁 `src/assets/` - Tài nguyên cần import
- **Cách hoạt động**: Files được Vite optimize (compress, hash filename)
- **Sử dụng cho**: Images, icons, fonts cần trong components
- **Truy cập**: Phải import vào component
- **Ví dụ**:
  ```jsx
  import logo from './assets/logo.png'
  
  function Header() {
    return <img src={logo} alt="Logo" />
  }
  ```

### 📁 `src/components/` - React Components tái sử dụng
- **Mục đích**: Chứa các UI components dùng ở nhiều nơi
- **Quy tắc**: Mỗi component 1 file, có thể group theo folder
- **Ví dụ**:
  ```
  components/
  ├── Button.jsx              # Component đơn
  ├── Card/                   # Component phức tạp có folder riêng
  │   ├── Card.jsx           # Component chính
  │   ├── CardHeader.jsx     # Sub-component
  │   └── Card.module.css    # CSS riêng
  └── Form/
      ├── Input.jsx
      ├── Select.jsx
      └── Checkbox.jsx
  ```

### 📁 `src/pages/` - Các trang/màn hình chính
- **Mục đích**: Mỗi page tương ứng với 1 route trong ứng dụng
- **Cách hoạt động**: Được import vào React Router
- **Ví dụ**:
  ```
  pages/
  ├── Home.jsx        → route: "/"
  ├── Login.jsx       → route: "/login"
  ├── Register.jsx    → route: "/register"
  └── Admin.jsx       → route: "/admin"
  ```
  ```jsx
  // Trong App.jsx
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
  </Routes>
  ```

### 📁 `src/contexts/` - React Context API
- **Mục đích**: Quản lý state global (shared state)
- **Cách hoạt động**: Tạo Provider bọc App, components con dùng useContext
- **Sử dụng cho**: Authentication, Theme, Language, Shopping Cart...
- **Ví dụ**:
  ```jsx
  // AuthContext.jsx
  export const AuthContext = createContext()
  
  export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    return (
      <AuthContext.Provider value={{ user, setUser }}>
        {children}
      </AuthContext.Provider>
    )
  }
  
  // Sử dụng trong component
  const { user } = useContext(AuthContext)
  ```

### 📁 `src/hooks/` - Custom React Hooks
- **Mục đích**: Tái sử dụng logic giữa các components
- **Quy tắc**: Tên hook phải bắt đầu bằng `use`
- **Ví dụ**:
  ```jsx
  // useLocalStorage.js
  export function useLocalStorage(key, initialValue) {
    const [value, setValue] = useState(() => {
      return localStorage.getItem(key) || initialValue
    })
    
    const updateValue = (newValue) => {
      setValue(newValue)
      localStorage.setItem(key, newValue)
    }
    
    return [value, updateValue]
  }
  
  // Sử dụng
  const [theme, setTheme] = useLocalStorage('theme', 'light')
  ```

### 📁 `src/services/` - API Services
- **Mục đích**: Centralize các API calls, kết nối backend
- **Cách hoạt động**: Export functions để gọi API
- **Ví dụ**:
  ```jsx
  // supabase.js
  import { createClient } from '@supabase/supabase-js'
  export const supabase = createClient(URL, KEY)
  
  // authService.js
  export async function loginUser(email, password) {
    const { data, error } = await supabase.auth.signIn({
      email, password
    })
    return { data, error }
  }
  ```

### 📁 `src/utils/` - Utility Functions
- **Mục đích**: Pure functions, helper functions không liên quan React
- **Ví dụ**:
  ```jsx
  // formatDate.js
  export function formatDate(date) {
    return new Date(date).toLocaleDateString('vi-VN')
  }
  
  // validation.js
  export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
  ```

### 📁 `src/styles/` - CSS Files
- **Cách tổ chức**:
  ```
  styles/
  ├── global.css          # Global styles, reset CSS
  ├── variables.css       # CSS variables (colors, fonts...)
  └── themes/            # Theme variants
      ├── light.css
      └── dark.css
  ```

### 📄 `src/main.jsx` - Entry Point
- **Vai trò**: File đầu tiên được execute
- **Nhiệm vụ**: Render React App vào DOM
- **Ví dụ**:
  ```jsx
  import React from 'react'
  import ReactDOM from 'react-dom/client'
  import App from './App.jsx'
  import './styles/global.css'
  
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  ```

### 📄 `src/App.jsx` - Root Component
- **Vai trò**: Component gốc của ứng dụng
- **Nhiệm vụ**: Setup routing, context providers
- **Ví dụ**:
  ```jsx
  import { BrowserRouter, Routes, Route } from 'react-router-dom'
  import { AuthProvider } from './contexts/AuthContext'
  
  function App() {
    return (
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    )
  }
  ```

## Quy tắc đặt tên (Naming Conventions)

### 📂 Thư mục (Folders)
- **Quy tắc**: `lowercase`, `kebab-case` hoặc `camelCase`
- **Ví dụ**:
  ```
  ✅ components/
  ✅ user-profile/
  ✅ wasteCategories/
  ❌ UserProfile/
  ❌ Waste_Categories/
  ```

### 📄 Files

#### React Components
- **Quy tắc**: `PascalCase` (viết hoa chữ cái đầu mỗi từ)
- **Extension**: `.jsx` hoặc `.tsx` (TypeScript)
- **Ví dụ**:
  ```
  ✅ Button.jsx
  ✅ UserProfile.jsx
  ✅ WasteCard.jsx
  ❌ button.jsx
  ❌ user-profile.jsx
  ```

#### JavaScript/Service Files
- **Quy tắc**: `camelCase` (chữ thường, viết hoa chữ cái đầu từ thứ 2)
- **Ví dụ**:
  ```
  ✅ authService.js
  ✅ formatDate.js
  ✅ useLocalStorage.js
  ❌ AuthService.js
  ❌ format-date.js
  ```

#### CSS Files
- **Quy tắc**: `kebab-case` hoặc `camelCase`
- **Ví dụ**:
  ```
  ✅ global.css
  ✅ button-styles.css
  ✅ Card.module.css    (CSS Modules)
  ```

### ⚙️ Functions & Variables

#### React Components
- **Quy tắc**: `PascalCase`
- **Ví dụ**:
  ```jsx
  ✅ function UserProfile() {}
  ✅ const WasteCard = () => {}
  ❌ function userProfile() {}
  ```

#### Regular Functions
- **Quy tắc**: `camelCase`
- **Ví dụ**:
  ```jsx
  ✅ function handleSubmit() {}
  ✅ const formatDate = () => {}
  ✅ async function fetchUserData() {}
  ❌ function HandleSubmit() {}
  ❌ function format_date() {}
  ```

#### Variables
- **Quy tắc**: `camelCase`
- **Ví dụ**:
  ```jsx
  ✅ const userName = 'John'
  ✅ let imageUrl = '/photo.jpg'
  ✅ const isLoggedIn = true
  ❌ const UserName = 'John'
  ❌ const image_url = '/photo.jpg'
  ```

#### Constants
- **Quy tắc**: `UPPER_SNAKE_CASE` (chữ hoa, gạch dưới)
- **Ví dụ**:
  ```jsx
  ✅ const API_URL = 'https://api.example.com'
  ✅ const MAX_FILE_SIZE = 5000000
  ✅ const WASTE_CATEGORIES = ['recyclable', 'organic']
  ❌ const apiUrl = 'https://...'
  ❌ const maxFileSize = 5000000
  ```

#### Event Handlers
- **Quy tắc**: Bắt đầu bằng `handle` + hành động
- **Ví dụ**:
  ```jsx
  ✅ const handleClick = () => {}
  ✅ const handleSubmit = () => {}
  ✅ const handleInputChange = () => {}
  ❌ const onClick = () => {}
  ❌ const submit = () => {}
  ```

#### Boolean Variables
- **Quy tắc**: Bắt đầu bằng `is`, `has`, `should`, `can`
- **Ví dụ**:
  ```jsx
  ✅ const isLoading = true
  ✅ const hasError = false
  ✅ const canEdit = true
  ✅ const shouldShowModal = false
  ❌ const loading = true
  ❌ const error = false
  ```

### 🎣 Custom Hooks
- **Quy tắc**: Bắt đầu bằng `use` + tên hook (PascalCase)
- **Ví dụ**:
  ```jsx
  ✅ useAuth()
  ✅ useLocalStorage()
  ✅ useFetchData()
  ❌ authHook()
  ❌ getAuth()
  ```

### 🔌 Context
- **Quy tắc**: Tên + `Context` (PascalCase)
- **Ví dụ**:
  ```jsx
  ✅ AuthContext
  ✅ ThemeContext
  ✅ WasteDataContext
  ❌ authContext
  ❌ Auth_Context
  ```

### 📦 Props
- **Quy tắc**: `camelCase`, mô tả rõ ràng
- **Ví dụ**:
  ```jsx
  ✅ <Button onClick={handleClick} isDisabled={false} />
  ✅ <Card title="Waste" imageUrl="/photo.jpg" />
  ❌ <Button click={handleClick} disabled={false} />
  ❌ <Card Title="Waste" image_url="/photo.jpg" />
  ```

## Best Practices

### ✨ Component Structure
```jsx
// 1. Imports
import { useState, useEffect } from 'react'
import Button from './components/Button'
import { formatDate } from './utils/formatDate'
import './styles/Home.css'

// 2. Component
function Home() {
  // 3. State & hooks
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  
  // 4. Effects
  useEffect(() => {
    fetchData()
  }, [])
  
  // 5. Event handlers
  const handleClick = () => {
    console.log('Clicked')
  }
  
  // 6. Helper functions
  function processData() {
    return data.map(item => item.name)
  }
  
  // 7. Render
  return (
    <div>
      <h1>Home</h1>
      <Button onClick={handleClick} />
    </div>
  )
}

// 8. Export
export default Home
```

### 🎯 Import Order
```jsx
// 1. React imports
import React, { useState, useEffect } from 'react'

// 2. Third-party libraries
import { BrowserRouter, Routes } from 'react-router-dom'

// 3. Internal imports - Components
import Header from './components/Header'
import Button from './components/Button'

// 4. Internal imports - Contexts/Hooks
import { useAuth } from './hooks/useAuth'
import { AuthContext } from './contexts/AuthContext'

// 5. Internal imports - Services/Utils
import { supabase } from './services/supabase'
import { formatDate } from './utils/formatDate'

// 6. CSS imports (cuối cùng)
import './styles/App.css'
```

## Database Schema

Xem file `database_waste_detection.txt` để biết chi tiết về cấu trúc database.

## Features

- 🔐 Authentication (Login/Register)
- 📸 Upload và phân loại ảnh rác thải
- 🤖 AI prediction với confidence score
- 📊 Admin dashboard
- 💬 Feedback system
- 🗑️ Waste category management
