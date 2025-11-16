// Main JavaScript file for EcoSort website

// Biến global cho phân trang lịch sử
let historyPaginationState = {
    currentPage: 1,
    itemsPerPage: 5,
    totalItems: 0,
    allHistoryItems: []
};

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all components
    initMobileMenu();
    initImageUpload();
    initScrollAnimations();
    initSmoothScrolling();
    initWasteClassification();

    console.log('EcoSort website initialized');
});

// Đợi Supabase ready rồi mới check session
window.addEventListener('supabase-ready', function () {
    checkUserSession();
    console.log('✅ Đã kiểm tra phiên đăng nhập');
    
    // Load lịch sử và thống kê sau khi Supabase ready
    setTimeout(() => {
        loadClassificationHistoryFromSupabase();
        loadSystemStatistics();
    }, 500);
});

// Kiểm tra phiên đăng nhập
async function checkUserSession() {
    if (!window.SupabaseService) return;

    try {
        const user = await window.SupabaseService.getCurrentUser();

        if (user) {
            // Người dùng đã đăng nhập
            updateUIForLoggedInUser(user);
        }
    } catch (error) {
        console.error('Lỗi kiểm tra phiên đăng nhập:', error);
    }
}

// Cập nhật UI khi đã đăng nhập
function updateUIForLoggedInUser(user) {
    const loginBtn = document.querySelector('.btn-login');
    if (loginBtn) {
        loginBtn.textContent = user.user_metadata?.full_name || user.email.split('@')[0];
        loginBtn.href = '#';
        loginBtn.onclick = (e) => {
            e.preventDefault();
            showUserMenu();
        };
    }
}

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');

    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', function () {
            nav.classList.toggle('active');
            const icon = this.querySelector('i');
            if (nav.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Image Upload and Classification
function initImageUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const imageInput = document.getElementById('imageInput');
    const cameraBtn = document.getElementById('cameraBtn');
    const retryBtn = document.getElementById('retryBtn');
    const resultArea = document.getElementById('resultArea');
    const previewImage = document.getElementById('previewImage');

    if (!uploadBox || !imageInput) return;

    // Click to upload
    uploadBox.addEventListener('click', () => {
        imageInput.click();
    });

    // Drag and drop functionality
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageUpload(files[0]);
        }
    });

    // File input change
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageUpload(e.target.files[0]);
        }
    });

    // Camera button
    if (cameraBtn) {
        cameraBtn.addEventListener('click', activateCamera);
    }

    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', retryClassification);
    }
}

// Handle image upload and display
// function handleImageUpload(file) {
//     if (!file.type.startsWith('image/')) {
//         showAlert('Vui lòng chọn file hình ảnh hợp lệ', 'error');
//         return;
//     }

//     if (file.size > 10 * 1024 * 1024) { // 10MB limit
//         showAlert('Kích thước file không được vượt quá 10MB', 'error');
//         return;
//     }

//     const reader = new FileReader();
//     reader.onload = function(e) {
//         const previewImage = document.getElementById('previewImage');
//         const resultArea = document.getElementById('resultArea');

//         if (previewImage && resultArea) {
//             previewImage.src = e.target.result;
//             resultArea.style.display = 'block';

//             // Simulate classification
//             setTimeout(() => {
//                 classifyWaste(file);
//             }, 1500);
//         }
//     };
//     reader.readAsDataURL(file);
// }

// ------------------------------------------------------
// 2️⃣ XỬ LÝ ẢNH KHI NGƯỜI DÙNG CHỌN HOẶC KÉO THẢ VÀO TRANG
// ------------------------------------------------------
async function handleImageUpload(file) {
    // Kiểm tra file hợp lệ
    if (!file.type.startsWith('image/')) return alert('Vui lòng chọn ảnh hợp lệ!');
    if (file.size > 10 * 1024 * 1024) return alert('Ảnh vượt quá 10MB!');

    // Hiển thị ảnh preview lên giao diện
    const previewImage = document.getElementById('previewImage');
    const resultArea = document.getElementById('resultArea');
    previewImage.src = URL.createObjectURL(file);
    resultArea.style.display = 'block';

    // Hiển thị overlay “Đang phân tích...”
    const overlay = createLoadingOverlay();

    try {
        // Lấy token đăng nhập Supabase (JWT)
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) {
            alert('Bạn cần đăng nhập trước khi phân loại!');
            removeLoadingOverlay(overlay);
            return;
        }

        const token = session.access_token;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', session.user.id);

        // ----------------------------------------------
        // 3️⃣ GỬI ẢNH LÊN BACKEND FLASK ĐỂ NHẬN DIỆN
        // ----------------------------------------------
        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }, // JWT của người dùng Supabase
            body: formData
        });

        // Nhận phản hồi từ backend (YOLO đã xử lý)
        const result = await response.json();
        removeLoadingOverlay(overlay);

        if (response.ok) {
            // Lưu image_id từ response (backend có thể trả về image_id)
            if (result.image_id) {
                currentImageData.image_id = result.image_id;
            } else if (result.file_url) {
                // Nếu không có image_id trong response, query từ database dựa trên file_url
                await getImageIdFromFileUrl(result.file_url);
            }
            // 4️⃣ HIỂN THỊ KẾT QUẢ NHẬN DIỆN LÊN GIAO DIỆN
            displayClassificationResult(result);
        } else {
            showError(result.error || 'Không thể phân loại ảnh.');
        }
    } 
    catch (err) {
        console.error('❌ Lỗi upload:', err);
        removeLoadingOverlay(overlay);
        showError('Lỗi kết nối tới hệ thống nhận diện.');
    }
}

// Hiển thị thông báo lỗi
function showError(message) {
    const resultCard = document.getElementById('resultCard');
    const errorMessage = document.getElementById('errorMessage');
    const resultArea = document.getElementById('resultArea');
    const previewImage = document.getElementById('previewImage');
    const imageToggleControls = document.getElementById('imageToggleControls');
    
    // Hiển thị vùng kết quả
    if (resultArea) {
        resultArea.style.display = 'block';
    }
    
    // Ẩn kết quả phân loại
    if (resultCard) {
        resultCard.style.display = 'none';
        resultCard.innerHTML = '';
    }
    
    // Hiển thị thông báo lỗi
    if (errorMessage) {
        errorMessage.style.display = 'block';
        const errorContent = errorMessage.querySelector('.error-content p');
        if (errorContent) {
            errorContent.textContent = message;
        }
    }
    
    // Ẩn toggle controls
    if (imageToggleControls) {
        imageToggleControls.style.display = 'none';
    }
    
    // Giữ ảnh preview nếu có
    // (Không xóa ảnh preview để người dùng vẫn có thể thấy ảnh đã upload)
}


// Camera activation
function activateCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
                // Create camera interface
                createCameraInterface(stream);
            })
            .catch(function (error) {
                console.error('Camera access denied:', error);
                showAlert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.', 'error');
            });
    } else {
        showAlert('Trình duyệt không hỗ trợ camera', 'error');
    }
}

// Create camera interface - HIỂN THỊ GIAO DIỆN CAMERA + CHỤP ẢNH
function createCameraInterface(stream) {
    // Ngăn scroll body khi modal mở
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Create modal for camera
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
        <div class="camera-container">
            <video id="cameraVideo" autoplay muted playsinline></video>
            <canvas id="cameraCanvas" style="display: none;"></canvas>
            <div class="camera-controls">
                <button class="btn btn-primary" id="captureBtn">
                    <i class="fas fa-camera"></i> Chụp ảnh
                </button>
                <button class="btn btn-secondary" id="closeCameraBtn">
                    <i class="fas fa-times"></i> Đóng
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const captureBtn = document.getElementById('captureBtn');
    const closeBtn = document.getElementById('closeCameraBtn');
    const cameraContainer = modal.querySelector('.camera-container');

    video.srcObject = stream;

    captureBtn.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        // Chuyển đổi canvas thành blob và upload
        canvas.toBlob((blob) => {
            if (blob) {
                // Tạo File object từ blob với tên file
                const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                handleImageUpload(file);
                closeCameraModal();
            }
        }, 'image/jpeg', 0.9);
    });

    closeBtn.addEventListener('click', closeCameraModal);

    // Đóng modal khi click vào overlay (background)
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCameraModal();
        }
    });

    // Đóng modal khi nhấn phím ESC
    const handleEscapeKey = (e) => {
        if (e.key === 'Escape' || e.keyCode === 27) {
            closeCameraModal();
        }
    };
    document.addEventListener('keydown', handleEscapeKey);

    function closeCameraModal() {
        // Dừng stream camera
        stream.getTracks().forEach(track => track.stop());
        
        // Xóa event listener cho phím ESC
        document.removeEventListener('keydown', handleEscapeKey);
        
        // Khôi phục scroll body
        document.body.style.overflow = originalOverflow;
        
        // Xóa modal
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }
}

// Waste classification simulation
// function classifyWaste(file) {
//     // Simulate API call delay
//     const loadingOverlay = createLoadingOverlay();

//     // Mock classification results
//     const wasteTypes = [
//         {
//             name: 'Chai nhựa',
//             icon: 'fas fa-bottle-water',
//             confidence: 95,
//             type: 'recyclable',
//             disposal: 'Rác tái chế - Vui lòng rửa sạch và bỏ vào thùng rác màu xanh lá',
//             color: '#10b981'
//         },
//         {
//             name: 'Giấy báo',
//             icon: 'fas fa-newspaper',
//             confidence: 88,
//             type: 'recyclable',
//             disposal: 'Rác tái chế - Bỏ vào thùng rác màu xanh lá',
//             color: '#10b981'
//         },
//         {
//             name: 'Vỏ chuối',
//             icon: 'fas fa-leaf',
//             confidence: 92,
//             type: 'organic',
//             disposal: 'Rác hữu cơ - Bỏ vào thùng rác màu nâu để ủ phân',
//             color: '#8b5cf6'
//         },
//         {
//             name: 'Pin cũ',
//             icon: 'fas fa-battery-half',
//             confidence: 97,
//             type: 'hazardous',
//             disposal: 'Rác độc hại - Bỏ vào thùng rác màu đỏ hoặc điểm thu gom chuyên biệt',
//             color: '#ef4444'
//         }
//     ];

//     // Simulate random success/failure (15% failure rate as per requirements)
//     const isSuccess = Math.random() > 0.15;

//     setTimeout(() => {
//         removeLoadingOverlay(loadingOverlay);

//         if (isSuccess) {
//             // Random classification result
//             const result = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
//             displayClassificationResult(result);

//             // Save to history (localStorage for demo)
//             saveToHistory(result, file.name || 'camera-image.jpg');
//         } else {
//             // Show error message for unrecognized waste
//             displayClassificationError();
//         }
//     }, 2000);
// }

