// JavaScript xác thực cho trang đăng nhập/đăng ký

document.addEventListener('DOMContentLoaded', function() {
    initAuthForms();
    initPasswordToggle();
    initSocialLogin();
    console.log('Hệ thống xác thực đã được khởi tạo');
});

// Khởi tạo các form xác thực
function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Thêm xác thực đầu vào
    initInputValidation();
}

// Xử lý gửi form đăng nhập
function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe') === 'on'
    };
    
    // Hiển thị trạng thái đang tải
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
    submitBtn.disabled = true;
    
    // Mô phỏng gọi API
    setTimeout(() => {
        // Xác thực giả lập
        if (validateLogin(loginData)) {
            // Đăng nhập thành công
            const userData = {
                id: 1,
                username: loginData.username,
                email: loginData.username.includes('@') ? loginData.username : `${loginData.username}@example.com`,
                role: loginData.username.toLowerCase() === 'admin' ? 'admin' : 'user',
                loginTime: new Date().toISOString()
            };
            
            // Lưu trữ dữ liệu người dùng
            localStorage.setItem('currentUser', JSON.stringify(userData));
            if (loginData.rememberMe) {
                localStorage.setItem('rememberLogin', 'true');
            }
            
            showAlert('Đăng nhập thành công!', 'success');
            
            // Chuyển hướng dựa trên vai trò
            setTimeout(() => {
                if (userData.role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'index.html';
                }
            }, 1500);
        } else {
            // Đăng nhập thất bại
            showAlert('Tên đăng nhập hoặc mật khẩu không chính xác!', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            // Thêm hiệu ứng rung cho form
            const form = e.target;
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 600);
        }
    }, 1500);
}

// Xử lý gửi form đăng ký
function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const registerData = {
        fullName: formData.get('fullname'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        username: formData.get('username'),
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    // Xác thực dữ liệu đăng ký
    if (!validateRegistration(registerData)) {
        return;
    }
    
    // Hiển thị trạng thái đang tải
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng ký...';
    submitBtn.disabled = true;
    
    // Mô phỏng gọi API
    setTimeout(() => {
        // Mô phỏng đăng ký thành công
        const userData = {
            id: Date.now(),
            fullName: registerData.fullName,
            email: registerData.email,
            username: registerData.username,
            role: 'user',
            registrationDate: new Date().toISOString(),
            isVerified: false
        };
        
        // Lưu trữ dữ liệu người dùng
        localStorage.setItem('pendingUser', JSON.stringify(userData));
        
        showAlert('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.', 'success');
        
        // Chuyển hướng đến trang đăng nhập
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }, 1500);
}

// Xác thực thông tin đăng nhập
function validateLogin(loginData) {
    // Xác thực giả lập - trong ứng dụng thực tế, đây sẽ là một lời gọi API
    const validCredentials = [
        { username: 'admin', password: 'admin123' },
        { username: 'user@test.com', password: 'user123' },
        { username: 'demo', password: 'demo123' }
    ];
    
    return validCredentials.some(cred => 
        (cred.username === loginData.username && cred.password === loginData.password)
    );
}

// Xác thực dữ liệu đăng ký
function validateRegistration(data) {
    const errors = [];
    
    // Xác thực họ tên
    if (!data.fullName || data.fullName.trim().length < 2) {
        errors.push('Họ tên phải có ít nhất 2 ký tự');
    }
    
    // Xác thực email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        errors.push('Email không hợp lệ');
    }
    
    // Xác thực tên đăng nhập
    if (!data.username || data.username.length < 3) {
        errors.push('Tên đăng nhập phải có ít nhất 3 ký tự');
    }
    
    // Xác thực mật khẩu
    if (!data.password || data.password.length < 6) {
        errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    // Xác thực mật khẩu xác nhận
    if (data.password !== data.confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
    }
    
    // Kiểm tra email/tên đăng nhập đã tồn tại (giả lập)
    const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    if (existingUsers.some(user => user.email === data.email)) {
        errors.push('Email đã được sử dụng');
    }
    if (existingUsers.some(user => user.username === data.username)) {
        errors.push('Tên đăng nhập đã được sử dụng');
    }
    
    if (errors.length > 0) {
        showAlert(errors.join('<br>'), 'error');
        return false;
    }
    
    return true;
}

// Khởi tạo chức năng bật/tắt hiển thị mật khẩu
function initPasswordToggle() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Khởi tạo đăng nhập mạng xã hội
function initSocialLogin() {
    const googleBtn = document.querySelector('.btn-google');
    const facebookBtn = document.querySelector('.btn-facebook');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleLogin);
    }
    
    if (facebookBtn) {
        facebookBtn.addEventListener('click', handleFacebookLogin);
    }
}

// Xử lý đăng nhập Google
function handleGoogleLogin() {
    showAlert('Tính năng đăng nhập Google đang được phát triển', 'info');
    
    // Trong triển khai thực tế, bạn sẽ tích hợp với Google OAuth
    // Ví dụ:
    // gapi.load('auth2', function() {
    //     gapi.auth2.init({
    //         client_id: 'YOUR_GOOGLE_CLIENT_ID'
    //     });
    // });
}

