// Admin Feedbacks Management JavaScript

let currentSelectedImage = null; // Lưu thông tin ảnh đang được chọn
let currentPredictions = []; // Lưu predictions hiện tại
let boundingBoxesVisible = false; // Trạng thái hiển thị bounding boxes
let bboxCanvas = null; // Canvas để vẽ bounding boxes
let bboxCtx = null; // Context của canvas

// ============================================
// 1. LẤY DANH SÁCH IMAGES VỚI FEEDBACKS COUNT
// ============================================
/**
 * Lấy danh sách tất cả images với số lượng feedbacks
 * @param {Object} filters - Bộ lọc
 * @returns {Promise<Array>} Danh sách images với feedback count
 */
async function getAllImagesWithFeedbackCount(filters = {}) {
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
        
        // Query images với thông tin user và feedback count
        let query = client
            .from('images')
            .select(`
                image_id,
                file_path,
                status,
                upload_time,
                created_at,
                users (
                    user_id,
                    name,
                    email
                ),
                feedbacks (
                    feedback_id
                )
            `)
            .order('created_at', { ascending: false });
        
        // Áp dụng filters
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }
        
        // Filter by search (user email)
        if (filters.search && filters.search.trim() !== '') {
            // Sẽ filter ở client vì search trong nested field
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Process data: thêm feedback_count và filter
        let processedData = (data || []).map(image => ({
            ...image,
            feedback_count: image.feedbacks?.length || 0,
            user: image.users || null
        }));
        
        // Filter by search
        if (filters.search && filters.search.trim() !== '') {
            const searchTerm = filters.search.trim().toLowerCase();
            processedData = processedData.filter(image => 
                (image.user?.email && image.user.email.toLowerCase().includes(searchTerm)) ||
                (image.user?.name && image.user.name.toLowerCase().includes(searchTerm))
            );
        }
        
        // Filter by has feedback
        if (filters.hasFeedback === 'with_feedback') {
            processedData = processedData.filter(image => image.feedback_count > 0);
        } else if (filters.hasFeedback === 'no_feedback') {
            processedData = processedData.filter(image => image.feedback_count === 0);
        }
        
        console.log(`✅ Retrieved ${processedData.length} images from database`);
        return processedData;
    } catch (error) {
        console.error('❌ Error getting images:', error);
        throw error;
    }
}

// ============================================
// 2. LẤY PREDICTIONS CỦA MỘT ẢNH
// ============================================
/**
 * Lấy tất cả predictions của một image
 * @param {number} imageId - ID của image
 * @returns {Promise<Array>} Danh sách predictions
 */
async function getPredictionsByImageId(imageId) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        const { data, error } = await client
            .from('predictions')
            .select(`
                prediction_id,
                category_id,
                confidence,
                bbox_x1,
                bbox_y1,
                bbox_x2,
                bbox_y2,
                created_at,
                waste_categories (
                    category_id,
                    name,
                    bin_color
                ),
                ai_models (
                    model_id,
                    name,
                    version
                )
            `)
            .eq('image_id', imageId)
            .order('confidence', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error getting predictions:', error);
        throw error;
    }
}

// ============================================
// 3. LẤY FEEDBACKS CỦA MỘT ẢNH
// ============================================
/**
 * Lấy tất cả feedbacks của một image
 * @param {number} imageId - ID của image
 * @returns {Promise<Array>} Danh sách feedbacks
 */
async function getFeedbacksByImageId(imageId) {
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) throw new Error('Supabase client chưa được khởi tạo');
    
    try {
        const { data, error } = await client
            .from('feedbacks')
            .select(`
                feedback_id,
                comment,
                corrected_category_id,
                created_at,
                users (
                    user_id,
                    name,
                    email
                ),
                waste_categories (
                    category_id,
                    name,
                    bin_color
                )
            `)
            .eq('image_id', imageId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data || [];
    } catch (error) {
        console.error('Error getting feedbacks:', error);
        throw error;
    }
}

// ============================================
// 4. CONVERT GOOGLE DRIVE URL
// ============================================
/**
 * Convert Google Drive URL sang format viewable
 * @param {string} url - Google Drive URL
 * @returns {string} URL đã convert
 */
