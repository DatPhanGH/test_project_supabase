// Admin Waste Categories Management JavaScript

// ============================================
// 1. LẤY DANH SÁCH CATEGORIES
// ============================================
/**
 * Lấy danh sách tất cả waste categories
 * @returns {Promise<Array>} Danh sách categories
 */
async function getAllCategories() {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        const { data, error } = await client
            .from('waste_categories')
            .select('*')
            .order('category_id', { ascending: true });
        
        if (error) throw error;
        
        console.log(`✅ Retrieved ${data?.length || 0} categories from database`);
        return data || [];
    } catch (error) {
        console.error('❌ Error getting categories:', error);
        throw error;
    }
}

// ============================================
// 2. THÊM CATEGORY MỚI
// ============================================
/**
 * Thêm waste category mới
 * @param {Object} categoryData - Dữ liệu category
 * @returns {Promise<Object>} Category đã được tạo
 */
async function addCategory(categoryData) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        // Validate
        if (!categoryData.name || categoryData.name.trim() === '') {
            throw new Error('Tên loại rác là bắt buộc');
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
        
        // Chuẩn bị dữ liệu
        const insertData = {
            name: categoryData.name.trim(),
            description: categoryData.description?.trim() || null,
            bin_color: categoryData.bin_color?.trim() || null,
            guide_text: categoryData.guide_text?.trim() || null
        };
        
        // Insert vào database
        const { data, error } = await client
            .from('waste_categories')
            .insert([insertData])
            .select()
            .single();
        
        if (error) {
            // Kiểm tra nếu là lỗi duplicate
            if (error.code === '23505') {
                throw new Error('Tên loại rác này đã tồn tại. Vui lòng chọn tên khác.');
            }
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error adding category:', error);
        throw error;
    }
}

// ============================================
// 3. CẬP NHẬT CATEGORY
// ============================================
/**
 * Cập nhật waste category
 * @param {number} categoryId - ID của category
 * @param {Object} categoryData - Dữ liệu cập nhật
 * @returns {Promise<Object>} Category đã được cập nhật
 */
async function updateCategory(categoryId, categoryData) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        // Validate
        if (!categoryData.name || categoryData.name.trim() === '') {
            throw new Error('Tên loại rác là bắt buộc');
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
        
        // Chuẩn bị dữ liệu
        const updateData = {
            name: categoryData.name.trim(),
            description: categoryData.description?.trim() || null,
            bin_color: categoryData.bin_color?.trim() || null,
            guide_text: categoryData.guide_text?.trim() || null,
            updated_at: new Date().toISOString()
        };
        
        // Update vào database
        const { data, error } = await client
            .from('waste_categories')
            .update(updateData)
            .eq('category_id', categoryId)
            .select()
            .single();
        
        if (error) {
            // Kiểm tra nếu là lỗi duplicate
            if (error.code === '23505') {
                throw new Error('Tên loại rác này đã tồn tại. Vui lòng chọn tên khác.');
            }
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error updating category:', error);
        throw error;
    }
}

// ============================================
// 4. XÓA CATEGORY
// ============================================
/**
 * Xóa waste category
 * @param {number} categoryId - ID của category
 * @returns {Promise<void>}
 */