// Create loading overlay- TẠO OVERLAY “ĐANG PHÂN TÍCH” KHI GỬI ẢNH
function createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>Đang phân tích hình ảnh...</p>
        </div>
    `;

    const resultArea = document.getElementById('resultArea');
    if (resultArea) {
        resultArea.appendChild(overlay);
    }

    return overlay;
}

// Remove loading overlay
function removeLoadingOverlay(overlay) {
    if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
    }
}

// Display classification result
// function displayClassificationResult(result) {
//     const resultCard = document.querySelector('.result-card');
//     const errorMessage = document.getElementById('errorMessage');

//     if (!resultCard) return;

//     // Hide error message and show result
//     if (errorMessage) {
//         errorMessage.style.display = 'none';
//     }
//     resultCard.style.display = 'block';

//     resultCard.innerHTML = `
//         <div class="waste-type">
//             <i class="${result.icon}" style="color: ${result.color}"></i>
//             <span class="type-name">${result.name}</span>
//             <span class="confidence">${result.confidence}%</span>
//         </div>
//         <div class="disposal-info">
//             <h4>Hướng dẫn xử lý:</h4>
//             <p>${result.disposal}</p>
//         </div>
//     `;

//     // Add animation
//     resultCard.classList.add('fade-in');
// }

// ----------------------------------------
// 8️⃣ HIỂN THỊ KẾT QUẢ PHÂN LOẠI TỪ BACKEND
// ----------------------------------------
let currentImageData = {
    original: null,
    predictions: [],
    showBoundingBox: false,
    imageWidth: 0,
    imageHeight: 0,
    image_id: null // Lưu image_id để dùng cho feedback
};

function displayClassificationResult(apiResult) {
    const resultCard = document.getElementById('resultCard');
    const errorMessage = document.getElementById('errorMessage');
    const previewImage = document.getElementById('previewImage');
    const imageToggleControls = document.getElementById('imageToggleControls');
    const toggleBoundingBoxBtn = document.getElementById('toggleBoundingBoxBtn');
    
    // Lưu dữ liệu ảnh và predictions
    currentImageData.original = apiResult.original_image_base64;
    currentImageData.predictions = apiResult.predictions || [];
    currentImageData.showBoundingBox = false;

    // Kiểm tra xem có predictions không
    const hasPredictions = apiResult.has_predictions && apiResult.predictions && apiResult.predictions.length > 0;
    
    if (!hasPredictions) {
        // Không có predictions - hiển thị thông báo lỗi
        errorMessage.style.display = 'block';
        resultCard.style.display = 'none';
        resultCard.innerHTML = '';
        imageToggleControls.style.display = 'none';
        clearBoundingBoxes();
        
        // Hiển thị ảnh gốc
        if (currentImageData.original) {
            previewImage.src = currentImageData.original;
        }
        return;
    }

    // Có predictions - hiển thị kết quả
    errorMessage.style.display = 'none';
    resultCard.style.display = 'block';
    
    // Hiển thị ảnh gốc mặc định
    if (currentImageData.original) {
        previewImage.src = currentImageData.original;
    }
    
    // Hiển thị toggle controls nếu có predictions
    if (currentImageData.predictions.length > 0) {
        imageToggleControls.style.display = 'block';
        updateToggleButtonText();
    } else {
        imageToggleControls.style.display = 'none';
    }

    // Lấy danh sách categories duy nhất (nhóm theo category_name)
    const categoryMap = new Map();
    apiResult.predictions.forEach(p => {
        const categoryName = p.category_name || 'Không xác định';
        if (!categoryMap.has(categoryName)) {
            categoryMap.set(categoryName, {
                name: categoryName,
                count: 0,
                maxConfidence: 0,
                predictions: []
            });
        }
        const category = categoryMap.get(categoryName);
        category.count++;
        category.maxConfidence = Math.max(category.maxConfidence, p.confidence);
        category.predictions.push(p);
    });

    // Tạo HTML cho từng category
    const categoryItems = Array.from(categoryMap.values()).map(category => {
        const icon = getCategoryIcon(category.name);
        const color = getCategoryColor(category.name);
        const confidencePercent = (category.maxConfidence * 100).toFixed(1);
        
        return `
            <div class="waste-type-card" style="border-left: 4px solid ${color};">
                <div class="waste-type-header">
                    <div class="waste-type-icon" style="color: ${color};">
                        <i class="${icon}"></i>
                    </div>
                    <div class="waste-type-info">
                        <span class="type-name">${category.name}</span>
                        <span class="waste-count">${category.count} vật thể</span>
                    </div>
                    <div class="confidence-badge" style="background-color: ${color}20; color: ${color};">
                        ${confidencePercent}%
                    </div>
                </div>
                <div class="waste-type-details">
                    <p class="confidence-text">Độ tin cậy trung bình: ${confidencePercent}%</p>
                </div>
            </div>
        `;
    }).join('');

    // Lưu image_id nếu có trong response
    if (apiResult.image_id) {
        currentImageData.image_id = apiResult.image_id;
    }

    // Render kết quả ra thẻ HTML
    resultCard.innerHTML = `
        <div class="result-header">
            <h3>Kết quả phân loại</h3>
            <span class="result-count">Phát hiện ${apiResult.predictions.length} vật thể</span>
        </div>
        <div class="waste-types-list">
            ${categoryItems}
        </div>
        <div class="disposal-info">
            <h4><i class="fas fa-info-circle"></i> Hướng dẫn xử lý:</h4>
            <p>Hãy phân loại và bỏ vào thùng rác tương ứng theo hướng dẫn bên dưới.</p>
            ${apiResult.file_url ? `<a href="${apiResult.file_url}" target="_blank" class="link-external"><i class="fas fa-external-link-alt"></i> Xem ảnh đã upload trên Drive</a>` : ''}
        </div>
        ${currentImageData.image_id ? `
        <div class="feedback-section" id="feedbackSection">
            <div class="feedback-header">
                <h4><i class="fas fa-comment-dots"></i> Đánh giá kết quả phân loại</h4>
                <p class="feedback-description">Bạn có thể đánh giá kết quả phân loại này có đúng với ý bạn không? Vì một ảnh có thể có nhiều vật thể, bạn có thể chọn nhiều loại rác đúng.</p>
            </div>
            <form id="feedbackForm" class="feedback-form">
                <div class="form-group">
                    <label for="feedbackComment">Nhận xét (tùy chọn):</label>
                    <textarea id="feedbackComment" rows="3" placeholder="Nhập nhận xét của bạn về kết quả phân loại..."></textarea>
                </div>
                <div class="form-group">
                    <label>Loại rác đúng theo ý bạn (có thể chọn nhiều):</label>
                    <div id="correctedCategoriesList" class="categories-checkbox-list">
                        <div class="loading-categories">Đang tải danh sách loại rác...</div>
                    </div>
                    <small class="form-hint">Nếu kết quả phân loại không đúng, hãy chọn các loại rác đúng ở đây. Bạn có thể chọn nhiều loại nếu ảnh có nhiều vật thể.</small>
                </div>
                <div class="feedback-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> Gửi đánh giá
                    </button>
                    <button type="button" class="btn btn-outline" id="cancelFeedbackBtn">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                </div>
            </form>
        </div>
        ` : ''}
    `;

    // Load waste categories cho dropdown nếu có feedback section
    if (currentImageData.image_id) {
        loadWasteCategoriesForFeedback();
        initFeedbackForm();
    }

    // Thiết lập sự kiện cho toggle bounding box
    if (toggleBoundingBoxBtn) {
        toggleBoundingBoxBtn.onclick = toggleBoundingBox;
    }
    
    // Ẩn bounding boxes mặc định (chỉ hiển thị khi người dùng bật)
    const canvas = document.getElementById('boundingBoxCanvas');
    if (canvas) {
        canvas.style.display = 'none';
    }
    
    // Reload lịch sử và thống kê sau khi phân loại xong
    setTimeout(() => {
        loadClassificationHistoryFromSupabase();
        loadSystemStatistics();
    }, 1000);
}

// Lấy image_id từ database dựa trên file_url
async function getImageIdFromFileUrl(fileUrl) {
    if (!window.SupabaseService || !fileUrl) return;

    try {
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) return;

        const client = window.SupabaseService.getSupabaseClient();
        if (!client) return;

        // Query image dựa trên file_path (file_url) và user_id
        // Lấy image mới nhất của user có file_path chứa fileUrl hoặc khớp với fileUrl
        const { data: images, error } = await client
            .from('images')
            .select('image_id, file_path')
            .eq('user_id', session.user.id)
            .eq('status', 'done')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Lỗi khi query image_id:', error);
            return;
        }

        if (images && images.length > 0) {
            // Kiểm tra xem file_path có khớp với fileUrl không
            const image = images[0];
            // file_path có thể là URL Google Drive hoặc path
            if (image.file_path === fileUrl || image.file_path.includes(fileUrl) || fileUrl.includes(image.file_path)) {
                currentImageData.image_id = image.image_id;
            } else {
                // Nếu không khớp chính xác, lấy image mới nhất (có thể là image vừa upload)
                currentImageData.image_id = image.image_id;
            }
        }
    } catch (error) {
        console.error('Lỗi khi lấy image_id từ file_url:', error);
    }
}

// Convert Google Drive URL to viewable format
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
        // Thử format uc?export=view trước (format chuẩn)
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    
    // Nếu URL đã có format đúng, chỉ cần fix HTML entities
    return url;
}

