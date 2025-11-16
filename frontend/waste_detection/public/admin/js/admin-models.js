// Admin AI Models Management JavaScript

// ============================================
// 1. LẤY DANH SÁCH MODELS
// ============================================
/**
 * Lấy danh sách tất cả AI models
 * @returns {Promise<Array>} Danh sách models
 */
async function getAllModels() {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        const { data, error } = await client
            .from('ai_models')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log(`✅ Retrieved ${data?.length || 0} models from database`);
        return data || [];
    } catch (error) {
        console.error('❌ Error getting models:', error);
        throw error;
    }
}

// ============================================
// 2. ĐỌC VÀ TÍNH TOÁN METRICS TỪ CSV
// ============================================
/**
 * Đọc file CSV và tính toán metrics (giống test.py)
 * @param {File} csvFile - File CSV results.csv
 * @returns {Promise<Object>} Metrics {accuracy, precision, recall, f1_score}
 */
async function calculateMetricsFromCSV(csvFile) {
    return new Promise((resolve, reject) => {
        if (!csvFile) {
            reject(new Error('Không có file CSV'));
            return;
        }
        
        if (!window.Papa) {
            reject(new Error('PapaParse library chưa được load. Vui lòng refresh trang.'));
            return;
        }
        
        window.Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                try {
                    const df = results.data;
                    
                    if (!df || df.length === 0) {
                        reject(new Error('File CSV không có dữ liệu'));
                        return;
                    }
                    
                    // Tìm các cột metrics - thử nhiều tên cột khác nhau
                    const headers = Object.keys(df[0]);
                    console.log('📋 CSV Headers:', headers);
                    
                    // Tìm cột precision
                    let precisionCol = headers.find(h => 
                        h === 'metrics/precision(B)' || 
                        h.toLowerCase().includes('precision') && h.toLowerCase().includes('b')
                    );
                    if (!precisionCol) {
                        precisionCol = headers.find(h => h.toLowerCase().includes('precision'));
                    }
                    
                    // Tìm cột recall
                    let recallCol = headers.find(h => 
                        h === 'metrics/recall(B)' || 
                        h.toLowerCase().includes('recall') && h.toLowerCase().includes('b')
                    );
                    if (!recallCol) {
                        recallCol = headers.find(h => h.toLowerCase().includes('recall'));
                    }
                    
                    // Tìm cột mAP50
                    let map50Col = headers.find(h => 
                        h === 'metrics/mAP50(B)' || 
                        h === 'metrics/mAP_50(B)' ||
                        (h.toLowerCase().includes('map') && h.toLowerCase().includes('50'))
                    );
                    if (!map50Col) {
                        map50Col = headers.find(h => h.toLowerCase().includes('map50') || h.toLowerCase().includes('map_50'));
                    }
                    
                    // Nếu không tìm thấy, thử với tên cột chuẩn từ YOLO
                    if (!precisionCol && headers.includes('metrics/precision(B)')) {
                        precisionCol = 'metrics/precision(B)';
                    }
                    if (!recallCol && headers.includes('metrics/recall(B)')) {
                        recallCol = 'metrics/recall(B)';
                    }
                    if (!map50Col && headers.includes('metrics/mAP50(B)')) {
                        map50Col = 'metrics/mAP50(B)';
                    }
                    
                    if (!precisionCol || !recallCol || !map50Col) {
                        reject(new Error(`Không tìm thấy các cột metrics cần thiết. Các cột tìm thấy: ${headers.join(', ')}`));
                        return;
                    }
                    
                    console.log('✅ Found columns:', { precisionCol, recallCol, map50Col });
                    
                    // Tính max của mỗi metric (giống test.py)
                    let maxPrecision = 0;
                    let maxRecall = 0;
                    let maxMap50 = 0;
                    
                    df.forEach((row, index) => {
                        const prec = parseFloat(row[precisionCol]);
                        const rec = parseFloat(row[recallCol]);
                        const map = parseFloat(row[map50Col]);
                        
                        if (!isNaN(prec) && prec > maxPrecision) maxPrecision = prec;
                        if (!isNaN(rec) && rec > maxRecall) maxRecall = rec;
                        if (!isNaN(map) && map > maxMap50) maxMap50 = map;
                    });
                    
                    // Tính F1 score (giống test.py: f1 = 2 * (precision * recall) / (precision + recall))
                    const f1 = (maxPrecision + maxRecall > 0) 
                        ? (2 * maxPrecision * maxRecall) / (maxPrecision + maxRecall)
                        : 0;
                    
                    const metrics = {
                        precision: round(maxPrecision, 4),
                        recall: round(maxRecall, 4),
                        accuracy: round(maxMap50, 4), // mAP50 được dùng như accuracy
                        f1_score: round(f1, 4)
                    };
                    
                    console.log('📊 Calculated metrics:', metrics);
                    resolve(metrics);
                } catch (error) {
                    console.error('Error parsing CSV:', error);
                    reject(new Error('Không thể đọc file CSV: ' + error.message));
                }
            },
            error: function(error) {
                reject(new Error('Lỗi khi đọc file CSV: ' + error.message));
            }
        });
    });
}

