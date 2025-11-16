// Admin Main JavaScript - Logic chung cho tất cả admin pages

// Check admin access - gọi ở mỗi trang admin
async function checkAdminAccess() {
    const session = await window.SupabaseService.getCurrentSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }

    const client = window.SupabaseService.getSupabaseClient();
    const { data: user, error } = await client
        .from('users')
        .select('role, name, email, is_active')
        .eq('user_id', session.user.id)
        .single();

    if (error || !user || user.role !== 'admin') {
        alert('Bạn không có quyền truy cập trang admin!');
        window.location.href = '../index.html';
        return false;
    }

    // Kiểm tra is_active
    if (!user.is_active) {
        alert('Tài khoản của bạn đã bị khóa!');
        await window.SupabaseService.signOut();
        window.location.href = 'login.html';
        return false;
    }

    // Set admin name in sidebar
    const userNameEl = document.getElementById('adminUserName');
    if (userNameEl && user.name) {
        userNameEl.textContent = user.name;
    } else if (userNameEl && user.email) {
        userNameEl.textContent = user.email;
    }

    return true;
}

// Initialize admin navigation
function initAdminNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav a');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage) {
            link.classList.add('active');
        }
    });
}

// Handle admin logout
async function handleAdminLogout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
        await window.SupabaseService.signOut();
        window.location.href = 'login.html';
    }
}

// Show admin alert
function showAdminAlert(message, type = 'info') {
    const alertContainer = document.createElement('div');
    alertContainer.className = `admin-alert alert-${type}`;
    alertContainer.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-${getAlertIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#admin-alert-styles')) {
        const styles = document.createElement('style');
        styles.id = 'admin-alert-styles';
        styles.textContent = `
            .admin-alert {
                position: fixed;
                top: 80px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                padding: 16px;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 320px;
                animation: slideInRight 0.3s ease-out;
            }
            .admin-alert.alert-success { border-left: 4px solid #10b981; }
            .admin-alert.alert-error { border-left: 4px solid #ef4444; }
            .admin-alert.alert-warning { border-left: 4px solid #f59e0b; }
            .admin-alert.alert-info { border-left: 4px solid #3b82f6; }
            .alert-content { display: flex; align-items: center; gap: 12px; }
            .alert-close { background: none; border: none; cursor: pointer; color: #6b7280; }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(alertContainer);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        if (alertContainer.parentNode) {
            alertContainer.remove();
        }
    }, 4000);
}

function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAdminAccess();
    if (hasAccess) {
        initAdminNavigation();
    }
});

// Export functions
window.AdminMain = {
    checkAdminAccess,
    initAdminNavigation,
    handleAdminLogout,
    showAdminAlert
};