// Handle image error - thử các format khác nhau
function handleImageError(img) {
    // Kiểm tra xem ảnh đã có src hợp lệ chưa (không phải placeholder)
    const currentSrc = img.src;
    if (currentSrc && currentSrc.includes('data:image/svg+xml')) {
        // Đã là placeholder rồi, không làm gì
        return;
    }
    
    // Thử nhiều cách để lấy original URL
    let originalUrl = img.getAttribute('data-original-url') || 
                      img.dataset.originalUrl || 
                      img.getAttribute('data-original-url');
    
    // Nếu vẫn không có, thử lấy từ src hiện tại (có thể là URL đã convert)
    if (!originalUrl || originalUrl.trim() === '') {
        // Có thể src hiện tại chính là URL gốc hoặc đã convert
        const currentUrl = img.src;
        if (currentUrl && currentUrl.includes('drive.google.com')) {
            originalUrl = currentUrl;
        }
    }
    
    if (!originalUrl || originalUrl.trim() === '') {
        // Nếu không có original URL, hiển thị placeholder
        console.warn('No original URL found for image, showing placeholder', {
            src: img.src,
            attributes: Array.from(img.attributes).map(a => `${a.name}=${a.value}`)
        });
        showImagePlaceholder(img);
        return;
    }
    
    // Extract file ID
    let fileId = null;
    const match = originalUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
        fileId = match[1];
    } else {
        const match2 = originalUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match2) {
            fileId = match2[1];
        }
    }
    
    if (!fileId) {
        console.warn('Could not extract file ID from URL:', originalUrl);
        showImagePlaceholder(img);
        return;
    }
    
    // Thử các format khác nhau
    const formats = [
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
        `https://drive.google.com/uc?export=download&id=${fileId}`,
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        `https://lh3.googleusercontent.com/d/${fileId}`
    ];
    
    let currentFormatIndex = 0;
    let hasTried = false;
    
    const tryNextFormat = () => {
        if (currentFormatIndex >= formats.length) {
            // Đã thử hết các format, hiển thị placeholder
            console.warn('All image formats failed, showing placeholder');
            showImagePlaceholder(img);
            return;
        }
        
        if (!hasTried) {
            hasTried = true;
            // Remove error handler tạm thời để tránh loop
            img.onerror = null;
        }
        
        const formatUrl = formats[currentFormatIndex];
        currentFormatIndex++;
        
        // Set error handler cho format tiếp theo
        img.onerror = currentFormatIndex < formats.length ? tryNextFormat : () => {
            console.warn('Last format failed, showing placeholder');
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
}

// Show placeholder image
function showImagePlaceholder(img) {
    const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    img.src = placeholderSvg;
    img.onerror = null; // Remove error handler để tránh loop
    img.style.display = 'block';
}

// Load waste categories cho feedback form (hiển thị dạng checkbox)
async function loadWasteCategoriesForFeedback() {
    if (!window.SupabaseService) return;

    try {
        const categories = await window.SupabaseService.getWasteCategories();
        const categoriesList = document.getElementById('correctedCategoriesList');
        
        if (!categoriesList) return;

        // Clear loading message
        categoriesList.innerHTML = '';
        
        if (!categories || categories.length === 0) {
            categoriesList.innerHTML = '<p class="no-categories">Không có loại rác nào</p>';
            return;
        }

        // Tạo checkbox list
        categories.forEach(category => {
            const categoryColor = getCategoryColor(category.name);
            const categoryIcon = getCategoryIcon(category.name);
            
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'category-checkbox-item';
            checkboxItem.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" 
                           name="correctedCategory" 
                           value="${category.category_id}" 
                           class="category-checkbox">
                    <span class="checkbox-custom" style="border-color: ${categoryColor};">
                        <i class="fas fa-check" style="color: ${categoryColor};"></i>
                    </span>
                    <span class="checkbox-content">
                        <i class="${categoryIcon}" style="color: ${categoryColor};"></i>
                        <span class="category-name">${category.name}</span>
                    </span>
                </label>
            `;
            categoriesList.appendChild(checkboxItem);
        });
    } catch (error) {
        console.error('Lỗi khi load waste categories cho feedback:', error);
        const categoriesList = document.getElementById('correctedCategoriesList');
        if (categoriesList) {
            categoriesList.innerHTML = '<p class="error-message">Không thể tải danh sách loại rác</p>';
        }
    }
}

// Initialize feedback form
function initFeedbackForm() {
    const feedbackForm = document.getElementById('feedbackForm');
    const cancelBtn = document.getElementById('cancelFeedbackBtn');

    if (!feedbackForm) return;

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitFeedbackForm();
    });

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const feedbackSection = document.getElementById('feedbackSection');
            if (feedbackSection) {
                feedbackSection.style.display = 'none';
            }
        });
    }
}

// Submit feedback form
async function submitFeedbackForm() {
    if (!window.SupabaseService) {
        showAlert('Không thể gửi đánh giá. Supabase service chưa sẵn sàng.', 'error');
        return;
    }

    if (!currentImageData.image_id) {
        showAlert('Không tìm thấy thông tin ảnh. Vui lòng thử lại.', 'error');
        return;
    }

    const comment = document.getElementById('feedbackComment')?.value.trim() || null;
    
    // Lấy tất cả các checkbox đã chọn
    const checkedBoxes = document.querySelectorAll('input[name="correctedCategory"]:checked');
    const correctedCategoryIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

    // Kiểm tra nếu không có comment và không có corrected category nào được chọn
    if (!comment && correctedCategoryIds.length === 0) {
        showAlert('Vui lòng nhập nhận xét hoặc chọn ít nhất một loại rác đúng.', 'warning');
        return;
    }

    try {
        // Nếu có comment và có categories được chọn
        // Tạo nhiều feedback records: một record cho comment (nếu có), và một record cho mỗi category
        const feedbackPromises = [];

        if (comment && correctedCategoryIds.length > 0) {
            // Nếu có cả comment và categories: tạo một record với comment cho category đầu tiên, các record còn lại không có comment
            correctedCategoryIds.forEach((categoryId, index) => {
                feedbackPromises.push(
                    window.SupabaseService.submitFeedback({
                        imageId: currentImageData.image_id,
                        comment: index === 0 ? comment : null, // Chỉ thêm comment vào record đầu tiên
                        correctedCategoryId: categoryId
                    })
                );
            });
        } else if (comment && correctedCategoryIds.length === 0) {
            // Chỉ có comment, không có category
            feedbackPromises.push(
                window.SupabaseService.submitFeedback({
                    imageId: currentImageData.image_id,
                    comment: comment,
                    correctedCategoryId: null
                })
            );
        } else if (correctedCategoryIds.length > 0) {
            // Chỉ có categories, không có comment
            correctedCategoryIds.forEach(categoryId => {
                feedbackPromises.push(
                    window.SupabaseService.submitFeedback({
                        imageId: currentImageData.image_id,
                        comment: null,
                        correctedCategoryId: categoryId
                    })
                );
            });
        }

        // Gửi tất cả feedbacks
        await Promise.all(feedbackPromises);
        
        const categoryCount = correctedCategoryIds.length;
        const message = categoryCount > 0 
            ? `Cảm ơn bạn đã đánh giá! Đã ghi nhận ${categoryCount} loại rác đúng${comment ? ' và nhận xét của bạn' : ''}.`
            : 'Cảm ơn bạn đã đánh giá! Phản hồi của bạn đã được ghi nhận.';
        
        showAlert(message, 'success');
        
        // Ẩn form feedback sau khi submit thành công
        const feedbackSection = document.getElementById('feedbackSection');
        if (feedbackSection) {
            feedbackSection.style.display = 'none';
        }

        // Reset form
        const feedbackForm = document.getElementById('feedbackForm');
        if (feedbackForm) {
            feedbackForm.reset();
            // Uncheck tất cả checkboxes
            document.querySelectorAll('input[name="correctedCategory"]').forEach(cb => {
                cb.checked = false;
            });
        }
    } catch (error) {
        console.error('Lỗi khi gửi feedback:', error);
        showAlert('Không thể gửi đánh giá. Vui lòng thử lại.', 'error');
    }
}

function getCategoryIcon(categoryName) {
    const iconMap = {
        'Nhựa': 'fas fa-bottle-water',
        'Giấy': 'fas fa-newspaper',
        'Kim loại': 'fas fa-cog',
        'Thủy tinh': 'fas fa-wine-glass',
        'Hữu cơ': 'fas fa-leaf',
        'Không xác định': 'fas fa-question-circle'
    };
    return iconMap[categoryName] || 'fas fa-recycle';
}

function getCategoryColor(categoryName) {
    const colorMap = {
        'Nhựa': '#3b82f6',
        'Giấy': '#10b981',
        'Kim loại': '#f59e0b',
        'Thủy tinh': '#8b5cf6',
        'Hữu cơ': '#22c55e',
        'Không xác định': '#6b7280'
    };
    return colorMap[categoryName] || '#6b7280';
}

// Tạo icon/ảnh đại diện cho loại rác (SVG)
function createWasteCategoryIcon(categoryName, size = 100) {
    const color = getCategoryColor(categoryName);
    const icon = getCategoryIcon(categoryName);
    
    // Tạo SVG icon với background màu và icon ở giữa
    const svg = `
        <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <style>
                    .category-icon-bg { fill: ${color}20; }
                    .category-icon { fill: ${color}; }
                </style>
            </defs>
            <rect width="${size}" height="${size}" rx="12" class="category-icon-bg"/>
            <g transform="translate(${size/2}, ${size/2})">
                <text x="0" y="0" font-family="Font Awesome 6 Free" font-weight="900" font-size="${size * 0.4}" 
                      text-anchor="middle" dominant-baseline="central" class="category-icon">
                    ${getCategoryIconUnicode(icon)}
                </text>
            </g>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

// Lấy unicode của Font Awesome icon
function getCategoryIconUnicode(iconClass) {
    const iconMap = {
        'fas fa-bottle-water': '&#xf853;',
        'fas fa-newspaper': '&#xf1ea;',
        'fas fa-cog': '&#xf013;',
        'fas fa-wine-glass': '&#xf4e3;',
        'fas fa-leaf': '&#xf06c;',
        'fas fa-question-circle': '&#xf059;',
        'fas fa-recycle': '&#xf1b8;'
    };
    return iconMap[iconClass] || iconMap['fas fa-recycle'];
}

// Tạo icon đơn giản hơn sử dụng HTML/CSS
function createWasteCategoryIconHTML(categoryName, size = 100) {
    const color = getCategoryColor(categoryName);
    const icon = getCategoryIcon(categoryName);
    
    return `
        <div style="
            width: ${size}px;
            height: ${size}px;
            background-color: ${color}20;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${color};
            font-size: ${size * 0.4}px;
        ">
            <i class="${icon}"></i>
        </div>
    `;
}

// Vẽ bounding boxes lên canvas
function drawBoundingBoxes() {
    const canvas = document.getElementById('boundingBoxCanvas');
    const previewImage = document.getElementById('previewImage');
    const wrapper = document.querySelector('.image-preview-wrapper');
    
    if (!canvas || !previewImage || !currentImageData.predictions || currentImageData.predictions.length === 0) {
        return;
    }
    
    // Đợi ảnh load xong
    if (!previewImage.complete || previewImage.naturalWidth === 0) {
        return;
    }
    
    // Lấy kích thước thực của ảnh và kích thước hiển thị
    const imgNaturalWidth = previewImage.naturalWidth;
    const imgNaturalHeight = previewImage.naturalHeight;
    
    // Lấy kích thước hiển thị thực tế của ảnh
    const imgRect = previewImage.getBoundingClientRect();
    const wrapperRect = wrapper ? wrapper.getBoundingClientRect() : imgRect;
    
    // Tính vị trí của ảnh trong wrapper
    const imgOffsetX = imgRect.left - wrapperRect.left;
    const imgOffsetY = imgRect.top - wrapperRect.top;
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;
    
    // Đặt kích thước và vị trí canvas để khớp với ảnh
    canvas.width = imgDisplayWidth;
    canvas.height = imgDisplayHeight;
    canvas.style.width = imgDisplayWidth + 'px';
    canvas.style.height = imgDisplayHeight + 'px';
    canvas.style.left = imgOffsetX + 'px';
    canvas.style.top = imgOffsetY + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Tính tỷ lệ scale từ kích thước thực sang kích thước hiển thị
    const scaleX = imgDisplayWidth / imgNaturalWidth;
    const scaleY = imgDisplayHeight / imgNaturalHeight;
    
    // Vẽ từng bounding box
    currentImageData.predictions.forEach((prediction, index) => {
        const bbox = prediction.bbox; // [x1, y1, x2, y2]
        if (!bbox || bbox.length !== 4) return;
        
        const [x1, y1, x2, y2] = bbox;
        
        // Scale tọa độ theo kích thước hiển thị
        const scaledX1 = x1 * scaleX;
        const scaledY1 = y1 * scaleY;
        const scaledX2 = x2 * scaleX;
        const scaledY2 = y2 * scaleY;
        
        const width = scaledX2 - scaledX1;
        const height = scaledY2 - scaledY1;
        
        // Lấy màu cho category
        const color = getCategoryColor(prediction.category_name);
        const categoryName = prediction.category_name || 'Không xác định';
        const confidence = (prediction.confidence * 100).toFixed(1);
        
        // Vẽ bounding box với màu tương ứng
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledX1, scaledY1, width, height);
        
        // Vẽ label với background
        const labelText = `${categoryName} ${confidence}%`;
        ctx.font = 'bold 14px Arial';
        const textMetrics = ctx.measureText(labelText);
        const labelPadding = 8;
        const labelWidth = textMetrics.width + labelPadding * 2;
        const labelHeight = 24;
        
        // Vẽ background cho label (có bo góc)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(scaledX1, Math.max(0, scaledY1 - labelHeight), labelWidth, labelHeight, 4);
        ctx.fill();
        
        // Vẽ text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        ctx.fillText(labelText, scaledX1 + labelPadding, Math.max(0, scaledY1 - labelHeight) + 5);
    });
}

// Polyfill cho roundRect nếu browser không hỗ trợ
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Xóa bounding boxes
function clearBoundingBoxes() {
    const canvas = document.getElementById('boundingBoxCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// Sự kiện khi ảnh load xong
function onImageLoad() {
    const previewImage = document.getElementById('previewImage');
    if (previewImage) {
        currentImageData.imageWidth = previewImage.naturalWidth;
        currentImageData.imageHeight = previewImage.naturalHeight;
        
        // Vẽ bounding boxes nếu đang bật
        if (currentImageData.showBoundingBox) {
            // Đợi một chút để đảm bảo layout đã được tính toán
            setTimeout(() => {
                drawBoundingBoxes();
            }, 100);
        }
    }
}

// Xử lý resize window để vẽ lại bounding boxes
let resizeTimeout;
window.addEventListener('resize', () => {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
        if (currentImageData.showBoundingBox && currentImageData.predictions.length > 0) {
            drawBoundingBoxes();
        }
    }, 250);
});

// Toggle hiển thị bounding boxes
function toggleBoundingBox() {
    const toggleBoundingBoxText = document.getElementById('toggleBoundingBoxText');
    const canvas = document.getElementById('boundingBoxCanvas');
    
    if (!currentImageData.predictions || currentImageData.predictions.length === 0) {
        return;
    }
    
    currentImageData.showBoundingBox = !currentImageData.showBoundingBox;
    
    if (currentImageData.showBoundingBox) {
        // Hiển thị bounding boxes
        if (canvas) {
            canvas.style.display = 'block';
            // Vẽ lại bounding boxes
            setTimeout(() => {
                drawBoundingBoxes();
            }, 100);
        }
        if (toggleBoundingBoxText) {
            toggleBoundingBoxText.textContent = 'Ẩn Bounding Box';
        }
    } else {
        // Ẩn bounding boxes
        clearBoundingBoxes();
        if (canvas) {
            canvas.style.display = 'none';
        }
        if (toggleBoundingBoxText) {
            toggleBoundingBoxText.textContent = 'Hiển thị Bounding Box';
        }
    }
}

function updateToggleButtonText() {
    const toggleBoundingBoxText = document.getElementById('toggleBoundingBoxText');
    if (toggleBoundingBoxText) {
        toggleBoundingBoxText.textContent = currentImageData.showBoundingBox 
            ? 'Ẩn Bounding Box' 
            : 'Hiển thị Bounding Box';
    }
}

// Display classification error
function displayClassificationError() {
    const resultCard = document.querySelector('.result-card');
    const errorMessage = document.getElementById('errorMessage');

    if (resultCard) {
        resultCard.style.display = 'none';
    }

    if (errorMessage) {
        errorMessage.style.display = 'block';
        errorMessage.classList.add('fade-in');
    }
}

// Retry classification function - Cho phép chọn ảnh mới
function retryClassification() {
    const resultArea = document.getElementById('resultArea');
    const uploadBox = document.getElementById('uploadBox');
    const resultCard = document.getElementById('resultCard');
    const errorMessage = document.getElementById('errorMessage');
    const previewImage = document.getElementById('previewImage');
    const imageToggleControls = document.getElementById('imageToggleControls');

    // Ẩn kết quả
    if (resultArea) {
        resultArea.style.display = 'none';
    }
    if (resultCard) {
        resultCard.style.display = 'none';
        resultCard.innerHTML = '';
    }
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    if (imageToggleControls) {
        imageToggleControls.style.display = 'none';
    }

    // Reset preview image
    if (previewImage) {
        previewImage.src = '';
    }

    // Reset upload area
    if (uploadBox) {
        uploadBox.classList.remove('dragover');
    }

    // Clear the input và trigger click để chọn ảnh mới
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.value = '';
        // Trigger click để mở dialog chọn ảnh
        setTimeout(() => {
            imageInput.click();
        }, 100);
    }
    
    // Reset image data
    currentImageData = {
        original: null,
        predictions: [],
        showBoundingBox: false,
        imageWidth: 0,
        imageHeight: 0,
        image_id: null
    };
    
    // Xóa bounding boxes
    clearBoundingBoxes();
}

// Save result to history
async function saveToHistory(result, filename) {
    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        filename: filename,
        result: result,
        saved: false
    };

    // Lưu vào localStorage (fallback)
    const history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    history.unshift(entry);
    if (history.length > 50) {
        history.splice(50);
    }
    localStorage.setItem('wasteHistory', JSON.stringify(history));

    // Lưu vào Supabase nếu đã đăng nhập
    if (window.SupabaseService) {
        try {
            await window.SupabaseService.saveClassificationHistory({
                name: result.name,
                type: result.type,
                confidence: result.confidence,
                disposal: result.disposal,
                filename: filename
            });
            console.log('✅ Đã lưu lịch sử vào Supabase');
        } catch (error) {
            console.log('Lưu vào Supabase thất bại:', error.message);
        }
    }
}

// Save result function
function saveResult() {
    const history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    if (history.length > 0) {
        history[0].saved = true;
        localStorage.setItem('wasteHistory', JSON.stringify(history));
        showAlert('Kết quả đã được lưu thành công!', 'success');
    }
}

// Share result function
function shareResult() {
    if (navigator.share) {
        navigator.share({
            title: 'Kết quả phân loại rác thải - EcoSort',
            text: 'Tôi vừa sử dụng EcoSort để phân loại rác thải!',
            url: window.location.href
        });
    } else {
        // Fallback - copy to clipboard
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            showAlert('Đã sao chép link chia sẻ!', 'success');
        });
    }
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.action-card, .guide-card, .stat-card');
    animatedElements.forEach(el => observer.observe(el));
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Update active navigation
                updateActiveNavigation(link);
            }
        });
    });
}