function round(value, decimals) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ============================================
// 3. THÊM MÔ HÌNH MỚI
// ============================================
/**
 * Thêm mô hình AI mới
 * @param {Object} modelData - Dữ liệu mô hình
 * @returns {Promise<Object>} Model đã được tạo
 */
async function addModel(modelData) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        // Validate
        if (!modelData.name || !modelData.version || !modelData.file_path) {
            throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc');
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
            name: modelData.name.trim(),
            version: modelData.version.trim(),
            description: modelData.description?.trim() || null,
            file_path: modelData.file_path.trim(),
            accuracy: modelData.accuracy || null,
            precision: modelData.precision || null,
            recall: modelData.recall || null,
            f1_score: modelData.f1_score || null,
            is_active: modelData.is_active || false,
            deployed_at: new Date().toISOString()
        };
        
        // Insert vào database
        const { data, error } = await client
            .from('ai_models')
            .insert([insertData])
            .select()
            .single();
        
        if (error) {
            // Kiểm tra nếu là lỗi duplicate
            if (error.code === '23505') {
                throw new Error('Mô hình với tên và version này đã tồn tại');
            }
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error adding model:', error);
        throw error;
    }
}

// ============================================
// 4. CẬP NHẬT TRẠNG THÁI ACTIVE
// ============================================
/**
 * Kích hoạt một mô hình (trigger sẽ tự động tắt các mô hình khác)
 * @param {number} modelId - ID của model
 * @returns {Promise<Object>} Model đã được cập nhật
 */
async function activateModel(modelId) {
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
        
        // Cập nhật is_active = true (trigger sẽ tự động tắt các model khác)
        const { data, error } = await client
            .from('ai_models')
            .update({ 
                is_active: true,
                updated_at: new Date().toISOString()
            })
            .eq('model_id', modelId)
            .select()
            .single();
        
        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('Error activating model:', error);
        throw error;
    }
}

// ============================================
// 5. XÓA MÔ HÌNH
// ============================================
/**
 * Xóa một mô hình
 * @param {number} modelId - ID của model
 * @returns {Promise<void>}
 */
async function deleteModel(modelId) {
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
        
        // Kiểm tra nếu đang xóa model đang active
        const { data: model } = await client
            .from('ai_models')
            .select('is_active')
            .eq('model_id', modelId)
            .single();
        
        if (model && model.is_active) {
            // Tìm model khác để kích hoạt
            const { data: otherModels } = await client
                .from('ai_models')
                .select('model_id')
                .neq('model_id', modelId)
                .limit(1);
            
            if (otherModels && otherModels.length > 0) {
                // Kích hoạt model khác trước
                await activateModel(otherModels[0].model_id);
            }
        }
        
        // Xóa model
        const { error } = await client
            .from('ai_models')
            .delete()
            .eq('model_id', modelId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting model:', error);
        throw error;
    }
}