function convertGoogleDriveUrl(url) {
    if (!url) return '';
    
    // Fix HTML entities
    url = url.replace(/&amp;/g, '&');
    
    // Extract file ID từ các format khác nhau của Google Drive URL
    let fileId = null;
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) {
        fileId = match1[1];
    }
    
    // Format: https://drive.google.com/uc?export=view&id=FILE_ID hoặc uc?id=FILE_ID
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && !fileId) {
        fileId = match2[1];
    }
    
    // Format: https://drive.google.com/open?id=FILE_ID
    const match3 = url.match(/open[?&]id=([a-zA-Z0-9_-]+)/);
    if (match3 && !fileId) {
        fileId = match3[1];
    }
    
    // Nếu tìm thấy file ID, convert sang format viewable
    if (fileId) {
        // Sử dụng format thumbnail với size lớn để hiển thị tốt hơn
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
    
    // Nếu URL đã có format đúng, chỉ cần fix HTML entities
    return url;
}

// ============================================
// 5. LẤY IMAGE URL
// ============================================
/**
 * Lấy URL để hiển thị ảnh
 * @param {string} filePath - Đường dẫn file
 * @returns {string} URL của ảnh
 */
function getImageUrl(filePath) {
    if (!filePath) return null;
    
    // Nếu là Google Drive URL, convert sang format viewable
    if (filePath.includes('drive.google.com')) {
        return convertGoogleDriveUrl(filePath);
    }
    
    // Nếu là URL HTTP/HTTPS khác, dùng trực tiếp
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }
    
    // Nếu là path trong Supabase Storage, lấy public URL
    const client = window.SupabaseService.getSupabaseClient();
    if (!client) return null;
    
    try {
        const { data } = client.storage
            .from('waste-images')
            .getPublicUrl(filePath);
        
        return data?.publicUrl || null;
    } catch (error) {
        console.error('Error getting image URL:', error);
        return null;
    }
}

// ============================================
// 6. TẢI ẢNH VỀ MÁY
// ============================================
/**
 * Convert Google Drive URL sang format download
 * @param {string} url - Google Drive URL
 * @returns {string} Download URL
 */
function convertToDownloadUrl(url) {
    if (!url) return '';
    
    // Fix HTML entities
    url = url.replace(/&amp;/g, '&');
    
    // Extract file ID từ các format khác nhau của Google Drive URL
    let fileId = null;
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) {
        fileId = match1[1];
    }
    
    // Format: https://drive.google.com/uc?export=view&id=FILE_ID hoặc uc?id=FILE_ID
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && !fileId) {
        fileId = match2[1];
    }
    
    // Format: https://drive.google.com/open?id=FILE_ID
    const match3 = url.match(/open[?&]id=([a-zA-Z0-9_-]+)/);
    if (match3 && !fileId) {
        fileId = match3[1];
    }
    
    // Nếu tìm thấy file ID, convert sang format download
    if (fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Nếu không phải Google Drive, trả về URL gốc
    return url;
}

/**
 * Tải ảnh về máy tính
 * @param {string} imageUrl - URL của ảnh
 * @param {string} fileName - Tên file khi tải về
 */
async function downloadImage(imageUrl, fileName) {
    try {
        // Nếu là Google Drive URL, convert sang format download để tránh CORS
        let downloadUrl = imageUrl;
        if (imageUrl && imageUrl.includes('drive.google.com')) {
            downloadUrl = convertToDownloadUrl(imageUrl);
        }
        
        // Tạo link download trực tiếp (không dùng fetch để tránh CORS)
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = fileName || `image_${Date.now()}.jpg`;
        a.target = '_blank'; // Mở trong tab mới nếu download không hoạt động
        a.rel = 'noopener noreferrer';
        
        // Thêm vào DOM, click, rồi xóa
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Nếu là Google Drive, có thể cần mở trong tab mới
        // Vì Google Drive có thể redirect đến trang xác nhận download
        if (imageUrl && imageUrl.includes('drive.google.com')) {
            // Mở trong tab mới để user có thể download
            window.open(downloadUrl, '_blank');
            window.AdminMain.showAdminAlert('Đang mở trang download. Vui lòng click "Download anyway" nếu có thông báo.', 'info');
        } else {
            window.AdminMain.showAdminAlert('Đã tải ảnh về máy thành công', 'success');
        }
    } catch (error) {
        console.error('Error downloading image:', error);
        
        // Fallback: Mở URL trong tab mới
        try {
            window.open(imageUrl, '_blank');
            window.AdminMain.showAdminAlert('Đã mở ảnh trong tab mới. Bạn có thể click chuột phải và chọn "Lưu ảnh thành..."', 'info');
        } catch (fallbackError) {
            window.AdminMain.showAdminAlert('Lỗi khi tải ảnh: ' + error.message, 'error');
        }
    }
}

