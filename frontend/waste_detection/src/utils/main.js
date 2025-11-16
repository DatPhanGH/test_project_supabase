// Main JavaScript file for EcoSort website

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initMobileMenu();
    initImageUpload();
    initScrollAnimations();
    initSmoothScrolling();
    initWasteClassification();
    
    console.log('EcoSort website initialized');
});

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (mobileToggle && nav) {
        mobileToggle.addEventListener('click', function() {
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
}

// Handle image upload and display
function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
        showAlert('Vui lòng chọn file hình ảnh hợp lệ', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showAlert('Kích thước file không được vượt quá 10MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImage = document.getElementById('previewImage');
        const resultArea = document.getElementById('resultArea');
        
        if (previewImage && resultArea) {
            previewImage.src = e.target.result;
            resultArea.style.display = 'block';
            
            // Simulate classification
            setTimeout(() => {
                classifyWaste(file);
            }, 1500);
        }
    };
    reader.readAsDataURL(file);
}

// Camera activation
function activateCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                // Create camera interface
                createCameraInterface(stream);
            })
            .catch(function(error) {
                console.error('Camera access denied:', error);
                showAlert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.', 'error');
            });
    } else {
        showAlert('Trình duyệt không hỗ trợ camera', 'error');
    }
}

// Create camera interface
function createCameraInterface(stream) {
    // Create modal for camera
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
        <div class="camera-container">
            <video id="cameraVideo" autoplay muted></video>
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
    
    video.srcObject = stream;
    
    captureBtn.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
            handleImageUpload(blob);
            closeCameraModal();
        });
    });
    
    closeBtn.addEventListener('click', closeCameraModal);
    
    function closeCameraModal() {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
    }
}

// Waste classification simulation
function classifyWaste(file) {
    // Simulate API call delay
    const loadingOverlay = createLoadingOverlay();
    
    // Mock classification results
    const wasteTypes = [
        {
            name: 'Chai nhựa',
            icon: 'fas fa-bottle-water',
            confidence: 95,
            type: 'recyclable',
            disposal: 'Rác tái chế - Vui lòng rửa sạch và bỏ vào thùng rác màu xanh lá',
            color: '#10b981'
        },
        {
            name: 'Giấy báo',
            icon: 'fas fa-newspaper',
            confidence: 88,
            type: 'recyclable',
            disposal: 'Rác tái chế - Bỏ vào thùng rác màu xanh lá',
            color: '#10b981'
        },
        {
            name: 'Vỏ chuối',
            icon: 'fas fa-leaf',
            confidence: 92,
            type: 'organic',
            disposal: 'Rác hữu cơ - Bỏ vào thùng rác màu nâu để ủ phân',
            color: '#8b5cf6'
        },
        {
            name: 'Pin cũ',
            icon: 'fas fa-battery-half',
            confidence: 97,
            type: 'hazardous',
            disposal: 'Rác độc hại - Bỏ vào thùng rác màu đỏ hoặc điểm thu gom chuyên biệt',
            color: '#ef4444'
        }
    ];
    
    // Simulate random success/failure (15% failure rate as per requirements)
    const isSuccess = Math.random() > 0.15;
    
    setTimeout(() => {
        removeLoadingOverlay(loadingOverlay);
        
        if (isSuccess) {
            // Random classification result
            const result = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
            displayClassificationResult(result);
            
            // Save to history (localStorage for demo)
            saveToHistory(result, file.name || 'camera-image.jpg');
        } else {
            // Show error message for unrecognized waste
            displayClassificationError();
        }
    }, 2000);
}

