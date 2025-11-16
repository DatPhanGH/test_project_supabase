// Cấu hình và khởi tạo Supabase Client

// Thông tin kết nối Supabase (Updated)
const SUPABASE_URL = 'https://abvvhzvedobpmdgdtfba.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidnZoenZlZG9icG1kZ2R0ZmJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzIxMDcsImV4cCI6MjA3ODEwODEwN30.x-lHCiZrIpTlBaNsh-dmeT9_sDLJREk9HPaohwNqhLg';




// Biến global để lưu Supabase client
let supabaseClient = null;

/**
 * Khởi tạo Supabase client
 * @returns {Object} Supabase client instance
 */
function initSupabase() {
    if (!window.supabase) {
        console.error(' Supabase library chưa được load');
        return null;
    }
    
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log(' Supabase client đã được khởi tạo');
    }
    
    return supabaseClient;
}

/**
 * Lấy Supabase client instance
 * @returns {Object} Supabase client
 */
function getSupabaseClient() {
    if (!supabaseClient) {
        return initSupabase();
    }
    return supabaseClient;
}

/**
 * Kiểm tra trạng thái đăng nhập
 * @returns {Promise<Object|null>} User session hoặc null
 */
async function getCurrentSession() {
    const client = getSupabaseClient();
    if (!client) return null;
    
    try {
        const { data: { session }, error } = await client.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Lỗi khi lấy session:', error);
        return null;
    }
}

/**
 * Lấy thông tin người dùng hiện tại
 * @returns {Promise<Object|null>} User object hoặc null
 */
async function getCurrentUser() {
    const session = await getCurrentSession();
    return session ? session.user : null;
}

/**
 * Đăng nhập với email và password
 * @param {string} email - Email đăng nhập
 * @param {string} password - Mật khẩu
 * @returns {Promise<Object>} Kết quả đăng nhập
 */
async function signIn(email, password) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    return data;
}

/**
 * Đăng ký tài khoản mới
 * @param {Object} userData - Thông tin người dùng
 * @returns {Promise<Object>} Kết quả đăng ký
 */
async function signUp(userData) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const { email, password, fullName, phone, username } = userData;
    
    const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${window.location.origin}/pages/auth-callback.html`,
            data: {
                full_name: fullName,
                phone: phone,
                username: username
            }
        }
    });
    
    if (error) throw error;
    return data;
}

/**
 * Đăng xuất
 * @returns {Promise<void>}
 */
async function signOut() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const { error } = await client.auth.signOut();
    if (error) throw error;
    
    // Xóa dữ liệu local
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberLogin');
}

/**
 * Đặt lại mật khẩu
 * @param {string} email - Email nhận link reset
 * @returns {Promise<void>}
 */
async function resetPassword(email) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pages/reset-password.html`
    });
    
    if (error) throw error;
}

/**
 * Lưu lịch sử phân loại vào Supabase
 * @param {Object} classificationData - Dữ liệu phân loại
 * @param {string} imageId - ID của ảnh đã upload (nếu có)
 * @returns {Promise<Object>} Kết quả lưu prediction
 */
async function saveClassificationHistory(classificationData, imageId = null) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    // Tìm category_id dựa trên waste_type
    const { data: category } = await client
        .from('waste_categories')
        .select('category_id')
        .eq('name', classificationData.type)
        .single();
    
    // Lưu vào bảng predictions
    const { data, error } = await client
        .from('predictions')
        .insert([{
            image_id: imageId,
            category_id: category?.category_id || null,
            model_id: null, // Có thể thêm sau nếu có model cụ thể
            confidence: classificationData.confidence / 100, // Convert % sang decimal
            bbox_x1: null,
            bbox_y1: null,
            bbox_x2: null,
            bbox_y2: null,
            created_at: new Date().toISOString()
        }])
        .select();
    
    if (error) throw error;
    return data;
}

/**
 * Lấy lịch sử phân loại của user từ Supabase
 * @param {Object} filters - Bộ lọc (dateFilter, typeFilter, limit)
 * @returns {Promise<Array>} Danh sách lịch sử
 */
