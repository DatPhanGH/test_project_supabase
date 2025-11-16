// Admin Login JavaScript

document.addEventListener('DOMContentLoaded', function() {
    initAdminLogin();
    initPasswordToggle();
    
    // Check if already logged in as admin
    checkAdminSession();
});

// Initialize admin login form
function initAdminLogin() {
    const loginForm = document.getElementById('adminLoginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', handleAdminLogin);
}

// Handle admin login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const errorDiv = document.getElementById('adminLoginError');
    const submitBtn = document.getElementById('adminLoginBtn');
    
    // Validate
    if (!email || !password) {
        showError('Vui lòng nhập đầy đủ email và mật khẩu');
        return;
    }
    
    // Show loading
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang đăng nhập...';
    submitBtn.disabled = true;
    errorDiv.style.display = 'none';
    
    try {
        // Đăng nhập với Supabase
        const client = window.SupabaseService.getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client chưa được khởi tạo');
        }
        
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Kiểm tra role của user
        const { data: user, error: userError } = await client
            .from('users')
            .select('role, is_active')
            .eq('user_id', data.user.id)
            .single();
        
        if (userError) throw userError;
        
        // Kiểm tra is_active
        if (!user.is_active) {
            await client.auth.signOut();
            throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
        }
        
        // Kiểm tra role
        if (user.role !== 'admin') {
            await client.auth.signOut();
            throw new Error('Tài khoản này không có quyền truy cập trang Admin. Vui lòng đăng nhập tại trang User.');
        }
        
        // Đăng nhập thành công - redirect đến trang quản lý users
        showSuccess('Đăng nhập thành công! Đang chuyển hướng...');
        
        setTimeout(() => {
            window.location.href = 'users.html';
        }, 1000);
        
    } catch (error) {
        console.error('Admin login error:', error);
        showError(error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Check if already logged in as admin
async function checkAdminSession() {
    try {
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) return;
        
        const client = window.SupabaseService.getSupabaseClient();
        const { data: user } = await client
            .from('users')
            .select('role, is_active')
            .eq('user_id', session.user.id)
            .single();
        
        if (user && user.role === 'admin' && user.is_active) {
            // Already logged in as admin, redirect to users page
            window.location.href = 'users.html';
        }
    } catch (error) {
        // Ignore error, just stay on login page
        console.log('Session check:', error);
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('adminLoginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Show success message
function showSuccess(message) {
    const errorDiv = document.getElementById('adminLoginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.className = 'success-message';
    }
}

// Initialize password toggle
function initPasswordToggle() {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('adminPassword');
    
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }
}