// Create loading overlay
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
function displayClassificationResult(result) {
    const resultCard = document.querySelector('.result-card');
    const errorMessage = document.getElementById('errorMessage');
    
    if (!resultCard) return;
    
    // Hide error message and show result
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
    resultCard.style.display = 'block';
    
    resultCard.innerHTML = `
        <div class="waste-type">
            <i class="${result.icon}" style="color: ${result.color}"></i>
            <span class="type-name">${result.name}</span>
            <span class="confidence">${result.confidence}%</span>
        </div>
        <div class="disposal-info">
            <h4>Hướng dẫn xử lý:</h4>
            <p>${result.disposal}</p>
        </div>
    `;
    
    // Add animation
    resultCard.classList.add('fade-in');
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

// Retry classification function
function retryClassification() {
    const resultArea = document.getElementById('resultArea');
    const uploadBox = document.getElementById('uploadBox');
    
    if (resultArea) {
        resultArea.style.display = 'none';
    }
    
    // Reset upload area
    if (uploadBox) {
        uploadBox.classList.remove('dragover');
    }
    
    // Clear the input
    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
        imageInput.value = '';
    }
}

// Save result to history
function saveToHistory(result, filename) {
    const history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    const entry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        filename: filename,
        result: result,
        saved: false
    };
    
    history.unshift(entry);
    // Keep only last 50 entries
    if (history.length > 50) {
        history.splice(50);
    }
    
    localStorage.setItem('wasteHistory', JSON.stringify(history));
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
    // Load classification history on page load
    loadClassificationHistory();
    
    // Initialize tooltips for guide cards
    initGuideTooltips();
    
    // Initialize history filters
    initHistoryFilters();
    
    // Load and display history
    displayClassificationHistory();
}

// Initialize history filters
function initHistoryFilters() {
    const dateFilter = document.getElementById('dateFilter');
    const typeFilter = document.getElementById('typeFilter');
    
    if (dateFilter) {
        dateFilter.addEventListener('change', filterHistory);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', filterHistory);
    }
}

// Display classification history
function displayClassificationHistory() {
    const history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');
    
    if (!historyList) return;
    
    if (history.length === 0) {
        if (emptyHistory) {
            emptyHistory.style.display = 'block';
        }
        return;
    }
    
    // Hide empty state
    if (emptyHistory) {
        emptyHistory.style.display = 'none';
    }
    
    // Clear existing items except empty state and template
    const existingItems = historyList.querySelectorAll('.history-item:not([style*="display: none"])');
    existingItems.forEach(item => item.remove());
    
    // Create history items
    history.slice(0, 10).forEach((item, index) => {
        const historyItem = createHistoryItem(item, index);
        historyList.appendChild(historyItem);
    });
    
    // Show pagination if needed
    const pagination = document.getElementById('historyPagination');
    if (pagination && history.length > 10) {
        pagination.style.display = 'flex';
    }
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
function filterHistory() {
    const dateFilter = document.getElementById('dateFilter');
    const typeFilter = document.getElementById('typeFilter');
    
    if (!dateFilter || !typeFilter) return;
    
    const selectedDate = dateFilter.value;
    const selectedType = typeFilter.value;
    
    let history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    
    // Filter by date
    if (selectedDate !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (selectedDate) {
            case 'today':
                filterDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                filterDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                filterDate.setMonth(now.getMonth() - 1);
                break;
        }
        
        history = history.filter(item => new Date(item.timestamp) >= filterDate);
    }
    
    // Filter by type
    if (selectedType !== 'all') {
        history = history.filter(item => item.result.type === selectedType);
    }
    
    // Update display
    displayFilteredHistory(history);
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
    
    displayClassificationHistory();
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

// Delete history item
function deleteHistoryItem(id) {
    if (confirm('Bạn có chắc chắn muốn xóa mục này khỏi lịch sử?')) {
        let history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
        history = history.filter(item => item.id !== id);
        localStorage.setItem('wasteHistory', JSON.stringify(history));
        
        displayClassificationHistory();
        updateStatistics(history);
        showAlert('Đã xóa mục khỏi lịch sử', 'success');
    }
}

// Load classification history
function loadClassificationHistory() {
    const history = JSON.parse(localStorage.getItem('wasteHistory') || '[]');
    
    // Update statistics
    updateStatistics(history);
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

// Export functions for global use
window.EcoSort = {
    showAlert,
    saveResult,
    shareResult,
    handleImageUpload,
    activateCamera
};