// Update active navigation
function updateActiveNavigation(activeLink) {
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
}

// Waste classification initialization
function initWasteClassification() {
    // Initialize tooltips for guide cards
    initGuideTooltips();

    // Initialize history filters
    initHistoryFilters();

    // Initialize pagination
    initHistoryPagination();

    // Load classification history from Supabase
    loadClassificationHistoryFromSupabase();

    // Load system statistics from Supabase
    loadSystemStatistics();
}

// Initialize history pagination
function initHistoryPagination() {
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (prevBtn) {
        prevBtn.addEventListener('click', goToPreviousPage);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', goToNextPage);
    }
}

// Initialize history filters
async function initHistoryFilters() {
    const dateFilter = document.getElementById('dateFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (dateFilter) {
        dateFilter.addEventListener('change', filterHistory);
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', filterHistory);
        
        // Load waste categories từ Supabase để populate typeFilter
        try {
            if (window.SupabaseService) {
                const categories = await window.SupabaseService.getWasteCategories();
                
                // Clear existing options except "Tất cả loại"
                typeFilter.innerHTML = '<option value="all">Tất cả loại</option>';
                
                // Add categories from Supabase
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.name;
                    option.textContent = category.name;
                    typeFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Lỗi khi load waste categories:', error);
        }
    }
}

// Display classification history from Supabase
function displayClassificationHistoryFromSupabase(history) {
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');

    if (!historyList) return;

    if (!history || history.length === 0) {
        if (emptyHistory) {
            emptyHistory.style.display = 'block';
        }
        // Clear existing items
        const existingItems = historyList.querySelectorAll('.history-item');
        existingItems.forEach(item => item.remove());
        // Ẩn pagination
        const pagination = document.getElementById('historyPagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
        // Reset pagination state
        historyPaginationState = {
            currentPage: 1,
            itemsPerPage: 5,
            totalItems: 0,
            allHistoryItems: []
        };
        return;
    }

    // Hide empty state
    if (emptyHistory) {
        emptyHistory.style.display = 'none';
    }

    // Lưu tất cả history items vào state
    historyPaginationState.allHistoryItems = history;
    historyPaginationState.totalItems = history.length;
    historyPaginationState.currentPage = 1; // Reset về trang 1 khi load mới

    // Hiển thị trang đầu tiên
    renderHistoryPage();
}

// Render history items cho trang hiện tại
function renderHistoryPage() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    // Clear existing items
    const existingItems = historyList.querySelectorAll('.history-item');
    existingItems.forEach(item => item.remove());

    const { currentPage, itemsPerPage, allHistoryItems, totalItems } = historyPaginationState;
    
    // Tính toán items cần hiển thị
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const itemsToShow = allHistoryItems.slice(startIndex, endIndex);

    // Tạo và hiển thị items
    itemsToShow.forEach((item, index) => {
        const historyItem = createHistoryItemFromSupabase(item, startIndex + index);
        historyList.appendChild(historyItem);
    });

    // Cập nhật pagination UI
    updatePaginationUI();
}

// Cập nhật UI phân trang
function updatePaginationUI() {
    const pagination = document.getElementById('historyPagination');
    const pageInfo = pagination ? pagination.querySelector('.page-info') : null;
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');

    if (!pagination) return;

    const { currentPage, itemsPerPage, totalItems } = historyPaginationState;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Hiển thị/ẩn pagination
    if (totalItems > itemsPerPage) {
        pagination.style.display = 'flex';
    } else {
        pagination.style.display = 'none';
        return;
    }

    // Cập nhật thông tin trang
    if (pageInfo) {
        pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
    }

    // Enable/disable nút Previous
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.opacity = currentPage === 1 ? '0.5' : '1';
        prevBtn.style.cursor = currentPage === 1 ? 'not-allowed' : 'pointer';
    }

    // Enable/disable nút Next
    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.opacity = currentPage === totalPages ? '0.5' : '1';
        nextBtn.style.cursor = currentPage === totalPages ? 'not-allowed' : 'pointer';
    }
}