// ============================================
// 7. HIỂN THỊ DANH SÁCH IMAGES
// ============================================
async function loadImagesGrid(filters = {}) {
    const imagesGrid = document.getElementById('imagesGrid');
    if (!imagesGrid) return;
    
    try {
        imagesGrid.innerHTML = '<div class="loading-text">Đang tải...</div>';
        
        const images = await getAllImagesWithFeedbackCount(filters);
        
        if (!images || images.length === 0) {
            imagesGrid.innerHTML = '<div class="loading-text">Không có ảnh nào</div>';
            return;
        }
        
        imagesGrid.innerHTML = images.map(image => {
            const imageUrl = getImageUrl(image.file_path);
            const rawImageUrl = image.file_path; // Lưu URL gốc để dùng khi error
            const uploadDate = new Date(image.created_at).toLocaleDateString('vi-VN');
            const statusBadge = getStatusBadge(image.status);
            const feedbackBadge = image.feedback_count > 0 
                ? `<span class="badge badge-info">${image.feedback_count} feedback</span>`
                : '<span class="badge badge-secondary">Chưa có feedback</span>';
            
            return `
                <div class="image-card" data-image-id="${image.image_id}">
                    <div class="image-card-header">
                        <span class="image-id">#${image.image_id}</span>
                        ${statusBadge}
                    </div>
                    <div class="image-preview">
                        ${imageUrl 
                            ? `<img src="${imageUrl}" 
                                    alt="Image ${image.image_id}" 
                                    data-original-url="${rawImageUrl}"
                                    onerror="handleImageError(this)"
                                    style="width: 100%; height: 100%; object-fit: cover;">`
                            : '<div class="image-placeholder">Không có ảnh</div>'
                        }
                    </div>
                    <div class="image-card-body">
                        <div class="image-info">
                            <p><strong>User:</strong> ${image.user?.name || image.user?.email || 'N/A'}</p>
                            <p><strong>Email:</strong> ${image.user?.email || 'N/A'}</p>
                            <p><strong>Ngày upload:</strong> ${uploadDate}</p>
                            <p><strong>Status:</strong> ${image.status}</p>
                        </div>
                        <div class="image-feedback-info">
                            ${feedbackBadge}
                        </div>
                    </div>
                    <div class="image-card-actions">
                        <button class="btn-admin btn-primary btn-sm" onclick="handleViewFeedbacks(${image.image_id}, '${imageUrl || ''}')">
                            <i class="fas fa-eye"></i> Xem chi tiết
                        </button>
                        ${image.feedback_count > 0
                            ? `<button class="btn-admin btn-info btn-sm" onclick="handleViewFeedbacks(${image.image_id}, '${imageUrl || ''}')" title="Có ${image.feedback_count} feedback">
                                <i class="fas fa-comments"></i> ${image.feedback_count} feedback
                               </button>`
                            : ''
                        }
                        <button class="btn-admin btn-success btn-sm" onclick="handleDownloadImage(${image.image_id}, '${imageUrl || ''}')">
                            <i class="fas fa-download"></i> Tải về
                        </button>
                        <button class="btn-admin btn-danger btn-sm" onclick="handleDeleteImage(${image.image_id}, '${image.file_path}')" title="Xóa ảnh">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading images grid:', error);
        imagesGrid.innerHTML = `<div class="error-text">Lỗi: ${error.message}</div>`;
        window.AdminMain.showAdminAlert('Lỗi khi tải danh sách ảnh: ' + error.message, 'error');
    }
}

function getStatusBadge(status) {
    const badges = {
        'uploaded': '<span class="badge badge-info">Uploaded</span>',
        'processing': '<span class="badge badge-warning">Processing</span>',
        'done': '<span class="badge badge-success">Done</span>',
        'failed': '<span class="badge badge-danger">Failed</span>'
    };
    return badges[status] || '<span class="badge badge-secondary">' + status + '</span>';
}

// ============================================
// HANDLE IMAGE ERROR - Thử các format khác nhau
// ============================================
function handleImageError(img) {
    // Kiểm tra xem ảnh đã có src hợp lệ chưa (không phải placeholder)
    const currentSrc = img.src;
    if (currentSrc && (currentSrc.includes('data:image/svg+xml') || currentSrc.includes('placeholder'))) {
        // Đã là placeholder rồi, không làm gì
        return;
    }
    
    // Lấy original URL từ data attribute
    let originalUrl = img.getAttribute('data-original-url') || img.dataset.originalUrl;
    
    if (!originalUrl || originalUrl.trim() === '') {
        // Nếu không có original URL, hiển thị placeholder
        showImagePlaceholder(img);
        return;
    }
    
    // Nếu là Google Drive URL, thử các format khác nhau
    if (originalUrl.includes('drive.google.com')) {
        // Extract file ID
        let fileId = null;
        const match1 = originalUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match1) {
            fileId = match1[1];
        } else {
            const match2 = originalUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match2) {
                fileId = match2[1];
            }
        }
        
        if (fileId) {
            // Thử các format khác nhau
            const formats = [
                `https://drive.google.com/uc?export=view&id=${fileId}`,
                `https://drive.google.com/uc?export=download&id=${fileId}`,
                `https://lh3.googleusercontent.com/d/${fileId}`,
                `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
            ];
            
            let currentFormatIndex = 0;
            const tryNextFormat = () => {
                if (currentFormatIndex >= formats.length) {
                    // Đã thử hết các format, hiển thị placeholder
                    showImagePlaceholder(img);
                    return;
                }
                
                const formatUrl = formats[currentFormatIndex];
                currentFormatIndex++;
                
                // Set error handler cho format tiếp theo
                img.onerror = currentFormatIndex < formats.length ? tryNextFormat : () => {
                    showImagePlaceholder(img);
                };
                
                // Set onload để clear error handler khi thành công
                img.onload = () => {
                    img.onerror = null;
                    img.onload = null;
                };
                
                // Thử format này
                img.src = formatUrl;
            };
            
            // Thử format đầu tiên
            tryNextFormat();
        } else {
            showImagePlaceholder(img);
        }
    } else {
        // Không phải Google Drive, hiển thị placeholder
        showImagePlaceholder(img);
    }
}

// Show placeholder image
function showImagePlaceholder(img) {
    const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect fill=\'%23ddd\' width=\'200\' height=\'200\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\'%3EKhông thể tải ảnh%3C/text%3E%3C/svg%3E';
    img.src = placeholderSvg;
    img.onerror = null; // Clear error handler để tránh loop
}

// ============================================
// 8. VẼ BOUNDING BOXES
// ============================================
/**
 * Vẽ bounding boxes lên canvas
 * @param {Array} predictions - Danh sách predictions
 * @param {HTMLImageElement} img - Element ảnh
 */
function drawBoundingBoxes(predictions, img) {
    if (!bboxCanvas || !bboxCtx || !img) return;
    
    // Clear canvas
    bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height);
    
    if (!boundingBoxesVisible || !predictions || predictions.length === 0) {
        return;
    }
    
    // Đợi ảnh load xong
    if (!img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
        console.warn('Image not loaded yet, cannot draw bounding boxes');
        return;
    }
    
    // Lấy kích thước thực tế của ảnh gốc (tọa độ bbox dựa trên kích thước này)
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;
    
    // Lấy kích thước hiển thị thực tế của ảnh (sau khi CSS scale)
    // Sử dụng getBoundingClientRect để lấy kích thước chính xác
    const imgRect = img.getBoundingClientRect();
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;
    
    // Tính scale factor (ảnh gốc -> ảnh hiển thị)
    const scaleX = imgDisplayWidth / imgNaturalWidth;
    const scaleY = imgDisplayHeight / imgNaturalHeight;
    
    // Set canvas size để match chính xác với ảnh hiển thị
    // Sử dụng devicePixelRatio để đảm bảo độ sắc nét trên màn hình retina
    const dpr = window.devicePixelRatio || 1;
    
    // Reset transform trước khi set size mới
    bboxCtx.setTransform(1, 0, 0, 1, 0, 0);
    
    bboxCanvas.width = imgDisplayWidth * dpr;
    bboxCanvas.height = imgDisplayHeight * dpr;
    bboxCanvas.style.width = imgDisplayWidth + 'px';
    bboxCanvas.style.height = imgDisplayHeight + 'px';
    
    // Scale context để match với devicePixelRatio
    bboxCtx.scale(dpr, dpr);
    
    // Đảm bảo canvas được đặt đúng vị trí trên ảnh
    bboxCanvas.style.position = 'absolute';
    bboxCanvas.style.top = '0';
    bboxCanvas.style.left = '0';
    bboxCanvas.style.pointerEvents = 'none';
    
    console.log('Drawing bounding boxes:', {
        naturalSize: { width: imgNaturalWidth, height: imgNaturalHeight },
        displaySize: { width: imgDisplayWidth, height: imgDisplayHeight },
        scale: { x: scaleX, y: scaleY }
    });
    
    // Vẽ từng bounding box
    predictions.forEach((pred, index) => {
        // Kiểm tra tọa độ hợp lệ
        if (pred.bbox_x1 === null || pred.bbox_x1 === undefined || 
            pred.bbox_y1 === null || pred.bbox_y1 === undefined ||
            pred.bbox_x2 === null || pred.bbox_x2 === undefined ||
            pred.bbox_y2 === null || pred.bbox_y2 === undefined) {
            return; // Skip nếu không có tọa độ
        }
        
        // Tọa độ bbox trong database là pixel tuyệt đối của ảnh gốc
        // Scale tọa độ từ ảnh gốc sang ảnh hiển thị
        const x1 = pred.bbox_x1 * scaleX;
        const y1 = pred.bbox_y1 * scaleY;
        const x2 = pred.bbox_x2 * scaleX;
        const y2 = pred.bbox_y2 * scaleY;
        
        const width = x2 - x1;
        const height = y2 - y1;
        
        // Màu sắc dựa trên category
        const category = pred.waste_categories;
        const colors = {
            'Plastic': '#3b82f6',
            'Paper': '#eab308',
            'Metal': '#636e72',
            'Glass': '#ef4444',
            'Organic': '#22c55e'
        };
        const color = category && colors[category.name] ? colors[category.name] : '#3b82f6';
        
        // Vẽ bounding box
        bboxCtx.strokeStyle = color;
        bboxCtx.lineWidth = 3;
        bboxCtx.strokeRect(x1, y1, width, height);
        
        // Vẽ background cho label
        const label = category ? category.name : 'Unknown';
        const confidence = pred.confidence ? (pred.confidence * 100).toFixed(1) + '%' : 'N/A';
        const labelText = `${label} (${confidence})`;
        
        bboxCtx.font = 'bold 14px Arial';
        const textMetrics = bboxCtx.measureText(labelText);
        const textWidth = textMetrics.width;
        const textHeight = 20;
        
        // Đảm bảo label không bị vẽ ngoài canvas
        const labelX = Math.max(0, Math.min(x1, imgDisplayWidth - textWidth - 10));
        const labelY = Math.max(textHeight, y1);
        
        // Background cho text
        bboxCtx.fillStyle = color;
        bboxCtx.fillRect(labelX, labelY - textHeight - 2, textWidth + 10, textHeight);
        
        // Text
        bboxCtx.fillStyle = 'white';
        bboxCtx.fillText(labelText, labelX + 5, labelY - 5);
    });
}

/**
 * Toggle hiển thị bounding boxes
 */
function toggleBoundingBoxes() {
    boundingBoxesVisible = !boundingBoxesVisible;
    
    const toggleBtn = document.getElementById('toggleBboxBtn');
    const img = document.getElementById('modalImagePreview');
    
    if (toggleBtn) {
        if (boundingBoxesVisible) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ẩn Bounding Boxes';
            toggleBtn.classList.remove('btn-primary');
            toggleBtn.classList.add('btn-warning');
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Hiện Bounding Boxes';
            toggleBtn.classList.remove('btn-warning');
            toggleBtn.classList.add('btn-primary');
        }
    }
    
    // Vẽ lại bounding boxes
    if (img && currentPredictions.length > 0) {
        // Đợi ảnh load xong và DOM update
        const redraw = () => {
            // Đợi một chút để đảm bảo layout đã ổn định
            setTimeout(() => {
                if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                    // Đợi thêm một frame để đảm bảo CSS đã apply
                    requestAnimationFrame(() => {
                        drawBoundingBoxes(currentPredictions, img);
                    });
                }
            }, 50);
        };
        
        if (img.complete && img.naturalWidth > 0) {
            redraw();
        } else {
            img.onload = redraw;
        }
    }
}

// ============================================
// 9. XEM FEEDBACKS CỦA ẢNH
// ============================================
async function handleViewFeedbacks(imageId, imageUrl) {
    try {
        // Reset state
        currentPredictions = [];
        boundingBoxesVisible = false;
        
        // Lấy URL gốc từ database để có thể thử lại các format
        const client = window.SupabaseService.getSupabaseClient();
        let rawImageUrl = imageUrl;
        
        try {
            const { data: image } = await client
                .from('images')
                .select('file_path')
                .eq('image_id', imageId)
                .single();
            
            if (image && image.file_path) {
                rawImageUrl = image.file_path;
            }
        } catch (error) {
            console.warn('Could not get raw image URL:', error);
        }
        
        // Lưu thông tin ảnh đang xem (dùng URL đã convert để download)
        currentSelectedImage = { imageId, imageUrl: imageUrl || rawImageUrl };
        
        // Mở modal
        document.getElementById('feedbackModal').style.display = 'flex';
        
        // Initialize canvas
        bboxCanvas = document.getElementById('bboxCanvas');
        if (bboxCanvas) {
            bboxCtx = bboxCanvas.getContext('2d');
        }
        
        // Load predictions và feedbacks song song
        const predictionsList = document.getElementById('predictionsList');
        const feedbacksList = document.getElementById('feedbacksList');
        
        predictionsList.innerHTML = '<p class="loading-text">Đang tải predictions...</p>';
        feedbacksList.innerHTML = '<p class="loading-text">Đang tải feedbacks...</p>';
        
        // Load predictions
        const predictions = await getPredictionsByImageId(imageId);
        currentPredictions = predictions || [];
        
        // Hiển thị predictions
        if (!predictions || predictions.length === 0) {
            predictionsList.innerHTML = '<p class="loading-text">Chưa có predictions nào cho ảnh này</p>';
        } else {
            predictionsList.innerHTML = predictions.map((pred, index) => {
                const category = pred.waste_categories;
                const model = pred.ai_models;
                const confidence = pred.confidence ? (pred.confidence * 100).toFixed(2) + '%' : 'N/A';
                const hasBbox = pred.bbox_x1 !== null && pred.bbox_x1 !== undefined;
                
                return `
                    <div class="prediction-item" data-prediction-index="${index}">
                        <div class="prediction-header">
                            <div class="prediction-info">
                                <span class="prediction-id">#${pred.prediction_id}</span>
                                <span class="prediction-category">${category ? category.name : 'Unknown'}</span>
                                ${category && category.bin_color 
                                    ? `<span class="bin-color-badge">${category.bin_color}</span>` 
                                    : ''
                                }
                            </div>
                            <span class="prediction-confidence">${confidence}</span>
                        </div>
                        <div class="prediction-details">
                            <p><strong>Model:</strong> ${model ? `${model.name} v${model.version}` : 'N/A'}</p>
                            ${hasBbox 
                                ? `<p><strong>Bounding Box:</strong> (${pred.bbox_x1.toFixed(0)}, ${pred.bbox_y1.toFixed(0)}) → (${pred.bbox_x2.toFixed(0)}, ${pred.bbox_y2.toFixed(0)})</p>`
                                : '<p><strong>Bounding Box:</strong> Không có</p>'
                            }
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        // Load feedbacks
        const feedbacks = await getFeedbacksByImageId(imageId);
        
        if (!feedbacks || feedbacks.length === 0) {
            feedbacksList.innerHTML = '<p class="loading-text">Chưa có feedback nào cho ảnh này</p>';
        } else {
            feedbacksList.innerHTML = feedbacks.map(feedback => {
                const feedbackDate = new Date(feedback.created_at).toLocaleString('vi-VN');
                const user = feedback.users;
                const correctedCategory = feedback.waste_categories;
                
                return `
                    <div class="feedback-item">
                        <div class="feedback-header">
                            <div class="feedback-user">
                                <i class="fas fa-user"></i>
                                <span><strong>${user?.name || user?.email || 'Unknown'}</strong></span>
                            </div>
                            <span class="feedback-date">${feedbackDate}</span>
                        </div>
                        ${feedback.comment 
                            ? `<div class="feedback-comment">
                                <p>${feedback.comment}</p>
                               </div>`
                            : ''
                        }
                        ${correctedCategory
                            ? `<div class="feedback-corrected">
                                <i class="fas fa-edit"></i>
                                <span>Đã sửa thành: <strong>${correctedCategory.name}</strong></span>
                                ${correctedCategory.bin_color ? `<span class="bin-color-badge">${correctedCategory.bin_color}</span>` : ''}
                               </div>`
                            : ''
                        }
                    </div>
                `;
            }).join('');
        }
        
        // Hiển thị ảnh trong modal
        const modalImagePreview = document.getElementById('modalImagePreview');
        if (modalImagePreview) {
            if (imageUrl) {
                modalImagePreview.src = imageUrl;
                modalImagePreview.setAttribute('data-original-url', rawImageUrl);
                modalImagePreview.onerror = function() {
                    handleImageError(this);
                };
                
                // Vẽ bounding boxes khi ảnh load xong
                modalImagePreview.onload = function() {
                    // Đợi layout ổn định trước khi vẽ
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            if (currentPredictions.length > 0 && boundingBoxesVisible) {
                                drawBoundingBoxes(currentPredictions, this);
                            }
                        }, 50);
                    });
                };
            } else {
                // Nếu không có URL đã convert, thử convert từ URL gốc
                const convertedUrl = getImageUrl(rawImageUrl);
                if (convertedUrl) {
                    modalImagePreview.src = convertedUrl;
                    modalImagePreview.setAttribute('data-original-url', rawImageUrl);
                    modalImagePreview.onerror = function() {
                        handleImageError(this);
                    };
                    
                    // Vẽ bounding boxes khi ảnh load xong
                    modalImagePreview.onload = function() {
                        // Đợi layout ổn định trước khi vẽ
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                if (currentPredictions.length > 0 && boundingBoxesVisible) {
                                    drawBoundingBoxes(currentPredictions, this);
                                }
                            }, 50);
                        });
                    };
                } else {
                    showImagePlaceholder(modalImagePreview);
                }
            }
        }
        
        // Reset toggle button
        const toggleBtn = document.getElementById('toggleBboxBtn');
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Hiện Bounding Boxes';
            toggleBtn.classList.remove('btn-warning');
            toggleBtn.classList.add('btn-primary');
            if (currentPredictions.length === 0) {
                toggleBtn.disabled = true;
                toggleBtn.title = 'Không có predictions với bounding boxes';
            } else {
                toggleBtn.disabled = false;
                toggleBtn.title = '';
            }
        }
    } catch (error) {
        console.error('Error viewing feedbacks:', error);
        document.getElementById('feedbacksList').innerHTML = 
            `<div class="error-text">Lỗi: ${error.message}</div>`;
        window.AdminMain.showAdminAlert('Lỗi khi tải dữ liệu: ' + error.message, 'error');
    }
}

