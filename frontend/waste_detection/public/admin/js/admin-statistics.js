// Admin Statistics JavaScript

// ============================================
// 1. LẤY THỐNG KÊ TỔNG QUAN
// ============================================
/**
 * Lấy thống kê tổng quan cho admin dashboard
 * @returns {Promise<Object>} Thống kê
 */
async function getAdminStatistics() {
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
            throw new Error('Bạn không có quyền truy cập');
        }
        
        // 1. Tổng số ảnh đã phân loại (status = 'done')
        const { count: totalImagesCount, error: imagesError } = await client
            .from('images')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'done');
        
        if (imagesError) throw imagesError;
        const totalImages = totalImagesCount || 0;
        
        // 2. Tổng số predictions
        const { count: totalPredictionsCount, error: predictionsError } = await client
            .from('predictions')
            .select('*', { count: 'exact', head: true });
        
        if (predictionsError) throw predictionsError;
        const totalPredictions = totalPredictionsCount || 0;
        
        // 3. Tổng số users
        const { count: totalUsersCount, error: usersError } = await client
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        if (usersError) throw usersError;
        const totalUsers = totalUsersCount || 0;
        
        // 4. Tổng số feedbacks
        const { count: totalFeedbacksCount, error: feedbacksError } = await client
            .from('feedbacks')
            .select('*', { count: 'exact', head: true });
        
        if (feedbacksError) throw feedbacksError;
        const totalFeedbacks = totalFeedbacksCount || 0;
        
        return {
            totalImages,
            totalPredictions,
            totalUsers,
            totalFeedbacks
        };
    } catch (error) {
        console.error('Error getting admin statistics:', error);
        throw error;
    }
}

// ============================================
// 2. LẤY THỐNG KÊ THEO LOẠI RÁC
// ============================================
/**
 * Lấy thống kê tỷ lệ từng loại rác
 * @returns {Promise<Object>} Thống kê theo category
 */
async function getCategoryStatistics() {
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
            throw new Error('Bạn không có quyền truy cập');
        }
        
        // Lấy tất cả predictions với category
        const { data: predictions, error } = await client
            .from('predictions')
            .select(`
                prediction_id,
                category_id,
                waste_categories (
                    category_id,
                    name,
                    bin_color
                )
            `);
        
        if (error) throw error;
        
        // Đếm theo category
        const categoryCounts = {};
        const categoryDetails = {};
        
        (predictions || []).forEach(pred => {
            const category = pred.waste_categories;
            if (!category) return;
            
            const categoryName = category.name;
            if (!categoryCounts[categoryName]) {
                categoryCounts[categoryName] = 0;
                categoryDetails[categoryName] = {
                    name: categoryName,
                    bin_color: category.bin_color,
                    count: 0
                };
            }
            categoryCounts[categoryName]++;
            categoryDetails[categoryName].count++;
        });
        
        // Tính tỷ lệ phần trăm
        const total = predictions?.length || 0;
        const categoryStats = Object.values(categoryDetails).map(cat => ({
            ...cat,
            percentage: total > 0 ? ((cat.count / total) * 100).toFixed(1) : 0
        }));
        
        // Sắp xếp theo số lượng giảm dần
        categoryStats.sort((a, b) => b.count - a.count);
        
        return {
            total,
            categories: categoryStats
        };
    } catch (error) {
        console.error('Error getting category statistics:', error);
        throw error;
    }
}