async function getClassificationHistory(filters = {}) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    try {
        // Tính toán date filter nếu có
        let dateFilterCondition = null;
        if (filters.dateFilter && filters.dateFilter !== 'all') {
            const now = new Date();
            let startDate;
            
            switch (filters.dateFilter) {
                case 'today':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
            }
            
            if (startDate) {
                dateFilterCondition = startDate.toISOString();
            }
        }

        // Nếu có filter theo loại rác, bắt đầu từ predictions
        if (filters.typeFilter && filters.typeFilter !== 'all') {
            // Bắt đầu từ predictions, join với waste_categories và images
            // Lưu ý: Không thể dùng order trên nested field với !inner, sẽ sort sau khi lấy dữ liệu
            let predictionsQuery = client
                .from('predictions')
                .select(`
                    prediction_id,
                    image_id,
                    confidence,
                    created_at,
                    waste_categories!inner (
                        category_id,
                        name,
                        description,
                        bin_color,
                        guide_text
                    ),
                    images!inner (
                        image_id,
                        file_path,
                        status,
                        upload_time,
                        created_at,
                        user_id
                    )
                `)
                .eq('waste_categories.name', filters.typeFilter)
                .eq('images.user_id', session.user.id)
                .eq('images.status', 'done');
            
            // Không thể filter theo nested field created_at trong query, sẽ filter sau
            // Lấy nhiều hơn để đảm bảo có đủ dữ liệu sau khi filter
            const limit = filters.limit ? filters.limit * 20 : 500;
            predictionsQuery = predictionsQuery.limit(limit);

            const { data: predictions, error: predictionsError } = await predictionsQuery;
            
            if (predictionsError) throw predictionsError;
            if (!predictions || predictions.length === 0) return [];

            // Khi có filter theo type, trả về từng prediction riêng (mỗi vật thể là một item)
            const historyArray = [];
            
            predictions.forEach(prediction => {
                const image = prediction.images;
                
                // Áp dụng filter theo ngày nếu có
                if (dateFilterCondition) {
                    const imageDate = new Date(image.created_at);
                    const filterDate = new Date(dateFilterCondition);
                    if (imageDate < filterDate) {
                        return; // Bỏ qua nếu không thỏa điều kiện ngày
                    }
                }
                
                // file_path đã là URL Google Drive, không cần convert
                // Mỗi prediction là một item riêng
                historyArray.push({
                    prediction_id: prediction.prediction_id,
                    image_id: image.image_id,
                    file_path: image.file_path, // URL Google Drive
                    upload_time: image.upload_time,
                    created_at: image.created_at,
                    // Thông tin prediction
                    prediction: {
                        prediction_id: prediction.prediction_id,
                        confidence: prediction.confidence,
                        created_at: prediction.created_at,
                        waste_categories: prediction.waste_categories
                    },
                    // Đánh dấu đây là item từ filter theo type
                    isFilteredByType: true
                });
            });

            // Sắp xếp theo created_at giảm dần (mới nhất trước)
            historyArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Giới hạn số lượng sau khi filter
            if (filters.limit) {
                return historyArray.slice(0, filters.limit);
            }
            
            return historyArray;
        } else {
            // Không có filter theo type, lấy tất cả images có predictions
            let imagesQuery = client
                .from('images')
                .select(`
                    image_id,
                    file_path,
                    status,
                    upload_time,
                    created_at,
                    predictions (
                        prediction_id,
                        image_id,
                        confidence,
                        created_at,
                        waste_categories (
                            category_id,
                            name,
                            description,
                            bin_color,
                            guide_text
                        )
                    )
                `)
                .eq('user_id', session.user.id)
                .eq('status', 'done')
                .order('created_at', { ascending: false });

            // Áp dụng bộ lọc theo ngày cho images
            if (dateFilterCondition) {
                imagesQuery = imagesQuery.gte('created_at', dateFilterCondition);
            }

            // Giới hạn số lượng images
            if (filters.limit) {
                imagesQuery = imagesQuery.limit(filters.limit);
            }

            const { data: images, error: imagesError } = await imagesQuery;
            
            if (imagesError) throw imagesError;
            if (!images || images.length === 0) return [];

            // Chuyển đổi dữ liệu thành format history items
            const historyArray = images.map(image => {
                const predictions = image.predictions || [];
                const categories = new Set();
                
                predictions.forEach(pred => {
                    if (pred.waste_categories?.name) {
                        categories.add(pred.waste_categories.name);
                    }
                });

                // file_path đã là URL Google Drive, không cần convert
                return {
                    image_id: image.image_id,
                    file_path: image.file_path, // URL Google Drive
                    upload_time: image.upload_time,
                    created_at: image.created_at,
                    predictions: predictions,
                    categories: categories
                };
            });

            // Chỉ giữ lại các images có predictions
            return historyArray.filter(item => item.predictions.length > 0);
        }
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử phân loại:', error);
        throw error;
    }
}