// ============================================
// 10. XÓA ẢNH
// ============================================
/**
 * Xóa ảnh khỏi database
 * @param {number} imageId - ID của image
 */
async function deleteImage(imageId) {
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
        
        // Xóa record trong database (CASCADE sẽ tự động xóa predictions và feedbacks)
        const { error } = await client
            .from('images')
            .delete()
            .eq('image_id', imageId);
        
        if (error) throw error;
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
}

/**
 * Handle xóa ảnh với confirmation
 */
async function handleDeleteImage(imageId, filePath) {
    // Lấy thông tin ảnh để hiển thị trong confirm
    let imageInfo = '';
    try {
        const client = window.SupabaseService.getSupabaseClient();
        const { data: image } = await client
            .from('images')
            .select('image_id')
            .eq('image_id', imageId)
            .single();
        
        if (image) {
            imageInfo = `ảnh #${image.image_id}`;
        }
    } catch (error) {
        console.error('Error getting image info:', error);
    }
    
    // Tạo message cảnh báo
    const confirmMessage = `Bạn có chắc chắn muốn xóa ${imageInfo || 'ảnh này'}?\n\n` +
        `⚠️ Lưu ý:\n` +
        `- Xóa ảnh sẽ KHÔNG tự động xóa ảnh được lưu trên Google Drive\n` +
        `- Dữ liệu trong bảng images của ảnh đó sẽ bị xóa\n` +
        `- Các predictions và feedbacks liên quan cũng sẽ bị xóa (CASCADE)`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        await deleteImage(imageId);
        window.AdminMain.showAdminAlert('Đã xóa ảnh khỏi database thành công', 'success');
        
        // Reload images grid
        await loadImagesGrid(getCurrentFilters());
    } catch (error) {
        console.error('Error deleting image:', error);
        window.AdminMain.showAdminAlert('Lỗi khi xóa ảnh: ' + error.message, 'error');
    }
}

