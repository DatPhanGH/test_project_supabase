// Admin Users Management JavaScript

// ============================================
// 1. LẤY DANH SÁCH USERS
// ============================================
/**
 * Lấy danh sách tất cả users (chỉ admin mới có quyền)
 * @param {Object} filters - Bộ lọc (search, role, is_active)
 * @returns {Promise<Array>} Danh sách users
 */
async function getAllUsers(filters = {}) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        // Kiểm tra quyền admin trước
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) throw new Error('Chưa đăng nhập');
        
        console.log('🔍 Checking admin access for user:', session.user.id);
        
        const { data: currentUser, error: currentUserError } = await client
            .from('users')
            .select('role, is_active')
            .eq('user_id', session.user.id)
            .single();
        
        if (currentUserError) {
            console.error('Error checking current user:', currentUserError);
            throw new Error('Không thể kiểm tra quyền truy cập: ' + currentUserError.message);
        }
        
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Bạn không có quyền truy cập');
        }
        
        if (!currentUser.is_active) {
            throw new Error('Tài khoản của bạn đã bị khóa');
        }
        
        console.log('✅ Admin access confirmed. Fetching all users...');
        
        // Bắt đầu query - không dùng filter trước để xem có lấy được tất cả không
        let query = client
            .from('users')
            .select('user_id, name, email, role, is_active, avatar_url, created_at, updated_at');
        
        // Áp dụng filters
        if (filters.role && filters.role !== 'all') {
            query = query.eq('role', filters.role);
        }
        
        if (filters.is_active !== undefined && filters.is_active !== null) {
            query = query.eq('is_active', filters.is_active);
        }
        
        // Order sau khi filter
        query = query.order('created_at', { ascending: false });
        
        console.log('📤 Executing query with filters:', filters);
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ Query error:', error);
            throw error;
        }
        
        console.log(`✅ Retrieved ${data?.length || 0} users from database`);
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No users returned. This might be an RLS policy issue.');
            console.warn('Please check:');
            console.warn('1. RLS is enabled on users table');
            console.warn('2. Admin policy allows SELECT all users');
            console.warn('3. Current user has role = "admin" and is_active = true');
        } else {
            console.log('📋 Users retrieved:', data.map(u => ({ id: u.user_id.substring(0, 8), email: u.email, role: u.role })));
        }
        
        // Filter by search term ở client nếu có
        let filteredData = data || [];
        if (filters.search && filters.search.trim() !== '') {
            const searchTerm = filters.search.trim().toLowerCase();
            filteredData = filteredData.filter(user => 
                (user.name && user.name.toLowerCase().includes(searchTerm)) ||
                (user.email && user.email.toLowerCase().includes(searchTerm))
            );
            console.log(`🔍 After search filter: ${filteredData.length} users`);
        }
        
        return filteredData;
    } catch (error) {
        console.error('❌ Error getting users:', error);
        throw error;
    }
}

// ============================================
// 2. KHÓA/MỞ KHÓA TÀI KHOẢN (Cập nhật is_active)
// ============================================
/**
 * Khóa hoặc mở khóa tài khoản user
 * @param {string} userId - UUID của user
 * @param {boolean} isActive - true = mở khóa, false = khóa
 * @returns {Promise<Object>} User đã được cập nhật
 */
async function updateUserActiveStatus(userId, isActive) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        // Kiểm tra quyền admin
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) throw new Error('Chưa đăng nhập');
        
        const { data: currentUser } = await client
            .from('users')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
        
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Bạn không có quyền thực hiện thao tác này');
        }
        
        // Không cho phép khóa chính mình
        if (userId === session.user.id) {
            throw new Error('Bạn không thể khóa tài khoản của chính mình');
        }
        
        // Cập nhật is_active
        const { data, error } = await client
            .from('users')
            .update({ 
                is_active: isActive,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error updating user active status:', error);
        throw error;
    }
}

/**
 * Khóa tài khoản user
 * @param {string} userId - UUID của user
 * @returns {Promise<Object>} User đã được khóa
 */
async function lockUser(userId) {
    return await updateUserActiveStatus(userId, false);
}

/**
 * Mở khóa tài khoản user
 * @param {string} userId - UUID của user
 * @returns {Promise<Object>} User đã được mở khóa
 */
async function unlockUser(userId) {
    return await updateUserActiveStatus(userId, true);
}

// ============================================
// 3. THAY ĐỔI ROLE (user/admin)
// ============================================
/**
 * Thay đổi role của user
 * @param {string} userId - UUID của user
 * @param {string} newRole - 'user' hoặc 'admin'
 * @returns {Promise<Object>} User đã được cập nhật
 */