// Chuyển đến trang trước
function goToPreviousPage() {
    if (historyPaginationState.currentPage > 1) {
        historyPaginationState.currentPage--;
        renderHistoryPage();
        // Scroll lên đầu danh sách
        const historySection = document.getElementById('history');
        if (historySection) {
            historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Chuyển đến trang sau
function goToNextPage() {
    const totalPages = Math.ceil(historyPaginationState.totalItems / historyPaginationState.itemsPerPage);
    if (historyPaginationState.currentPage < totalPages) {
        historyPaginationState.currentPage++;
        renderHistoryPage();
        // Scroll lên đầu danh sách
        const historySection = document.getElementById('history');
        if (historySection) {
            historySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// Create history item from Supabase data
function createHistoryItemFromSupabase(item, index) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    // Parse date
    const date = new Date(item.created_at || item.upload_time);
    const formattedDate = date.toLocaleDateString('vi-VN');
    const formattedTime = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    // Kiểm tra xem có phải là item từ filter theo type không
    const isFilteredByType = item.isFilteredByType || false;
    
    let primaryCategory, confidence, categoryColor, categoryIcon, guideText;
    
    if (isFilteredByType) {
        // Khi có filter theo type, mỗi item là một prediction riêng
        const prediction = item.prediction;
        primaryCategory = prediction?.waste_categories?.name || 'Không xác định';
        confidence = prediction?.confidence ? (prediction.confidence * 100).toFixed(1) : '0';
        guideText = prediction?.waste_categories?.guide_text || '';
    } else {
        // Khi không có filter, group theo image
        const categories = Array.from(item.categories || []);
        const predictions = item.predictions || [];
        confidence = predictions.length > 0
            ? (predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length * 100).toFixed(1)
            : '0';
        primaryCategory = predictions.length > 0 && predictions[0].waste_categories
            ? predictions[0].waste_categories.name
            : (categories[0] || 'Không xác định');
        guideText = predictions.length > 0 && predictions[0].waste_categories?.guide_text
            ? predictions[0].waste_categories.guide_text
            : `Phát hiện ${predictions.length} vật thể. ${categories.length > 1 ? 'Các loại: ' + categories.join(', ') : ''}`;
    }

    // Get category color and icon
    categoryColor = getCategoryColor(primaryCategory);
    categoryIcon = getCategoryIcon(primaryCategory);

    // Xác định ID để truyền vào hàm xem chi tiết
    const detailId = isFilteredByType ? item.prediction_id : item.image_id;
    const detailType = isFilteredByType ? 'prediction' : 'image';

    // Lấy ảnh từ file_path (URL Google Drive)
    const imageUrl = item.file_path || '';
    const convertedImageUrl = convertGoogleDriveUrl(imageUrl);
    const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';

    // Tạo danh sách tất cả các loại rác trong ảnh (khi không filter theo type)
    let allCategoriesHTML = '';
    if (!isFilteredByType && item.predictions && item.predictions.length > 0) {
        // Lấy danh sách unique categories từ predictions
        const uniqueCategories = new Map();
        item.predictions.forEach(pred => {
            const cat = pred.waste_categories;
            if (cat) {
                const catName = cat.name;
                if (!uniqueCategories.has(catName)) {
                    uniqueCategories.set(catName, {
                        name: catName,
                        color: getCategoryColor(catName),
                        icon: getCategoryIcon(catName),
                        count: 0
                    });
                }
                uniqueCategories.get(catName).count++;
            }
        });

        // Tạo HTML cho các loại rác
        if (uniqueCategories.size > 0) {
            allCategoriesHTML = `
                <div class="all-categories-list">
                    <div class="categories-header">
                        <i class="fas fa-tags"></i>
                        <span>Các loại rác trong ảnh (${item.predictions.length} vật thể):</span>
                    </div>
                    <div class="categories-tags">
                        ${Array.from(uniqueCategories.values()).map(cat => {
                            const countText = cat.count > 1 ? ` (${cat.count})` : '';
                            return `
                                <span class="category-tag" style="background-color: ${cat.color}20; color: ${cat.color}; border-color: ${cat.color};">
                                    <i class="${cat.icon}"></i>
                                    <span>${cat.name}${countText}</span>
                                </span>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    }

    historyItem.innerHTML = `
        <div class="history-image">
            <img src="${convertedImageUrl || placeholderSvg}" 
                 alt="Classification result" 
                 data-original-url="${imageUrl}"
                 onerror="handleImageError(this)"
                 style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 8px;">
        </div>
        <div class="history-content">
            <div class="history-header">
                <h4 class="waste-name">${primaryCategory}</h4>
                <span class="history-date">${formattedDate} ${formattedTime}</span>
            </div>
            <div class="history-details">
                <span class="waste-category" style="color: ${categoryColor};">
                    <i class="${categoryIcon}"></i>
                    ${primaryCategory}
                </span>
                <span class="confidence-score">${confidence}%</span>
            </div>
            <p class="disposal-instruction">
                ${guideText}
            </p>
            ${allCategoriesHTML}
        </div>
        <div class="history-actions">
            <button class="btn-icon" title="Xem chi tiết" onclick="viewHistoryDetailFromSupabase('${detailType}', ${detailId}, ${item.image_id})">
                <i class="fas fa-eye"></i>
            </button>
            ${item.file_path ? `<a href="${item.file_path}" target="_blank" class="btn-icon" title="Xem ảnh gốc"><i class="fas fa-external-link-alt"></i></a>` : ''}
            <button class="btn-icon danger" title="Xóa" onclick="deleteHistoryItemFromSupabase(${item.image_id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return historyItem;
}


// Create history item element
function createHistoryItem(item, index) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';

    const date = new Date(item.timestamp);
    const formattedDate = date.toLocaleDateString('vi-VN');
    const formattedTime = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    historyItem.innerHTML = `
        <div class="history-image">
            <img src="data:image/svg+xml,${encodeURIComponent(generateWasteIcon(item.result.type))}" alt="${item.result.name}">
        </div>
        <div class="history-content">
            <div class="history-header">
                <h4 class="waste-name">${item.result.name}</h4>
                <span class="history-date">${formattedDate} ${formattedTime}</span>
            </div>
            <div class="history-details">
                <span class="waste-category ${item.result.type}">
                    <i class="${item.result.icon}"></i>
                    ${getWasteTypeName(item.result.type)}
                </span>
                <span class="confidence-score">${item.result.confidence}%</span>
            </div>
            <p class="disposal-instruction">${item.result.disposal}</p>
        </div>
        <div class="history-actions">
            <button class="btn-icon" title="Xem chi tiết" onclick="viewHistoryDetail(${item.id})">
                <i class="fas fa-eye"></i>
            </button>
            <button class="btn-icon" title="Chia sẻ" onclick="shareHistoryItem(${item.id})">
                <i class="fas fa-share"></i>
            </button>
            <button class="btn-icon danger" title="Xóa" onclick="deleteHistoryItem(${item.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    return historyItem;
}

// Generate waste icon SVG
function generateWasteIcon(type) {
    const colors = {
        recyclable: '#10b981',
        organic: '#8b5cf6',
        hazardous: '#ef4444',
        general: '#6b7280'
    };

    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="${colors[type] || colors.general}" opacity="0.1"/>
        <circle cx="50" cy="50" r="30" fill="${colors[type] || colors.general}"/>
    </svg>`;
}

// Get waste type name in Vietnamese
function getWasteTypeName(type) {
    const names = {
        recyclable: 'Rác tái chế',
        organic: 'Rác hữu cơ',
        hazardous: 'Rác độc hại',
        general: 'Rác thông thường'
    };
    return names[type] || 'Không xác định';
}

// Filter history based on selected filters
async function filterHistory() {
    const dateFilter = document.getElementById('dateFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (!dateFilter || !typeFilter) return;

    const selectedDate = dateFilter.value;
    const selectedType = typeFilter.value;

    if (!window.SupabaseService) {
        console.warn('Supabase service chưa sẵn sàng');
        return;
    }

    try {
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) {
            console.log('Người dùng chưa đăng nhập');
            return;
        }

        // Lấy lịch sử từ Supabase với filters
        const filters = {
            dateFilter: selectedDate,
            typeFilter: selectedType,
            limit: 50
        };

        const history = await window.SupabaseService.getClassificationHistory(filters);
        
        // Hiển thị lịch sử đã filter
        displayClassificationHistoryFromSupabase(history);
    } catch (error) {
        console.error('Lỗi khi filter lịch sử:', error);
        showAlert('Không thể lọc lịch sử. Vui lòng thử lại.', 'error');
    }
}

// Display filtered history
function displayFilteredHistory(history) {
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');

    if (!historyList) return;

    // Clear existing items
    const existingItems = historyList.querySelectorAll('.history-item:not([style*="display: none"])');
    existingItems.forEach(item => item.remove());

    if (history.length === 0) {
        if (emptyHistory) {
            emptyHistory.style.display = 'block';
            emptyHistory.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>Không tìm thấy kết quả</h3>
                <p>Không có lịch sử phân loại nào phù hợp với bộ lọc đã chọn</p>
                <button class="btn btn-outline" onclick="clearHistoryFilters()">
                    <i class="fas fa-times"></i>
                    Xóa bộ lọc
                </button>
            `;
        }
        return;
    }

    // Hide empty state
    if (emptyHistory) {
        emptyHistory.style.display = 'none';
    }

    // Create filtered history items
    history.slice(0, 10).forEach((item, index) => {
        const historyItem = createHistoryItem(item, index);
        historyList.appendChild(historyItem);
    });
}

// Clear history filters
function clearHistoryFilters() {
    const dateFilter = document.getElementById('dateFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (dateFilter) dateFilter.value = 'all';
    if (typeFilter) typeFilter.value = 'all';

    // Reload history without filters
    loadClassificationHistoryFromSupabase();
}

// View history detail
function viewHistoryDetail(id) {
    const history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    const item = history.find(h => h.id === id);

    if (item) {
        showAlert(`Chi tiết phân loại: ${item.result.name} (${item.result.confidence}%)`, 'info');
    }
}

// Share history item
function shareHistoryItem(id) {
    const history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    const item = history.find(h => h.id === id);

    if (item) {
        const shareText = `Tôi đã phân loại ${item.result.name} với độ chính xác ${item.result.confidence}% bằng EcoSort!`;

        if (navigator.share) {
            navigator.share({
                title: 'Kết quả phân loại rác thải - EcoSort',
                text: shareText,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(`${shareText} ${window.location.href}`).then(() => {
                showAlert('Đã sao chép thông tin chia sẻ!', 'success');
            });
        }
    }
}

// Delete history item from Supabase
async function deleteHistoryItemFromSupabase(imageId) {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này khỏi lịch sử?')) {
        return;
    }

    if (!window.SupabaseService) {
        showAlert('Không thể xóa. Supabase service chưa sẵn sàng.', 'error');
        return;
    }

    try {
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) {
            showAlert('Bạn cần đăng nhập để xóa lịch sử.', 'error');
            return;
        }

        // Xóa image (cascade sẽ xóa các predictions liên quan)
        const client = window.SupabaseService.getSupabaseClient();
        const { error } = await client
            .from('images')
            .delete()
            .eq('image_id', imageId)
            .eq('user_id', session.user.id);

        if (error) throw error;

        showAlert('Đã xóa ảnh khỏi lịch sử', 'success');
        
        // Xóa item khỏi state nếu đang có
        if (historyPaginationState.allHistoryItems.length > 0) {
            historyPaginationState.allHistoryItems = historyPaginationState.allHistoryItems.filter(
                item => item.image_id !== imageId
            );
            historyPaginationState.totalItems = historyPaginationState.allHistoryItems.length;
            
            // Điều chỉnh trang hiện tại nếu cần
            const totalPages = Math.ceil(historyPaginationState.totalItems / historyPaginationState.itemsPerPage);
            if (historyPaginationState.currentPage > totalPages && totalPages > 0) {
                historyPaginationState.currentPage = totalPages;
            } else if (totalPages === 0) {
                historyPaginationState.currentPage = 1;
            }
            
            // Render lại trang hiện tại
            renderHistoryPage();
        } else {
            // Reload history nếu state rỗng
            loadClassificationHistoryFromSupabase();
        }
        
        // Đợi một chút để đảm bảo database đã cập nhật xong trước khi reload statistics
        // Điều này đảm bảo thống kê được tính lại chính xác sau khi xóa
        // Tăng delay lên 1000ms để đảm bảo Supabase đã commit transaction xóa xong
        // Và thêm retry logic để đảm bảo thống kê được cập nhật đúng
        let retryCount = 0;
        const maxRetries = 3;
        const retryDelay = 1000;
        
        const reloadStatsWithRetry = async () => {
            await loadSystemStatistics();
            
            // Verify: Kiểm tra xem số lượt phân loại có đúng không
            // Nếu vẫn chưa đúng và chưa hết retry, thử lại
            retryCount++;
            if (retryCount < maxRetries) {
                setTimeout(reloadStatsWithRetry, retryDelay);
            }
        };
        
        setTimeout(reloadStatsWithRetry, retryDelay);
    } catch (error) {
        console.error('Lỗi khi xóa lịch sử:', error);
        showAlert('Không thể xóa ảnh. Vui lòng thử lại.', 'error');
    }
}

// View history detail from Supabase
async function viewHistoryDetailFromSupabase(type, id, imageId) {
    if (!window.SupabaseService) {
        showAlert('Không thể xem chi tiết. Supabase service chưa sẵn sàng.', 'error');
        return;
    }

    try {
        const client = window.SupabaseService.getSupabaseClient();
        if (!client) throw new Error('Supabase client chưa được khởi tạo');

        let imageData, predictionData, predictionsList = [];

        // Lấy thông tin ảnh
        const { data: image, error: imageError } = await client
            .from('images')
            .select('image_id, file_path, status, upload_time, created_at')
            .eq('image_id', imageId)
            .single();

        if (imageError) throw imageError;
        if (!image) {
            showAlert('Không tìm thấy ảnh', 'error');
            return;
        }

        imageData = image;

        // file_path đã là URL Google Drive, dùng trực tiếp
        const imageUrl = image.file_path;

        if (type === 'prediction') {
            // Lấy thông tin prediction cụ thể
            const { data: prediction, error: predError } = await client
                .from('predictions')
                .select(`
                    prediction_id,
                    image_id,
                    confidence,
                    created_at,
                    bbox_x1,
                    bbox_y1,
                    bbox_x2,
                    bbox_y2,
                    waste_categories (
                        category_id,
                        name,
                        description,
                        bin_color,
                        guide_text
                    )
                `)
                .eq('prediction_id', id)
                .single();

            if (predError) throw predError;
            predictionData = prediction;
            predictionsList = [prediction];
        } else {
            // Lấy tất cả predictions của image
            const { data: predictions, error: predsError } = await client
                .from('predictions')
                .select(`
                    prediction_id,
                    image_id,
                    confidence,
                    created_at,
                    bbox_x1,
                    bbox_y1,
                    bbox_x2,
                    bbox_y2,
                    waste_categories (
                        category_id,
                        name,
                        description,
                        bin_color,
                        guide_text
                    )
                `)
                .eq('image_id', imageId)
                .order('confidence', { ascending: false });

            if (predsError) throw predsError;
            predictionsList = predictions || [];
        }

        // Hiển thị modal chi tiết
        showHistoryDetailModal(imageData, imageUrl, predictionsList, predictionData);
    } catch (error) {
        console.error('Lỗi khi xem chi tiết:', error);
        showAlert('Không thể tải thông tin chi tiết. Vui lòng thử lại.', 'error');
    }
}

// Hiển thị modal chi tiết lịch sử
function showHistoryDetailModal(imageData, imageUrl, predictionsList, selectedPrediction) {
    // Convert Google Drive URL
    const rawImageUrl = imageUrl || imageData?.file_path || '';
    const convertedImageUrl = convertGoogleDriveUrl(rawImageUrl);
    
    // Tạo modal
    const modal = document.createElement('div');
    modal.className = 'history-detail-modal';
    modal.innerHTML = `
        <div class="history-detail-container">
            <div class="history-detail-header">
                <h3>Chi tiết phân loại</h3>
                <button class="btn-icon" id="closeDetailModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="history-detail-content">
                <div class="history-detail-image">
                    <img src="${convertedImageUrl || ''}" 
                         alt="Classification image" 
                         id="detailImage" 
                         data-original-url="${rawImageUrl}"
                         onerror="handleImageError(this)"
                         style="max-width: 100%; height: auto; border-radius: var(--radius-lg); box-shadow: var(--shadow-md);">
                </div>
                <div class="history-detail-info">
                    <div class="detail-section">
                        <h4>Thông tin ảnh</h4>
                        <p><strong>Ngày upload:</strong> ${new Date(imageData.created_at).toLocaleString('vi-VN')}</p>
                        <p><strong>Số vật thể phát hiện:</strong> ${predictionsList.length}</p>
                        ${imageData.file_path ? `<p><strong>Ảnh gốc:</strong> <a href="${imageData.file_path}" target="_blank" style="color: var(--primary-color); text-decoration: none;"><i class="fas fa-external-link-alt"></i> Xem trên Google Drive</a></p>` : ''}
                    </div>
                    <div class="detail-section">
                        <h4>Kết quả phân loại</h4>
                        <div class="predictions-list" id="predictionsList">
                            ${predictionsList.map((pred, idx) => {
                                const category = pred.waste_categories;
                                const confidence = (pred.confidence * 100).toFixed(1);
                                const isSelected = selectedPrediction && selectedPrediction.prediction_id === pred.prediction_id;
                                const categoryColor = getCategoryColor(category?.name || '');
                                const categoryIcon = getCategoryIcon(category?.name || '');
                                
                                return `
                                    <div class="prediction-item ${isSelected ? 'selected' : ''}" style="border-left: 4px solid ${categoryColor};">
                                        <div class="prediction-header">
                                            <div class="prediction-category">
                                                ${createWasteCategoryIconHTML(category?.name || 'Không xác định', 50)}
                                                <span style="margin-left: 12px;"><strong>${category?.name || 'Không xác định'}</strong></span>
                                            </div>
                                            <span class="prediction-confidence" style="background-color: ${categoryColor}20; color: ${categoryColor};">
                                                ${confidence}%
                                            </span>
                                        </div>
                                        ${category?.guide_text ? `<p class="prediction-guide">${category.guide_text}</p>` : ''}
                                        ${pred.bbox_x1 !== null ? `
                                            <p class="prediction-bbox">
                                                <small>Vị trí: (${pred.bbox_x1.toFixed(0)}, ${pred.bbox_y1.toFixed(0)}) - (${pred.bbox_x2.toFixed(0)}, ${pred.bbox_y2.toFixed(0)})</small>
                                            </p>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Thêm styles nếu chưa có
    if (!document.querySelector('#history-detail-modal-styles')) {
        const styles = document.createElement('style');
        styles.id = 'history-detail-modal-styles';
        styles.textContent = `
            .history-detail-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.8);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--space-xl);
                animation: fadeIn 0.3s ease-out;
            }
            .history-detail-container {
                background-color: var(--white);
                border-radius: var(--radius-xl);
                max-width: 900px;
                max-height: 90vh;
                width: 100%;
                display: flex;
                flex-direction: column;
                box-shadow: var(--shadow-xl);
                overflow: hidden;
            }
            .history-detail-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--space-lg);
                border-bottom: 2px solid var(--gray-200);
            }
            .history-detail-header h3 {
                margin: 0;
                color: var(--gray-800);
            }
            .history-detail-content {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--space-xl);
                padding: var(--space-xl);
                overflow-y: auto;
                flex: 1;
            }
            .history-detail-image {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 200px;
            }
            .history-detail-image img {
                width: 100%;
                height: auto;
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-md);
            }
            .history-detail-image > div {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .history-detail-info {
                display: flex;
                flex-direction: column;
                gap: var(--space-lg);
            }
            .detail-section h4 {
                color: var(--gray-800);
                margin-bottom: var(--space-md);
                padding-bottom: var(--space-sm);
                border-bottom: 1px solid var(--gray-200);
            }
            .detail-section p {
                margin-bottom: var(--space-sm);
                color: var(--gray-600);
            }
            .predictions-list {
                display: flex;
                flex-direction: column;
                gap: var(--space-md);
            }
            .prediction-item {
                background-color: var(--gray-50);
                border-radius: var(--radius-md);
                padding: var(--space-md);
                transition: transform var(--transition-fast), box-shadow var(--transition-fast);
            }
            .prediction-item.selected {
                background-color: var(--gray-100);
                box-shadow: var(--shadow-md);
            }
            .prediction-item:hover {
                transform: translateX(4px);
                box-shadow: var(--shadow-sm);
            }
            .prediction-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--space-sm);
            }
            .prediction-category {
                display: flex;
                align-items: center;
                gap: var(--space-sm);
                flex: 1;
            }
            .prediction-category > div {
                flex-shrink: 0;
            }
            .prediction-confidence {
                padding: var(--space-xs) var(--space-sm);
                border-radius: var(--radius-sm);
                font-size: 0.875rem;
                font-weight: 600;
            }
            .prediction-guide {
                color: var(--gray-600);
                font-size: 0.9rem;
                margin-top: var(--space-sm);
                margin-bottom: var(--space-xs);
            }
            .prediction-bbox {
                margin-top: var(--space-xs);
                color: var(--gray-500);
            }
            @media (max-width: 768px) {
                .history-detail-content {
                    grid-template-columns: 1fr;
                }
                .history-detail-modal {
                    padding: var(--space-md);
                }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(modal);

    // Đóng modal
    const closeBtn = modal.querySelector('#closeDetailModal');
    const closeModal = () => {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Đóng bằng ESC
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Ngăn scroll body
    document.body.style.overflow = 'hidden';
}

// Load classification history from Supabase
async function loadClassificationHistoryFromSupabase() {
    if (!window.SupabaseService) {
        console.warn('Supabase service chưa sẵn sàng');
        return;
    }

    try {
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) {
            console.log('Người dùng chưa đăng nhập, không thể load lịch sử');
            return;
        }

        // Lấy lịch sử từ Supabase
        const history = await window.SupabaseService.getClassificationHistory({ limit: 50 });
        
        // Hiển thị lịch sử
        displayClassificationHistoryFromSupabase(history);
    } catch (error) {
        console.error('Lỗi khi load lịch sử phân loại:', error);
        // Fallback: hiển thị empty state
        const emptyHistory = document.getElementById('emptyHistory');
        if (emptyHistory) {
            emptyHistory.style.display = 'block';
        }
    }
}