// ============================================
// 6. HIỂN THỊ DANH SÁCH MODELS
// ============================================
async function loadModelsTable() {
    const tableBody = document.getElementById('modelsTableBody');
    if (!tableBody) return;
    
    try {
        tableBody.innerHTML = '<tr><td colspan="12" class="loading-text">Đang tải...</td></tr>';
        
        const models = await getAllModels();
        
        if (!models || models.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="12" class="loading-text">Chưa có mô hình nào</td></tr>';
            return;
        }
        
        tableBody.innerHTML = models.map(model => {
            const deployedDate = new Date(model.deployed_at).toLocaleDateString('vi-VN');
            const statusBadge = model.is_active 
                ? '<span class="badge badge-success">Đang hoạt động</span>'
                : '<span class="badge badge-secondary">Chưa kích hoạt</span>';
            
            return `
                <tr data-model-id="${model.model_id}">
                    <td>${model.model_id}</td>
                    <td><strong>${model.name}</strong></td>
                    <td>${model.version}</td>
                    <td>${model.description || 'N/A'}</td>
                    <td>${model.accuracy ? (model.accuracy * 100).toFixed(2) + '%' : 'N/A'}</td>
                    <td>${model.precision ? (model.precision * 100).toFixed(2) + '%' : 'N/A'}</td>
                    <td>${model.recall ? (model.recall * 100).toFixed(2) + '%' : 'N/A'}</td>
                    <td>${model.f1_score ? (model.f1_score * 100).toFixed(2) + '%' : 'N/A'}</td>
                    <td><small>${model.file_path}</small></td>
                    <td>${statusBadge}</td>
                    <td>${deployedDate}</td>
                    <td class="actions-cell">
                        <div class="action-buttons">
                            ${!model.is_active 
                                ? `<button class="btn-admin btn-success btn-sm" onclick="handleActivateModel(${model.model_id})" title="Kích hoạt">
                                    <i class="fas fa-check-circle"></i>
                                   </button>`
                                : ''
                            }
                            <button class="btn-admin btn-danger btn-sm" onclick="handleDeleteModel(${model.model_id})" title="Xóa">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading models table:', error);
        tableBody.innerHTML = `<tr><td colspan="12" class="error-text">Lỗi: ${error.message}</td></tr>`;
        window.AdminMain.showAdminAlert('Lỗi khi tải danh sách models: ' + error.message, 'error');
    }
}

// ============================================
// 7. MODAL HANDLERS
// ============================================
function showAddModelModal() {
    document.getElementById('addModelModal').style.display = 'flex';
    document.getElementById('addModelForm').reset();
    document.getElementById('metricsPreview').style.display = 'none';
}

function closeAddModelModal() {
    document.getElementById('addModelModal').style.display = 'none';
    document.getElementById('addModelForm').reset();
    document.getElementById('metricsPreview').style.display = 'none';
}

// Handle CSV file upload để tính metrics
document.addEventListener('DOMContentLoaded', () => {
    const csvFileInput = document.getElementById('resultsCsvFile');
    if (csvFileInput) {
        csvFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            try {
                const metrics = await calculateMetricsFromCSV(file);
                
                // Hiển thị preview metrics
                document.getElementById('previewAccuracy').textContent = (metrics.accuracy * 100).toFixed(2) + '%';
                document.getElementById('previewPrecision').textContent = (metrics.precision * 100).toFixed(2) + '%';
                document.getElementById('previewRecall').textContent = (metrics.recall * 100).toFixed(2) + '%';
                document.getElementById('previewF1Score').textContent = (metrics.f1_score * 100).toFixed(2) + '%';
                
                document.getElementById('metricsPreview').style.display = 'block';
                
                // Lưu metrics vào form để submit
                window.currentMetrics = metrics;
            } catch (error) {
                window.AdminMain.showAdminAlert('Lỗi khi đọc file CSV: ' + error.message, 'error');
                e.target.value = ''; // Clear file input
            }
        });
    }
    
    // Handle form submit
    const addModelForm = document.getElementById('addModelForm');
    if (addModelForm) {
        addModelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const modelData = {
                name: formData.get('name'),
                version: formData.get('version'),
                description: formData.get('description'),
                file_path: formData.get('file_path'),
                is_active: document.getElementById('modelIsActive').checked,
                ...(window.currentMetrics || {})
            };
            
            try {
                await addModel(modelData);
                window.AdminMain.showAdminAlert('Đã thêm mô hình thành công', 'success');
                closeAddModelModal();
                await loadModelsTable();
            } catch (error) {
                window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
            }
        });
    }
    
    // Load models table
    loadModelsTable();
});

// ============================================
// 8. ACTION HANDLERS
// ============================================
async function handleActivateModel(modelId) {
    if (!confirm('Bạn có chắc chắn muốn kích hoạt mô hình này? Các mô hình khác sẽ tự động bị tắt.')) {
        return;
    }
    
    try {
        await activateModel(modelId);
        window.AdminMain.showAdminAlert('Đã kích hoạt mô hình thành công', 'success');
        await loadModelsTable();
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

async function handleDeleteModel(modelId) {
    if (!confirm('Bạn có chắc chắn muốn xóa mô hình này?')) {
        return;
    }
    
    try {
        await deleteModel(modelId);
        window.AdminMain.showAdminAlert('Đã xóa mô hình thành công', 'success');
        await loadModelsTable();
    } catch (error) {
        window.AdminMain.showAdminAlert('Lỗi: ' + error.message, 'error');
    }
}

// Export functions
window.AdminModels = {
    getAllModels,
    addModel,
    activateModel,
    deleteModel,
    calculateMetricsFromCSV,
    loadModelsTable,
    handleActivateModel,
    handleDeleteModel
};