/**
 * Xóa một prediction
 * @param {number} predictionId - ID của prediction cần xóa
 * @returns {Promise<void>}
 */
async function deleteClassificationHistory(predictionId) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    // Xóa prediction (cascade sẽ xóa các bảng liên quan nếu có)
    const { error } = await client
        .from('predictions')
        .delete()
        .eq('prediction_id', predictionId);
    
    if (error) throw error;
}

/**
 * Lấy thống kê của user
 * @returns {Promise<Object>} Thống kê
 */
async function getUserStatistics() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    const { data, error } = await client
        .from('predictions')
        .select(`
            confidence,
            waste_categories (name),
            images!inner (user_id)
        `)
        .eq('images.user_id', session.user.id);
    
    if (error) throw error;
    
    // Tính toán thống kê
    const stats = {
        total: data.length,
        avgConfidence: data.length > 0 
            ? ((data.reduce((sum, item) => sum + (item.confidence * 100), 0) / data.length).toFixed(1))
            : 0,
        byType: {}
    };
    
    // Đếm theo loại
    data.forEach(item => {
        const typeName = item.waste_categories?.name || 'Unknown';
        stats.byType[typeName] = (stats.byType[typeName] || 0) + 1;
    });
    
    return stats;
}

/**
 * Lấy thống kê hệ thống (tổng số lượt phân loại, độ chính xác, số người dùng, số predictions)
 * @returns {Promise<Object>} Thống kê hệ thống
 */
async function getSystemStatistics() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    const userId = session.user.id;
    
    try {
        // 1. Lượt phân loại của người dùng hiện tại (số images có status = 'done')
        const { count: userClassificationsCount, error: imagesError } = await client
            .from('images')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'done');
        
        if (imagesError) {
            console.error('Lỗi khi lấy số lượt phân loại:', imagesError);
            throw imagesError;
        }
        const userClassifications = userClassificationsCount || 0;
        
        // 2. Độ chính xác trung bình của người dùng hiện tại (trung bình confidence từ predictions)
        const { data: userPredictions, error: predictionsError } = await client
            .from('predictions')
            .select('confidence, images!inner(user_id)')
            .eq('images.user_id', userId);
        
        if (predictionsError) {
            console.error('Lỗi khi lấy predictions của user:', predictionsError);
            throw predictionsError;
        }
        
        const avgConfidence = userPredictions && userPredictions.length > 0
            ? (userPredictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / userPredictions.length * 100).toFixed(1)
            : 0;
        
        // 3. Tổng số người dùng đã đăng ký (có thể cần quyền admin)
        let totalUsers = 0;
        try {
            const { count: totalUsersCount, error: usersError } = await client
                .from('users')
                .select('*', { count: 'exact', head: true });
            
            if (usersError) {
                console.warn('Không thể lấy tổng số users (có thể do RLS policy):', usersError.message);
                // Nếu không có quyền, có thể user không phải admin
            } else {
                totalUsers = totalUsersCount || 0;
            }
        } catch (err) {
            console.warn('Lỗi khi lấy tổng số users:', err);
        }
        
        // 4. Tổng số predictions đã được dự đoán (có thể cần quyền admin)
        let totalPredictions = 0;
        try {
            const { count: totalPredictionsCount, error: allPredictionsError } = await client
                .from('predictions')
                .select('*', { count: 'exact', head: true });
            
            if (allPredictionsError) {
                console.warn('Không thể lấy tổng số predictions (có thể do RLS policy):', allPredictionsError.message);
                // Nếu không có quyền, có thể user không phải admin
            } else {
                totalPredictions = totalPredictionsCount || 0;
            }
        } catch (err) {
            console.warn('Lỗi khi lấy tổng số predictions:', err);
        }
        
        return {
            userClassifications,
            avgConfidence: parseFloat(avgConfidence) || 0,
            totalUsers,
            totalPredictions
        };
    } catch (error) {
        console.error('Lỗi khi lấy thống kê hệ thống:', error);
        // Trả về giá trị mặc định thay vì throw error
        return {
            userClassifications: 0,
            avgConfidence: 0,
            totalUsers: 0,
            totalPredictions: 0
        };
    }
}