// Xử lý đăng nhập Facebook
function handleFacebookLogin() {
    showAlert('Tính năng đăng nhập Facebook đang được phát triển', 'info');
    
    // Trong triển khai thực tế, bạn sẽ tích hợp với Facebook SDK
    // Ví dụ:
    // FB.login(function(response) {
    //     if (response.authResponse) {
    //         console.log('Chào mừng! Đang lấy thông tin của bạn...');
    //         FB.api('/me', function(response) {
    //             console.log('Rất vui được gặp bạn, ' + response.name + '.');
    //         });
    //     }
    // });
}

// Khởi tạo xác thực đầu vào
function initInputValidation() {
    const inputs = document.querySelectorAll('input[required]');
    
    inputs.forEach(input => {
        // Thêm xác thực thời gian thực
        input.addEventListener('blur', function() {
            validateInput(this);
        });
        
        input.addEventListener('input', function() {
            // Xóa trạng thái lỗi khi nhập
            this.classList.remove('error');
            const errorMsg = this.parentElement.parentElement.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        });
    });
}

// Xác thực từng đầu vào riêng lẻ
function validateInput(input) {
    const value = input.value.trim();
    const type = input.type;
    const name = input.name;
    let isValid = true;
    let errorMessage = '';
    
    // Xác thực trường bắt buộc
    if (input.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'Trường này là bắt buộc';
    }
    
    // Xác thực email
    if (type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Email không hợp lệ';
        }
    }
    
    // Xác thực mật khẩu
    if (type === 'password' && value) {
        if (value.length < 6) {
            isValid = false;
            errorMessage = 'Mật khẩu phải có ít nhất 6 ký tự';
        }
    }
    
    // Xác thực mật khẩu xác nhận
    if (name === 'confirmPassword' && value) {
        const passwordInput = document.querySelector('input[name="password"]');
        if (passwordInput && value !== passwordInput.value) {
            isValid = false;
            errorMessage = 'Mật khẩu xác nhận không khớp';
        }
    }
    
    // Xác thực tên đăng nhập
    if (name === 'username' && value) {
        if (value.length < 3) {
            isValid = false;
            errorMessage = 'Tên đăng nhập phải có ít nhất 3 ký tự';
        } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
            isValid = false;
            errorMessage = 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới';
        }
    }
    
    // Cập nhật giao diện dựa trên xác thực
    if (!isValid) {
        input.classList.add('error');
        showInputError(input, errorMessage);
    } else {
        input.classList.remove('error');
        clearInputError(input);
    }
    
    return isValid;
}

// Hiển thị thông báo lỗi đầu vào
function showInputError(input, message) {
    const formGroup = input.parentElement.parentElement;
    let errorDiv = formGroup.querySelector('.error-message');
    
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        formGroup.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
}

// Xóa thông báo lỗi đầu vào
function clearInputError(input) {
    const formGroup = input.parentElement.parentElement;
    const errorDiv = formGroup.querySelector('.error-message');
    
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Chức năng quên mật khẩu
function handleForgotPassword(email) {
    if (!email) {
        showAlert('Vui lòng nhập email của bạn', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Email không hợp lệ', 'error');
        return;
    }
    
    // Mô phỏng gửi email đặt lại mật khẩu
    showAlert('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.', 'success');
}

// Kiểm tra người dùng đã đăng nhập chưa
function checkLoginStatus() {
    const currentUser = localStorage.getItem('currentUser');
    const rememberLogin = localStorage.getItem('rememberLogin');
    
    if (currentUser && rememberLogin) {
        const user = JSON.parse(currentUser);
        
        // Chuyển hướng dựa trên vai trò
        if (user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

// Chức năng đăng xuất
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberLogin');
    showAlert('Đã đăng xuất thành công', 'success');
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Hàm tiện ích để hiển thị thông báo (giống như main.js)
function showAlert(message, type = 'info') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type}`;
    alertContainer.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${getAlertIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Thêm styles nếu chưa có
    if (!document.querySelector('#alert-styles')) {
        const styles = document.createElement('style');
        styles.id = 'alert-styles';
        styles.textContent = `
            .alert {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 16px;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                animation: slideInRight 0.3s ease-out;
            }
            .alert-success { border-left: 4px solid #10b981; }
            .alert-error { border-left: 4px solid #ef4444; }
            .alert-warning { border-left: 4px solid #f59e0b; }
            .alert-info { border-left: 4px solid #3b82f6; }
            .alert-content { display: flex; align-items: center; gap: 12px; }
            .alert-close { background: none; border: none; cursor: pointer; color: #6b7280; }
            .error-message { color: #ef4444; font-size: 0.85rem; margin-top: 4px; }
            .input-group input.error { border-color: #ef4444; }
            .shake { animation: shake 0.6s ease-in-out; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                20%, 40%, 60%, 80% { transform: translateX(5px); }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(alertContainer);
    
    // Tự động xóa sau 5 giây
    setTimeout(() => {
        if (alertContainer.parentNode) {
            alertContainer.remove();
        }
    }, 5000);
}

// Lấy biểu tượng thông báo dựa trên loại
function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Kiểm tra trạng thái đăng nhập khi tải trang
if (window.location.pathname.includes('login.html')) {
    checkLoginStatus();
}

// Xuất các hàm để sử dụng toàn cục
window.AuthSystem = {
    logout,
    handleForgotPassword,
    checkLoginStatus
};