// ============================================
// 11. TẢI ẢNH VỀ MÁY
// ============================================
async function handleDownloadImage(imageId, imageUrl) {
    if (!imageUrl) {
        window.AdminMain.showAdminAlert('Không thể tải ảnh. URL không hợp lệ.', 'error');
        return;
    }
    
    try {
        // Lấy thông tin image để có tên file
        const client = window.SupabaseService.getSupabaseClient();
        const { data: image } = await client
            .from('images')
            .select('file_path, created_at')
            .eq('image_id', imageId)
            .single();
        
        // Tạo tên file
        const fileName = image?.file_path 
            ? image.file_path.split('/').pop() || `image_${imageId}_${Date.now()}.jpg`
            : `image_${imageId}_${Date.now()}.jpg`;
        
        await downloadImage(imageUrl, fileName);
    } catch (error) {
        console.error('Error downloading image:', error);
        window.AdminMain.showAdminAlert('Lỗi khi tải ảnh: ' + error.message, 'error');
    }
}

function downloadSelectedImage() {
    if (currentSelectedImage && currentSelectedImage.imageUrl) {
        handleDownloadImage(currentSelectedImage.imageId, currentSelectedImage.imageUrl);
    } else {
        window.AdminMain.showAdminAlert('Không có ảnh được chọn', 'error');
    }
}