/**
 * Lấy public URL từ file_path trong Supabase Storage
 * @param {string} filePath - Đường dẫn file trong storage
 * @returns {string} Public URL của ảnh
 */
function getImagePublicUrl(filePath) {
    if (!filePath) return null;
    
    const client = getSupabaseClient();
    if (!client) return null;
    
    try {
        const { data } = client.storage
            .from('waste-images')
            .getPublicUrl(filePath);
        
        // Supabase trả về { publicUrl: '...' } trong data
        return data?.publicUrl || null;
    } catch (error) {
        console.error('Lỗi khi lấy public URL:', error);
        return null;
    }
}

/**
 * Upload ảnh lên Supabase Storage và lưu metadata
 * @param {File} file - File ảnh
 * @returns {Promise<Object>} Thông tin ảnh đã upload
 */
async function uploadImage(file) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    // Upload file vào storage
    const fileName = `${session.user.id}/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await client.storage
        .from('waste-images')
        .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    // Lưu metadata vào bảng images
    const { data: imageData, error: imageError } = await client
        .from('images')
        .insert([{
            user_id: session.user.id,
            file_path: uploadData.path,
            status: 'pending',
            upload_time: new Date().toISOString()
        }])
        .select()
        .single();
    
    if (imageError) throw imageError;
    
    return imageData;
}

/**
 * Gửi feedback cho prediction
 * @param {Object} feedbackData - Dữ liệu feedback
 * @returns {Promise<Object>} Feedback đã lưu
 */
async function submitFeedback(feedbackData) {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    const { data, error } = await client
        .from('feedbacks')
        .insert([{
            user_id: session.user.id,
            image_id: feedbackData.imageId,
            comment: feedbackData.comment || null,
            corrected_category_id: feedbackData.correctedCategoryId || null,
            created_at: new Date().toISOString()
        }])
        .select();
    
    if (error) throw error;
    return data;
}

/**
 * Lấy tất cả waste categories
 * @returns {Promise<Array>} Danh sách categories
 */
async function getWasteCategories() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const { data, error } = await client
        .from('waste_categories')
        .select('category_id, name, description, bin_color, guide_text')
        .order('category_id', { ascending: true });
    
    if (error) console.error('Lỗi khi lấy dữ liệu waste_categories:', error.message);
    return data || [];
}

/**
 * Lấy thông tin AI model đang active
 * @returns {Promise<Object>} Model info
 */
async function getActiveModel() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const { data, error } = await client
        .from('ai_models')
        .select('*')
        .eq('is_active', true)
        .order('deployed_at', { ascending: false })
        .limit(1)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Lấy danh sách feedbacks của user hiện tại
 * @returns {Promise<Array>} Danh sách feedbacks
 */
async function getUserFeedbacks() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    const { data, error } = await client
        .from('feedbacks')
        .select(`
            feedback_id,
            comment,
            corrected_category_id,
            created_at,
            updated_at,
            images (
                image_id,
                file_path,
                created_at
            ),
            waste_categories (
                category_id,
                name,
                bin_color
            )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

/**
 * Lấy danh sách images của user để chọn cho feedback mới
 * @returns {Promise<Array>} Danh sách images
 */
async function getUserImages() {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    const session = await getCurrentSession();
    if (!session) throw new Error('Người dùng chưa đăng nhập');
    
    const { data, error } = await client
        .from('images')
        .select(`
            image_id,
            file_path,
            status,
            created_at,
            upload_time
        `)
        .eq('user_id', session.user.id)
        .eq('status', 'done')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

// Export các hàm để sử dụng
window.SupabaseService = {
    initSupabase,
    getSupabaseClient,
    getCurrentSession,
    getCurrentUser,
    signIn,
    signUp,
    signOut,
    resetPassword,
    saveClassificationHistory,
    getClassificationHistory,
    deleteClassificationHistory,
    getUserStatistics,
    getSystemStatistics,
    uploadImage,
    getImagePublicUrl,
    submitFeedback,
    getWasteCategories,
    getActiveModel,
    getUserFeedbacks,
    getUserImages
};

// Tự động khởi tạo khi load xong
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSupabase();
        // Dispatch event để các script khác biết Supabase đã ready
        window.dispatchEvent(new Event('supabase-ready'));
    });
} else {
    initSupabase();
    window.dispatchEvent(new Event('supabase-ready'));
}

