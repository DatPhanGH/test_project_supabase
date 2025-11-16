// JavaScript xác thực cho trang đăng nhập/đăng ký với Supabase

// Đợi Supabase được khởi tạo từ supabase-config.js
window.addEventListener('supabase-ready', function() {
    // Lấy Supabase client từ service đã được khởi tạo
    window.supabaseClient = window.SupabaseService.getSupabaseClient();
    
    // Khởi tạo các form
    initAuthForms();
    initPasswordToggle();
    console.log('✅ Hệ thống xác thực đã được khởi tạo với Supabase');
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
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('username'); // Username field được dùng cho email
    const password = formData.get('password');
    const rememberMe = formData.get('rememberMe') === 'on';
    
    // Hiển thị trạng thái đang tải
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
    submitBtn.disabled = true;
    
    try {
        // Đăng nhập với Supabase
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Đăng nhập thành công
        const userData = {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.full_name || data.user.email.split('@')[0],
            role: data.user.user_metadata?.role || 'user',
            loginTime: new Date().toISOString()
        };
        
        // Lưu trữ dữ liệu người dùng
        localStorage.setItem('currentUser', JSON.stringify(userData));
        if (rememberMe) {
            localStorage.setItem('rememberLogin', 'true');
        }
        
        showAlert('Đăng nhập thành công!', 'success');
        
        // Chuyển hướng về trang chủ
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1500);
        
    } catch (error) {
        // Đăng nhập thất bại
        console.error('Lỗi đăng nhập:', error);
        showAlert(error.message || 'Email hoặc mật khẩu không chính xác!', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Thêm hiệu ứng rung cho form
        const form = e.target;
        form.classList.add('shake');
        setTimeout(() => form.classList.remove('shake'), 600);
    }
}

// Xử lý gửi form đăng ký
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const registerData = {
        fullName: formData.get('fullname'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        // username: formData.get('username'),
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
    
    try {
        // Đăng ký với Supabase
        const { data, error } = await window.supabaseClient.auth.signUp({
            email: registerData.email,
            password: registerData.password,
            options: {
                emailRedirectTo: 'http://localhost:3000/pages/auth-callback.html',
                data: {
                    full_name: registerData.fullName,
                    phone: registerData.phone,
                    // username: registerData.username
                }
            }
        });
        
        if (error) throw error;
        
        // Kiểm tra xem có cần xác thực email không
        if (data.user && data.user.identities && data.user.identities.length === 0) {
            showAlert('Email này đã được đăng ký. Vui lòng đăng nhập.', 'warning');
        } else if (data.session) {
            // Không cần xác thực email, đã có session
            showAlert('Đăng ký thành công! Bạn có thể đăng nhập ngay.', 'success');
        } else {
            // Cần xác thực email
            showAlert('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.', 'info');
        }
        
        // Chuyển hướng đến trang đăng nhập
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 2000);
        
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        showAlert(error.message || 'Đăng ký thất bại. Vui lòng thử lại!', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Hàm validateLogin đã được thay thế bằng Supabase authentication

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
    // if (!data.username || data.username.length < 3) {
    //     errors.push('Tên đăng nhập phải có ít nhất 3 ký tự');
    // }
    
    // Xác thực mật khẩu
    if (!data.password || data.password.length < 6) {
        errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    // Xác thực mật khẩu xác nhận
    if (data.password !== data.confirmPassword) {
        errors.push('Mật khẩu xác nhận không khớp');
    }
    
    // Kiểm tra email/username sẽ được Supabase xử lý tự động
    
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
    
    // Xác thực tên đăng nhập/email trong form đăng nhập
    if (name === 'username' && value && document.getElementById('loginForm')) {
        // Trong trang đăng nhập, field username thực chất là email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Email không hợp lệ';
        }
    }
    
    // Xác thực tên đăng nhập trong form đăng ký
    if (name === 'username' && value && document.getElementById('registerForm')) {
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
async function handleForgotPassword(email) {
    if (!email) {
        showAlert('Vui lòng nhập email của bạn', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('Email không hợp lệ', 'error');
        return;
    }
    
    try {
        const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email);
        if (error) throw error;
        showAlert('Đã gửi email đặt lại mật khẩu. Vui lòng kiểm tra hộp thư của bạn.', 'success');
    } catch (error) {
        showAlert('Không thể gửi email. Vui lòng thử lại.', 'error');
    }
}

// Kiểm tra người dùng đã đăng nhập chưa
async function checkLoginStatus() {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    
    if (session) {
        // Người dùng đã đăng nhập, chuyển hướng
        const user = session.user;
        const role = user.user_metadata?.role || 'user';
        
        if (role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/';
        }
    }
}

// Chức năng đăng xuất
async function logout() {
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberLogin');
        showAlert('Đã đăng xuất thành công', 'success');
        
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    } catch (error) {
        showAlert('Lỗi khi đăng xuất', 'error');
    }
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

// Không tự động check khi vào trang login
// User có thể muốn đăng nhập tài khoản khác
// if (window.location.pathname.includes('login.html')) {
//     checkLoginStatus();
// }

// Xuất các hàm để sử dụng toàn cục
window.AuthSystem = {
    logout,
    handleForgotPassword,
    checkLoginStatus
};