// ============================================
// 12. MODAL HANDLERS
// ============================================
function closeFeedbackModal() {
    document.getElementById('feedbackModal').style.display = 'none';
    currentSelectedImage = null;
    currentPredictions = [];
    boundingBoxesVisible = false;
    
    // Clear canvas
    if (bboxCtx && bboxCanvas) {
        bboxCtx.clearRect(0, 0, bboxCanvas.width, bboxCanvas.height);
    }
}

// ============================================
// 13. FILTERS HANDLING
// ============================================
function getCurrentFilters() {
    return {
        search: document.getElementById('imageSearch')?.value || '',
        status: document.getElementById('statusFilter')?.value || 'all',
        hasFeedback: document.getElementById('hasFeedbackFilter')?.value || 'all'
    };
}

// ============================================
// 14. INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Load images grid
    await loadImagesGrid();
    
    // Setup search filter
    const searchInput = document.getElementById('imageSearch');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadImagesGrid(getCurrentFilters());
            }, 500);
        });
    }
    
    // Setup status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            loadImagesGrid(getCurrentFilters());
        });
    }
    
    // Setup feedback filter
    const hasFeedbackFilter = document.getElementById('hasFeedbackFilter');
    if (hasFeedbackFilter) {
        hasFeedbackFilter.addEventListener('change', () => {
            loadImagesGrid(getCurrentFilters());
        });
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('feedbackModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeFeedbackModal();
            }
        });
    }
    
    // Handle window resize để vẽ lại bounding boxes
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const img = document.getElementById('modalImagePreview');
            if (img && boundingBoxesVisible && currentPredictions.length > 0 && img.complete) {
                requestAnimationFrame(() => {
                    drawBoundingBoxes(currentPredictions, img);
                });
            }
        }, 250);
    });
});

// Refresh function
async function refreshImages() {
    await loadImagesGrid(getCurrentFilters());
    window.AdminMain.showAdminAlert('Đã làm mới danh sách ảnh', 'success');
}

// Export functions
window.AdminFeedbacks = {
    getAllImagesWithFeedbackCount,
    getPredictionsByImageId,
    getFeedbacksByImageId,
    getImageUrl,
    downloadImage,
    deleteImage,
    loadImagesGrid,
    handleViewFeedbacks,
    handleDownloadImage,
    handleDeleteImage,
    toggleBoundingBoxes,
    drawBoundingBoxes,
    refreshImages
};