async function updateUserRole(userId, newRole) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        // Validate role
        if (newRole !== 'user' && newRole !== 'admin') {
            throw new Error('Role không hợp lệ. Chỉ chấp nhận "user" hoặc "admin"');
        }
        
        // Kiểm tra quyền admin
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) throw new Error('Chưa đăng nhập');
        
        const { data: currentUser } = await client
            .from('users')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
        
        if (!currentUser || currentUser.role !== 'admin') {
            throw new Error('Bạn không có quyền thực hiện thao tác này');
        }
        
        // Không cho phép thay đổi role của chính mình
        if (userId === session.user.id) {
            throw new Error('Bạn không thể thay đổi role của chính mình');
        }
        
        // Kiểm tra xem có admin nào khác không (nếu đang downgrade admin cuối cùng)
        if (newRole === 'user') {
            const { data: targetUser } = await client
                .from('users')
                .select('role')
                .eq('user_id', userId)
                .single();
            
            if (targetUser && targetUser.role === 'admin') {
                // Đếm tổng số admin active trong hệ thống
                const { count: totalAdminCount, error: countError } = await client
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('role', 'admin')
                    .eq('is_active', true);
                
                if (countError) {
                    console.error('Error counting admins:', countError);
                    throw new Error('Không thể kiểm tra số lượng admin. Vui lòng thử lại.');
                }
                
                // Nếu tổng số admin <= 1, không cho phép hạ quyền
                // (Nếu chỉ có 1 admin duy nhất, không thể hạ quyền vì sẽ không còn admin nào)
                // (Nếu có 2 admin trở lên, sau khi hạ quyền 1 admin vẫn còn ít nhất 1 admin khác)
                if (totalAdminCount <= 1) {
                    throw new Error('Không thể hạ quyền admin cuối cùng. Hệ thống cần ít nhất 1 admin.');
                }
                
                // Nếu có >= 2 admin, cho phép hạ quyền
                // (Admin hiện tại vẫn sẽ còn sau khi hạ quyền user kia)
                console.log(`✅ Total admins: ${totalAdminCount}. Allowing demotion.`);
            }
        }
        
        // Cập nhật role
        const { data, error } = await client
            .from('users')
            .update({ 
                role: newRole,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error updating user role:', error);
        throw error;
    }
}

/**
 * Nâng quyền user lên admin
 * @param {string} userId - UUID của user
 * @returns {Promise<Object>} User đã được nâng quyền
 */
async function promoteToAdmin(userId) {
    return await updateUserRole(userId, 'admin');
}

/**
 * Hạ quyền admin xuống user
 * @param {string} userId - UUID của user
 * @returns {Promise<Object>} User đã được hạ quyền
 */
async function demoteToUser(userId) {
    return await updateUserRole(userId, 'user');
}

// ============================================
// 4. HIỂN THỊ DANH SÁCH USERS TRONG TABLE
// ============================================
/**
 * Load và hiển thị danh sách users vào table
 * @param {Object} filters - Bộ lọc
 */