// Load system statistics from backend API
async function loadSystemStatistics() {
    if (!window.SupabaseService) {
        console.warn('Supabase service chưa sẵn sàng');
        // Hiển thị giá trị mặc định
        updateSystemStatistics({
            userClassifications: 0,
            avgConfidence: 0,
            totalUsers: 0,
            totalPredictions: 0
        });
        return;
    }

    try {
        const session = await window.SupabaseService.getCurrentSession();
        if (!session) {
            console.log('Người dùng chưa đăng nhập, không thể load thống kê');
            // Hiển thị giá trị mặc định
            updateSystemStatistics({
                userClassifications: 0,
                avgConfidence: 0,
                totalUsers: 0,
                totalPredictions: 0
            });
            return;
        }

        // Lấy thống kê từ backend API (sử dụng service role key để bypass RLS)
        const token = session.access_token;
        const response = await fetch('http://localhost:5000/api/statistics', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const stats = await response.json();
        
        // Cập nhật UI
        updateSystemStatistics(stats);
    } catch (error) {
        console.error('Lỗi khi load thống kê hệ thống:', error);
        // Fallback: thử lấy từ Supabase trực tiếp
        try {
            if (window.SupabaseService) {
                const stats = await window.SupabaseService.getSystemStatistics();
                updateSystemStatistics(stats);
            } else {
                throw error;
            }
        } catch (fallbackError) {
            console.error('Lỗi khi load thống kê từ Supabase:', fallbackError);
            // Hiển thị giá trị mặc định khi có lỗi
            updateSystemStatistics({
                userClassifications: 0,
                avgConfidence: 0,
                totalUsers: 0,
                totalPredictions: 0
            });
        }
    }
}

// Update system statistics in UI
function updateSystemStatistics(stats) {
    const statUserClassifications = document.getElementById('statUserClassifications');
    const statAvgConfidence = document.getElementById('statAvgConfidence');
    const statTotalUsers = document.getElementById('statTotalUsers');
    const statTotalPredictions = document.getElementById('statTotalPredictions');

    if (statUserClassifications) {
        statUserClassifications.textContent = stats.userClassifications.toLocaleString('vi-VN');
    }

    if (statAvgConfidence) {
        statAvgConfidence.textContent = `${stats.avgConfidence.toFixed(1)}%`;
    }

    if (statTotalUsers) {
        statTotalUsers.textContent = stats.totalUsers.toLocaleString('vi-VN');
    }

    if (statTotalPredictions) {
        statTotalPredictions.textContent = stats.totalPredictions.toLocaleString('vi-VN');
    }
}

// Update statistics based on history
function updateStatistics(history) {
    const totalClassifications = history.length;
    const savedResults = history.filter(item => item.saved).length;

    // Update stat cards if they exist
    const statCards = document.querySelectorAll('.stat-number');
    if (statCards.length >= 1) {
        statCards[0].textContent = totalClassifications.toLocaleString();
    }
}

// Initialize guide tooltips
function initGuideTooltips() {
    const guideCards = document.querySelectorAll('.guide-card');

    guideCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px) scale(1.02)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Utility function to show alerts
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

    // Add styles if not already present
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
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(alertContainer);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertContainer.parentNode) {
            alertContainer.remove();
        }
    }, 5000);
}

