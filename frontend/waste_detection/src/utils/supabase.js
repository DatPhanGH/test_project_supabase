// Cấu hình Supabase Client

import { createClient } from '@supabase/supabase-js';

// Lấy thông tin từ biến môi trường
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Tạo Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Hàm tiện ích để kiểm tra kết nối
export async function testConnection() {
    try {
        const { data, error } = await supabase.from('users').select('count');
        if (error) throw error;
        console.log(' Kết nối Supabase thành công!');
        return true;
    } catch (error) {
        console.error(' Lỗi kết nối Supabase:', error.message);
        return false;
    }
}

// Export các hàm authentication
export const auth = {
    // Đăng ký người dùng mới
    signUp: async (email, password, userData) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData // Thông tin bổ sung (tên, số điện thoại, etc.)
                }
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    },

    // Đăng nhập
    signIn: async (email, password) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    },

    // Đăng xuất
    signOut: async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error: error.message };
        }
    },

    // Lấy thông tin user hiện tại
    getCurrentUser: async () => {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) throw error;
            return { user, error: null };
        } catch (error) {
            return { user: null, error: error.message };
        }
    },

    // Đặt lại mật khẩu
    resetPassword: async (email) => {
        try {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    }
};

// Export các hàm database
export const db = {
    // Lấy danh sách phân loại rác
    getClassifications: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('classifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    },

    // Thêm kết quả phân loại mới
    addClassification: async (classificationData) => {
        try {
            const { data, error } = await supabase
                .from('classifications')
                .insert([classificationData])
                .select();
            
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    },

    // Xóa một phân loại
    deleteClassification: async (id) => {
        try {
            const { error } = await supabase
                .from('classifications')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { error: null };
        } catch (error) {
            return { error: error.message };
        }
    },

    // Lấy thống kê
    getStats: async (userId) => {
        try {
            const { data, error } = await supabase
                .from('classifications')
                .select('waste_type, confidence')
                .eq('user_id', userId);
            
            if (error) throw error;
            
            // Tính toán thống kê
            const stats = {
                totalClassifications: data.length,
                averageConfidence: data.reduce((sum, item) => sum + item.confidence, 0) / data.length || 0,
                wasteTypes: {}
            };
            
            // Đếm theo loại rác
            data.forEach(item => {
                stats.wasteTypes[item.waste_type] = (stats.wasteTypes[item.waste_type] || 0) + 1;
            });
            
            return { data: stats, error: null };
        } catch (error) {
            return { data: null, error: error.message };
        }
    }
};

// Xuất mặc định
export default supabase;