// ============================================
// 3. HIỂN THỊ THỐNG KÊ
// ============================================
async function loadDashboardStatistics() {
    try {
        // Load tổng quan
        const stats = await getAdminStatistics();
        
        // Hiển thị stat cards
        document.getElementById('totalImagesStat').textContent = stats.totalImages.toLocaleString('vi-VN');
        document.getElementById('totalPredictionsStat').textContent = stats.totalPredictions.toLocaleString('vi-VN');
        document.getElementById('totalUsersStat').textContent = stats.totalUsers.toLocaleString('vi-VN');
        document.getElementById('totalFeedbacksStat').textContent = stats.totalFeedbacks.toLocaleString('vi-VN');
        
        // Load thống kê theo category
        const categoryStats = await getCategoryStatistics();
        
        // Hiển thị bảng tỷ lệ
        const categoryTableBody = document.getElementById('categoryStatsTableBody');
        if (categoryTableBody) {
            if (!categoryStats.categories || categoryStats.categories.length === 0) {
                categoryTableBody.innerHTML = '<tr><td colspan="4" class="loading-text">Chưa có dữ liệu</td></tr>';
            } else {
                categoryTableBody.innerHTML = categoryStats.categories.map(cat => {
                    const percentage = parseFloat(cat.percentage);
                    return `
                        <tr>
                            <td><strong>${cat.name}</strong></td>
                            <td>${cat.bin_color || 'N/A'}</td>
                            <td>${cat.count.toLocaleString('vi-VN')}</td>
                            <td>
                                <div class="percentage-bar">
                                    <div class="percentage-fill" style="width: ${percentage}%;"></div>
                                    <span class="percentage-text">${percentage}%</span>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }
        
        // Vẽ biểu đồ
        if (categoryStats.categories && categoryStats.categories.length > 0) {
            drawCategoryChart(categoryStats.categories);
        }
    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
        window.AdminMain.showAdminAlert('Lỗi khi tải thống kê: ' + error.message, 'error');
    }
}

// ============================================
// 4. VẼ BIỂU ĐỒ
// ============================================
function drawCategoryChart(categoryStats) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    // Destroy chart cũ nếu có
    if (window.categoryChartInstance) {
        window.categoryChartInstance.destroy();
    }
    
    // Chuẩn bị dữ liệu
    const labels = categoryStats.map(cat => cat.name);
    const data = categoryStats.map(cat => cat.count);
    
    // Map màu sắc cho từng loại rác (theo tên tiếng Việt - tên trong database)
    const colorMap = {
        'Nhựa': '#3b82f6',        // Xanh dương
        'Plastic': '#3b82f6',
        'Giấy': '#eab308',         // Vàng
        'Paper': '#eab308',
        'Kim loại': '#636e72',     // Xám
        'Metal': '#636e72',
        'Thủy tinh': '#ef4444',    // Đỏ
        'Glass': '#ef4444',
        'Hữu cơ': '#22c55e',       // Xanh lá
        'Organic': '#22c55e'
    };
    
    // Tạo mảng màu cho từng category
    const colors = [];
    categoryStats.forEach(cat => {
        // Tìm màu theo tên category (case-insensitive)
        const categoryName = cat.name.trim();
        let color = colorMap[categoryName];
        
        // Nếu không tìm thấy, thử tìm không phân biệt hoa thường
        if (!color) {
            const lowerName = categoryName.toLowerCase();
            for (const [key, value] of Object.entries(colorMap)) {
                if (key.toLowerCase() === lowerName) {
                    color = value;
                    break;
                }
            }
        }
        
        // Nếu vẫn không tìm thấy, dùng màu mặc định
        if (!color) {
            color = '#94a3b8'; // Màu xám mặc định
            console.warn(`Không tìm thấy màu cho category: "${categoryName}"`);
        }
        
        colors.push(color);
    });
    
    // Debug log
    console.log('📊 Chart Configuration:', {
        labels: labels,
        data: data,
        colors: colors,
        categoryDetails: categoryStats.map((cat, idx) => ({
            name: cat.name,
            count: cat.count,
            color: colors[idx]
        }))
    });
    
    // Vẽ pie chart
    window.categoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Số lượng',
                data: data,
                backgroundColor: colors,
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverBorderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 13,
                            weight: 'bold'
                        },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const dataset = data.datasets[0];
                                    const value = dataset.data[i];
                                    const backgroundColor = dataset.backgroundColor[i];
                                    const total = dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    
                                    return {
                                        text: `${label} (${percentage}%)`,
                                        fillStyle: backgroundColor,
                                        strokeStyle: backgroundColor,
                                        lineWidth: 0,
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toLocaleString('vi-VN')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Export functions
window.AdminStatistics = {
    getAdminStatistics,
    getCategoryStatistics,
    loadDashboardStatistics,
    drawCategoryChart
};