// Get alert icon based on type
function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Lazy loading for images
function initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');

    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// Performance monitoring
function initPerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('web-vital' in window) {
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
            getCLS(console.log);
            getFID(console.log);
            getFCP(console.log);
            getLCP(console.log);
            getTTFB(console.log);
        });
    }
}

// Error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    // Could send to error tracking service
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // Could send to error tracking service
});

// Show user menu
function showUserMenu() {
    const menu = document.createElement('div');
    menu.className = 'user-menu-dropdown';
    menu.innerHTML = `
        <div class="user-menu-items">
            <a href="#history"><i class="fas fa-history"></i> Lịch sử của tôi</a>
            <a href="#" onclick="showMyFeedbacks()"><i class="fas fa-comment-dots"></i> My FeedBack</a>
            <a href="#" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Đăng xuất</a>
        </div>
    `;

    // Style for dropdown
    if (!document.querySelector('#user-menu-styles')) {
        const styles = document.createElement('style');
        styles.id = 'user-menu-styles';
        styles.textContent = `
            .user-menu-dropdown {
                position: absolute;
                top: 60px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 1000;
                min-width: 200px;
            }
            .user-menu-items a {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                color: #333;
                text-decoration: none;
            }
            .user-menu-items a:hover {
                background: #f3f4f6;
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(menu);

    // Close on click outside
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

// Handle logout
async function handleLogout() {
    if (!window.SupabaseService) return;

    try {
        await window.SupabaseService.signOut();
        showAlert('Đã đăng xuất thành công', 'success');

        setTimeout(() => {
            window.location.reload();
        }, 1000);
    } catch (error) {
        showAlert('Lỗi khi đăng xuất', 'error');
    }
}

// Show My Feedbacks modal
async function showMyFeedbacks() {
    if (!window.SupabaseService) {
        showAlert('Supabase service chưa sẵn sàng', 'error');
        return;
    }

    try {
        // Lấy danh sách feedbacks
        const feedbacks = await window.SupabaseService.getUserFeedbacks();
        
        // Tạo modal
        const modal = document.createElement('div');
        modal.className = 'feedbacks-modal';
        modal.innerHTML = `
            <div class="feedbacks-modal-container">
                <div class="feedbacks-modal-header">
                    <h2><i class="fas fa-comment-dots"></i> My FeedBack</h2>
                    <button class="btn-icon" id="closeFeedbacksModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="feedbacks-modal-content">
                    <div class="feedbacks-tabs">
                        <button class="tab-btn active" data-tab="list">
                            <i class="fas fa-list"></i> Danh sách Feedbacks
                        </button>
                        <button class="tab-btn" data-tab="new">
                            <i class="fas fa-plus"></i> Tạo Feedback Mới
                        </button>
                    </div>
                    
                    <!-- Tab: Danh sách Feedbacks -->
                    <div class="tab-content active" id="feedbacksListTab">
                        <div class="feedbacks-list-container">
                            ${feedbacks.length === 0 ? `
                                <div class="empty-state">
                                    <i class="fas fa-comment-slash"></i>
                                    <p>Bạn chưa có feedback nào</p>
                                </div>
                            ` : `
                                <div class="feedbacks-list">
                                    ${feedbacks.map(feedback => {
                                        const feedbackDate = new Date(feedback.created_at).toLocaleString('vi-VN');
                                        const rawImageUrl = feedback.images?.file_path || '';
                                        const imageUrl = convertGoogleDriveUrl(rawImageUrl);
                                        const correctedCategory = feedback.waste_categories;
                                        const categoryColor = correctedCategory ? getCategoryColor(correctedCategory.name) : '';
                                        
                                        return `
                                            <div class="feedback-item-card">
                                                <div class="feedback-item-image">
                                                    
                                                    <img src="${imageUrl}" 
                                                         alt="Feedback image" 
                                                         data-original-url="${rawImageUrl}"
                                                         onerror="handleImageError(this)"
                                                         loading="lazy"
                                                         style="width: 100%; height: 100%; object-fit: cover;">
                                                </div>
                                                <div class="feedback-item-content">
                                                    <div class="feedback-item-header">
                                                        <span class="feedback-date">
                                                            <i class="fas fa-clock"></i> ${feedbackDate}
                                                        </span>
                                                    </div>
                                                    ${feedback.comment ? `
                                                        <div class="feedback-comment">
                                                            <i class="fas fa-comment"></i>
                                                            <p>${feedback.comment}</p>
                                                        </div>
                                                    ` : ''}
                                                    ${correctedCategory ? `
                                                        <div class="feedback-category">
                                                            <i class="fas fa-check-circle"></i>
                                                            <span>Loại rác đúng: <strong style="color: ${categoryColor};">${correctedCategory.name}</strong></span>
                                                            ${createWasteCategoryIconHTML(correctedCategory.name, 24)}
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                    
                    <!-- Tab: Tạo Feedback Mới -->
                    <div class="tab-content" id="newFeedbackTab">
                        <form id="newFeedbackForm" class="new-feedback-form">
                            <div class="form-group">
                                <label for="feedbackImageSelect">Chọn ảnh:</label>
                                <select id="feedbackImageSelect" required>
                                    <option value="">-- Chọn ảnh --</option>
                                </select>
                                <div id="selectedImagePreview" class="image-preview" style="display: none;">
                                    <img id="previewImage" 
                                         src="" 
                                         alt="Preview"
                                         data-original-url=""
                                         onerror="handleImageError(this)"
                                         style="max-width: 100%; max-height: 300px; border-radius: var(--radius-md); object-fit: contain;">
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="newFeedbackComment">Nhận xét (tùy chọn):</label>
                                <textarea id="newFeedbackComment" rows="3" placeholder="Nhập nhận xét của bạn..."></textarea>
                            </div>
                            <div class="form-group">
                                <label>Loại rác đúng (có thể chọn nhiều):</label>
                                <div id="newFeedbackCategoriesList" class="categories-checkbox-list">
                                    <div class="loading-categories">Đang tải danh sách loại rác...</div>
                                </div>
                                <small class="form-hint">Chọn các loại rác đúng nếu kết quả phân loại không đúng</small>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-paper-plane"></i> Gửi Feedback
                                </button>
                                <button type="button" class="btn btn-outline" id="cancelNewFeedbackBtn">
                                    <i class="fas fa-times"></i> Hủy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load images và categories cho form mới
        await loadImagesForNewFeedback();
        await loadWasteCategoriesForNewFeedback();
        
        // Tab switching
        const tabBtns = modal.querySelectorAll('.tab-btn');
        const tabContents = modal.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                // Update active states
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                if (tabName === 'list') {
                    document.getElementById('feedbacksListTab').classList.add('active');
                } else {
                    document.getElementById('newFeedbackTab').classList.add('active');
                }
            });
        });
        
        // Image select change
        const imageSelect = document.getElementById('feedbackImageSelect');
        imageSelect.addEventListener('change', (e) => {
            const selectedImageId = e.target.value;
            const preview = document.getElementById('selectedImagePreview');
            const previewImg = document.getElementById('previewImage');
            
            if (selectedImageId) {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const rawImageUrl = selectedOption.dataset.imageUrl;
                
                if (rawImageUrl && rawImageUrl.trim() !== '') {
                    // Remove error handler cũ để tránh conflict
                    previewImg.onerror = null;
                    previewImg.onload = null;
                    
                    // Convert URL
                    const convertedUrl = convertGoogleDriveUrl(rawImageUrl);
                    
                    // Debug log
                    console.log('Loading image:', {
                        original: rawImageUrl,
                        converted: convertedUrl
                    });
                    
                    // Set original URL - dùng cả attribute và property để đảm bảo
                    previewImg.setAttribute('data-original-url', rawImageUrl);
                    previewImg.dataset.originalUrl = rawImageUrl;
                    
                    // Lưu URL vào closure để đảm bảo luôn có sẵn
                    const savedOriginalUrl = rawImageUrl;
                    
                    // Set onload handler để clear error handler khi thành công
                    previewImg.onload = function() {
                        console.log('Image loaded successfully');
                        this.onerror = null;
                        this.onload = null;
                    };
                    
                    // Set error handler với URL được lưu trong closure
                    previewImg.onerror = function() { 
                        console.warn('Image failed to load, trying alternative formats');
                        // Đảm bảo original URL được set trước khi gọi handleImageError
                        if (!this.getAttribute('data-original-url')) {
                            this.setAttribute('data-original-url', savedOriginalUrl);
                            this.dataset.originalUrl = savedOriginalUrl;
                        }
                        handleImageError(this); 
                    };
                    
                    // Đợi một chút để đảm bảo attribute được set
                    setTimeout(() => {
                        // Set src sau cùng
                        previewImg.src = convertedUrl;
                    }, 10);
                    
                    // Hiển thị preview
                    preview.style.display = 'block';
                } else {
                    // Nếu không có URL, ẩn preview
                    console.warn('No image URL found for selected image');
                    if (preview) preview.style.display = 'none';
                }
            } else {
                if (preview) preview.style.display = 'none';
            }
        });
        
        // Form submission
        const newFeedbackForm = document.getElementById('newFeedbackForm');
        newFeedbackForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await submitNewFeedback();
        });
        
        // Cancel button
        const cancelBtn = document.getElementById('cancelNewFeedbackBtn');
        cancelBtn.addEventListener('click', () => {
            newFeedbackForm.reset();
            document.getElementById('selectedImagePreview').style.display = 'none';
            document.querySelectorAll('input[name="newFeedbackCategory"]').forEach(cb => {
                cb.checked = false;
            });
        });
        
        // Close modal
        const closeBtn = document.getElementById('closeFeedbacksModal');
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Close on ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
    } catch (error) {
        console.error('Lỗi khi load feedbacks:', error);
        showAlert('Không thể tải danh sách feedbacks. Vui lòng thử lại.', 'error');
    }
}

// Load images cho form tạo feedback mới
async function loadImagesForNewFeedback() {
    if (!window.SupabaseService) return;

    try {
        const images = await window.SupabaseService.getUserImages();
        const select = document.getElementById('feedbackImageSelect');
        
        if (!select) return;

        // Clear existing options except first one
        select.innerHTML = '<option value="">-- Chọn ảnh --</option>';
        
        if (!images || images.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Không có ảnh nào';
            option.disabled = true;
            select.appendChild(option);
            return;
        }
        
        // Add images
        images.forEach(image => {
            const option = document.createElement('option');
            option.value = image.image_id;
            option.dataset.imageUrl = image.file_path;
            const date = new Date(image.created_at).toLocaleDateString('vi-VN');
            option.textContent = `Ảnh ${image.image_id} - ${date}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Lỗi khi load images cho feedback mới:', error);
    }
}

// Load waste categories cho form tạo feedback mới
async function loadWasteCategoriesForNewFeedback() {
    if (!window.SupabaseService) return;

    try {
        const categories = await window.SupabaseService.getWasteCategories();
        const categoriesList = document.getElementById('newFeedbackCategoriesList');
        
        if (!categoriesList) return;

        // Clear loading message
        categoriesList.innerHTML = '';
        
        if (!categories || categories.length === 0) {
            categoriesList.innerHTML = '<p class="no-categories">Không có loại rác nào</p>';
            return;
        }

        // Tạo checkbox list
        categories.forEach(category => {
            const categoryColor = getCategoryColor(category.name);
            const categoryIcon = getCategoryIcon(category.name);
            
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'category-checkbox-item';
            checkboxItem.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" 
                           name="newFeedbackCategory" 
                           value="${category.category_id}" 
                           class="category-checkbox">
                    <span class="checkbox-custom" style="border-color: ${categoryColor};">
                        <i class="fas fa-check" style="color: ${categoryColor};"></i>
                    </span>
                    <span class="checkbox-content">
                        <i class="${categoryIcon}" style="color: ${categoryColor};"></i>
                        <span class="category-name">${category.name}</span>
                    </span>
                </label>
            `;
            categoriesList.appendChild(checkboxItem);
        });
    } catch (error) {
        console.error('Lỗi khi load waste categories cho feedback mới:', error);
        const categoriesList = document.getElementById('newFeedbackCategoriesList');
        if (categoriesList) {
            categoriesList.innerHTML = '<p class="error-message">Không thể tải danh sách loại rác</p>';
        }
    }
}

// Submit new feedback
async function submitNewFeedback() {
    if (!window.SupabaseService) {
        showAlert('Không thể gửi feedback. Supabase service chưa sẵn sàng.', 'error');
        return;
    }

    const imageId = document.getElementById('feedbackImageSelect')?.value;
    if (!imageId) {
        showAlert('Vui lòng chọn ảnh.', 'warning');
        return;
    }

    const comment = document.getElementById('newFeedbackComment')?.value.trim() || null;
    
    // Lấy tất cả các checkbox đã chọn
    const checkedBoxes = document.querySelectorAll('input[name="newFeedbackCategory"]:checked');
    const correctedCategoryIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));

    // Kiểm tra nếu không có comment và không có corrected category nào được chọn
    if (!comment && correctedCategoryIds.length === 0) {
        showAlert('Vui lòng nhập nhận xét hoặc chọn ít nhất một loại rác đúng.', 'warning');
        return;
    }

    try {
        // Tạo nhiều feedback records
        const feedbackPromises = [];

        if (comment && correctedCategoryIds.length > 0) {
            // Nếu có cả comment và categories: tạo một record với comment cho category đầu tiên, các record còn lại không có comment
            correctedCategoryIds.forEach((categoryId, index) => {
                feedbackPromises.push(
                    window.SupabaseService.submitFeedback({
                        imageId: parseInt(imageId),
                        comment: index === 0 ? comment : null,
                        correctedCategoryId: categoryId
                    })
                );
            });
        } else if (comment && correctedCategoryIds.length === 0) {
            // Chỉ có comment, không có category
            feedbackPromises.push(
                window.SupabaseService.submitFeedback({
                    imageId: parseInt(imageId),
                    comment: comment,
                    correctedCategoryId: null
                })
            );
        } else if (correctedCategoryIds.length > 0) {
            // Chỉ có categories, không có comment
            correctedCategoryIds.forEach(categoryId => {
                feedbackPromises.push(
                    window.SupabaseService.submitFeedback({
                        imageId: parseInt(imageId),
                        comment: null,
                        correctedCategoryId: categoryId
                    })
                );
            });
        }

        // Gửi tất cả feedbacks
        await Promise.all(feedbackPromises);
        
        const categoryCount = correctedCategoryIds.length;
        const message = categoryCount > 0 
            ? `Đã gửi feedback thành công! Đã ghi nhận ${categoryCount} loại rác đúng${comment ? ' và nhận xét của bạn' : ''}.`
            : 'Đã gửi feedback thành công!';
        
        showAlert(message, 'success');
        
        // Reset form
        const newFeedbackForm = document.getElementById('newFeedbackForm');
        if (newFeedbackForm) {
            newFeedbackForm.reset();
            document.getElementById('selectedImagePreview').style.display = 'none';
            document.querySelectorAll('input[name="newFeedbackCategory"]').forEach(cb => {
                cb.checked = false;
            });
        }
        
        // Reload feedbacks list
        const modal = document.querySelector('.feedbacks-modal');
        if (modal) {
            modal.remove();
            showMyFeedbacks();
        }
    } catch (error) {
        console.error('Lỗi khi gửi feedback:', error);
        showAlert('Không thể gửi feedback. Vui lòng thử lại.', 'error');
    }
}

// Export showMyFeedbacks for global use
window.showMyFeedbacks = showMyFeedbacks;

// Export image error handler for inline use
window.handleImageError = handleImageError;

// Export functions for global use
window.EcoSort = {
    showAlert,
    saveResult,
    shareResult,
    handleImageUpload,
    activateCamera
};

window.handleLogout = handleLogout;