async function loadUsersTable(filters = {}) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">Đang tải...</td></tr>';
        
        const users = await getAllUsers(filters);
        
        if (!users || users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">Không có user nào</td></tr>';
            return;
        }
        
        tableBody.innerHTML = users.map(user => {
            const createdDate = new Date(user.created_at).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const statusBadge = user.is_active 
                ? '<span class="badge badge-success">Hoạt động</span>'
                : '<span class="badge badge-danger">Đã khóa</span>';
            const roleBadge = user.role === 'admin'
                ? '<span class="badge badge-admin">Admin</span>'
                : '<span class="badge badge-user">User</span>';
            
            // Get current user ID to disable actions on own row
            const currentUserId = window.SupabaseService.getCurrentSession().then(s => s?.user?.id).catch(() => null);
            const isCurrentUser = false; // Will be set dynamically
            
            return `
                <tr data-user-id="${user.user_id}">
                    <td>${user.user_id.substring(0, 8)}...</td>
                    <td>${user.name || 'N/A'}</td>
                    <td>${user.email}</td>
                    <td>${roleBadge}</td>
                    <td>${statusBadge}</td>
                    <td>${createdDate}</td>
                    <td class="actions-cell">
                        <div class="action-buttons">
                            ${user.is_active 
                                ? `<button class="btn-admin btn-danger btn-sm" onclick="handleLockUser('${user.user_id}')" title="Khóa tài khoản">
                                    <i class="fas fa-lock"></i>
                                   </button>`
                                : `<button class="btn-admin btn-success btn-sm" onclick="handleUnlockUser('${user.user_id}')" title="Mở khóa tài khoản">
                                    <i class="fas fa-unlock"></i>
                                   </button>`
                            }
                            ${user.role === 'user'
                                ? `<button class="btn-admin btn-primary btn-sm" onclick="handlePromoteAdmin('${user.user_id}')" title="Nâng lên Admin">
                                    <i class="fas fa-user-shield"></i>
                                   </button>`
                                : `<button class="btn-admin btn-warning btn-sm" onclick="handleDemoteUser('${user.user_id}')" title="Hạ xuống User">
                                    <i class="fas fa-user"></i>
                                   </button>`
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Disable actions for current user
        setTimeout(async () => {
            const session = await window.SupabaseService.getCurrentSession();
            if (session) {
                const rows = document.querySelectorAll(`tr[data-user-id="${session.user.id}"]`);
                rows.forEach(row => {
                    const buttons = row.querySelectorAll('.action-buttons button');
                    buttons.forEach(btn => {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                        btn.title = 'Không thể thao tác trên tài khoản của chính mình';
                    });
                });
            }
        }, 100);
        
    } catch (error) {
        console.error('Error loading users table:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="error-text">Lỗi: ${error.message}</td></tr>`;
        window.AdminMain.showAdminAlert('Lỗi khi tải danh sách users: ' + error.message, 'error');
    }
}

// ============================================
// 5. HANDLERS CHO CÁC BUTTON ACTIONS
// ============================================
/**
 * Handler cho nút khóa user
 */
async function handleLockUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) {
        return;
    }
    
    try {
        await lockUser(userId);
        window.AdminMain.showAdminAlert('Đã khóa tài khoản thành công', 'success');
        await loadUsersTable(getCurrentFilters());
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

/**
 * Handler cho nút mở khóa user
 */
async function handleUnlockUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn mở khóa tài khoản này?')) {
        return;
    }
    
    try {
        await unlockUser(userId);
        window.AdminMain.showAdminAlert('Đã mở khóa tài khoản thành công', 'success');
        await loadUsersTable(getCurrentFilters());
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

/**
 * Handler cho nút nâng lên admin
 */
async function handlePromoteAdmin(userId) {
    if (!confirm('Bạn có chắc chắn muốn nâng quyền user này lên Admin?')) {
        return;
    }
    
    try {
        await promoteToAdmin(userId);
        window.AdminMain.showAdminAlert('Đã nâng quyền lên Admin thành công', 'success');
        await loadUsersTable(getCurrentFilters());
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

/**
 * Handler cho nút hạ xuống user
 */
async function handleDemoteUser(userId) {
    if (!confirm('Bạn có chắc chắn muốn hạ quyền Admin này xuống User?')) {
        return;
    }
    
    try {
        await demoteToUser(userId);
        window.AdminMain.showAdminAlert('Đã hạ quyền xuống User thành công', 'success');
        await loadUsersTable(getCurrentFilters());
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

// ============================================
// 6. FILTERS HANDLING
// ============================================
function getCurrentFilters() {
    const activeFilter = document.getElementById('activeFilter');
    return {
        search: document.getElementById('userSearch')?.value || '',
        role: document.getElementById('roleFilter')?.value || 'all',
        is_active: activeFilter && activeFilter.value !== 'all' 
            ? activeFilter.value === 'true' 
            : undefined
    };
}

// ============================================
// 7. INITIALIZE - Gọi khi trang load
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load users table
    await loadUsersTable();
    
    // Setup search filter
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadUsersTable(getCurrentFilters());
            }, 500); // Debounce 500ms
        });
    }
    
    // Setup role filter
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', () => {
            loadUsersTable(getCurrentFilters());
        });
    }
    
    // Setup active filter (nếu có)
    const activeFilter = document.getElementById('activeFilter');
    if (activeFilter) {
        activeFilter.addEventListener('change', () => {
            loadUsersTable(getCurrentFilters());
        });
    }
});

// Export functions để sử dụng global
window.AdminUsers = {
    getAllUsers,
    lockUser,
    unlockUser,
    updateUserActiveStatus,
    updateUserRole,
    promoteToAdmin,
    demoteToUser,
    loadUsersTable,
    handleLockUser,
    handleUnlockUser,
    handlePromoteAdmin,
    handleDemoteUser,
    getCurrentFilters
};