async function deleteCategory(categoryId) {
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
        
        // Kiểm tra xem category có đang được sử dụng trong predictions không
        const { data: predictions, error: checkError } = await client
            .from('predictions')
            .select('prediction_id')
            .eq('category_id', categoryId)
            .limit(1);
        
        if (checkError) {
            console.warn('Could not check predictions:', checkError);
        }
        
        if (predictions && predictions.length > 0) {
            throw new Error('Không thể xóa loại rác này vì đang có predictions đang sử dụng. Vui lòng xóa các predictions liên quan trước.');
        }
        
        // Xóa category
        const { error } = await client
            .from('waste_categories')
            .delete()
            .eq('category_id', categoryId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
}

// ============================================
// 5. HIỂN THỊ DANH SÁCH CATEGORIES
// ============================================
async function loadCategoriesTable() {
    const tableBody = document.getElementById('categoriesTableBody');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">Đang tải...</td></tr>';
        
        const categories = await getAllCategories();
        
        if (!categories || categories.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="loading-text">Chưa có loại rác nào</td></tr>';
            return;
        }
        
        tableBody.innerHTML = categories.map(category => {
            const createdDate = new Date(category.created_at).toLocaleDateString('vi-VN');
            const description = category.description 
                ? (category.description.length > 50 ? category.description.substring(0, 50) + '...' : category.description)
                : 'N/A';
            const guideText = category.guide_text 
                ? (category.guide_text.length > 50 ? category.guide_text.substring(0, 50) + '...' : category.guide_text)
                : 'N/A';
            
            return `
                <tr data-category-id="${category.category_id}">
                    <td>${category.category_id}</td>
                    <td><strong>${category.name}</strong></td>
                    <td>${description}</td>
                    <td>${category.bin_color || 'N/A'}</td>
                    <td>${guideText}</td>
                    <td>${createdDate}</td>
                    <td class="actions-cell">
                        <div class="action-buttons">
                            <button class="btn-admin btn-primary btn-sm" onclick="handleEditCategory(${category.category_id})" title="Sửa">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-admin btn-danger btn-sm" onclick="handleDeleteCategory(${category.category_id})" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading categories table:', error);
        tableBody.innerHTML = `<tr><td colspan="7" class="error-text">Lỗi: ${error.message}</td></tr>`;
        window.AdminMain.showAdminAlert('Lỗi khi tải danh sách categories: ' + error.message, 'error');
    }
}

// ============================================
// 6. MODAL HANDLERS
// ============================================
function showAddCategoryModal() {
    document.getElementById('modalTitle').textContent = 'Thêm loại rác mới';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryModal').style.display = 'flex';
}

function showEditCategoryModal(category) {
    document.getElementById('modalTitle').textContent = 'Sửa loại rác';
    document.getElementById('categoryId').value = category.category_id;
    document.getElementById('categoryName').value = category.name || '';
    document.getElementById('categoryDescription').value = category.description || '';
    document.getElementById('categoryBinColor').value = category.bin_color || '';
    document.getElementById('categoryGuideText').value = category.guide_text || '';
    document.getElementById('categoryModal').style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
}

// ============================================
// 7. ACTION HANDLERS
// ============================================
async function handleEditCategory(categoryId) {
    try {
        const categories = await getAllCategories();
        const category = categories.find(c => c.category_id === categoryId);
        
        if (!category) {
            throw new Error('Không tìm thấy loại rác');
        }
        
        showEditCategoryModal(category);
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

async function handleDeleteCategory(categoryId) {
    // Lấy tên category để hiển thị trong confirm
    let categoryName = 'loại rác này';
    try {
        const categories = await getAllCategories();
        const category = categories.find(c => c.category_id === categoryId);
        if (category) {
            categoryName = category.name;
        }
    } catch (error) {
        console.error('Error getting category name:', error);
    }
    
    if (!confirm(`Bạn có chắc chắn muốn xóa "${categoryName}"?\n\nLưu ý: Nếu loại rác này đang được sử dụng trong predictions, bạn sẽ không thể xóa.`)) {
        return;
    }
    
    try {
        await deleteCategory(categoryId);
        window.AdminMain.showAdminAlert('Đã xóa loại rác thành công', 'success');
        await loadCategoriesTable();
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

// ============================================
// 8. FORM SUBMIT HANDLER
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    // Load categories table
    loadCategoriesTable();
    
    // Handle form submit
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const categoryId = formData.get('category_id');
            const categoryData = {
                name: formData.get('name'),
                description: formData.get('description'),
                bin_color: formData.get('bin_color'),
                guide_text: formData.get('guide_text')
            };
            
            try {
                if (categoryId) {
                    // Update existing category
                    await updateCategory(parseInt(categoryId), categoryData);
                    window.AdminMain.showAdminAlert('Đã cập nhật loại rác thành công', 'success');
                } else {
                    // Add new category
                    await addCategory(categoryData);
                    window.AdminMain.showAdminAlert('Đã thêm loại rác thành công', 'success');
                }
                
                closeCategoryModal();
                await loadCategoriesTable();
            } catch (error) {
                window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
            }
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('categoryModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeCategoryModal();
            }
        });
    }
});

// Export functions
window.AdminCategories = {
    getAllCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    loadCategoriesTable,
    handleEditCategory,
    handleDeleteCategory
};

