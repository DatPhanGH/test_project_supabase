// Admin Panel JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin components
    initAdminNavigation();
    initAdminCharts();
    initAdminTables();
    initAdminFilters();
    
    console.log('Admin panel initialized');
});

// Admin Navigation
function initAdminNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const contentWrappers = document.querySelectorAll('.content-wrapper');
    const pageTitle = document.querySelector('.page-title');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    // Navigation handling
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            link.parentElement.classList.add('active');
            
            // Show corresponding content
            const targetId = link.getAttribute('href').substring(1);
            
            contentWrappers.forEach(wrapper => {
                wrapper.style.display = 'none';
            });
            
            const targetWrapper = document.getElementById(targetId);
            if (targetWrapper) {
                targetWrapper.style.display = 'block';
            }
            
            // Update page title
            const linkText = link.querySelector('span').textContent;
            if (pageTitle) {
                pageTitle.textContent = linkText;
            }
        });
    });
    
    // Sidebar toggle for mobile
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

// Initialize Admin Charts
function initAdminCharts() {
    // Classifications over time chart
    const classificationsCtx = document.getElementById('classificationsChart');
    if (classificationsCtx) {
        new Chart(classificationsCtx, {
            type: 'line',
            data: {
                labels: ['1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10'],
                datasets: [{
                    label: 'Lượt phân loại',
                    data: [120, 135, 148, 162, 155, 180, 195],
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f3f4f6'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Waste types distribution chart
    const wasteTypesCtx = document.getElementById('wasteTypesChart');
    if (wasteTypesCtx) {
        new Chart(wasteTypesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Rác tái chế', 'Rác hữu cơ', 'Rác độc hại', 'Rác thông thường'],
                datasets: [{
                    data: [45, 25, 15, 15],
                    backgroundColor: ['#10b981', '#8b5cf6', '#ef4444', '#6b7280'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
}

// Initialize Admin Tables
function initAdminTables() {
    // Add sorting functionality to tables
    const tables = document.querySelectorAll('.data-table');
    tables.forEach(table => {
        const headers = table.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                sortTable(table, index);
            });
        });
    });
}

// Sort table function
function sortTable(table, columnIndex) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    
    const isAscending = table.dataset.sortOrder !== 'asc';
    table.dataset.sortOrder = isAscending ? 'asc' : 'desc';
    
    rows.sort((a, b) => {
        const aText = a.cells[columnIndex].textContent.trim();
        const bText = b.cells[columnIndex].textContent.trim();
        
        if (isAscending) {
            return aText.localeCompare(bText);
        } else {
            return bText.localeCompare(aText);
        }
    });
    
    rows.forEach(row => tbody.appendChild(row));
    
    // Update sort indicators
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
        header.classList.remove('sort-asc', 'sort-desc');
        if (index === columnIndex) {
            header.classList.add(isAscending ? 'sort-asc' : 'sort-desc');
        }
    });
}

// Initialize Admin Filters
function initAdminFilters() {
    // User management filters
    const userSearch = document.querySelector('#users .search-filter input');
    if (userSearch) {
        userSearch.addEventListener('input', filterUsers);
    }
    
    // History management filters
    const historySearch = document.getElementById('historySearch');
    const historyDateFilter = document.getElementById('historyDateFilter');
    const historyTypeFilter = document.getElementById('historyTypeFilter');
    const historyStatusFilter = document.getElementById('historyStatusFilter');
    
    if (historySearch) {
        historySearch.addEventListener('input', filterHistory);
    }
    if (historyDateFilter) {
        historyDateFilter.addEventListener('change', filterHistory);
    }
    if (historyTypeFilter) {
        historyTypeFilter.addEventListener('change', filterHistory);
    }
    if (historyStatusFilter) {
        historyStatusFilter.addEventListener('change', filterHistory);
    }
}

// Filter users function
function filterUsers() {
    const searchTerm = event.target.value.toLowerCase();
    const rows = document.querySelectorAll('#users tbody tr');
    
    rows.forEach(row => {
        const userName = row.querySelector('.user-info span').textContent.toLowerCase();
        const userEmail = row.cells[2].textContent.toLowerCase();
        
        if (userName.includes(searchTerm) || userEmail.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter history function
function filterHistory() {
    const searchTerm = document.getElementById('historySearch')?.value.toLowerCase() || '';
    const dateFilter = document.getElementById('historyDateFilter')?.value || 'all';
    const typeFilter = document.getElementById('historyTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('historyStatusFilter')?.value || 'all';
    
    const rows = document.querySelectorAll('#classification-history tbody tr');
    
    rows.forEach(row => {
        const userName = row.querySelector('.user-info span').textContent.toLowerCase();
        const wasteType = row.querySelector('.waste-type').textContent.toLowerCase();
        const status = row.querySelector('.status').textContent.toLowerCase();
        
        let showRow = true;
        
        // Search filter
        if (searchTerm && !userName.includes(searchTerm)) {
            showRow = false;
        }
        
        // Type filter
        if (typeFilter !== 'all') {
            const wasteTypeElement = row.querySelector('.waste-type');
            if (!wasteTypeElement.classList.contains(typeFilter)) {
                showRow = false;
            }
        }
        
        // Status filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'success' && !status.includes('thành công')) {
                showRow = false;
            }
            if (statusFilter === 'failed' && !status.includes('thất bại')) {
                showRow = false;
            }
        }
        
        row.style.display = showRow ? '' : 'none';
    });
}

// User Management Functions
function viewUser(userId) {
    showAlert(`Xem chi tiết người dùng ID: ${userId}`, 'info');
}

function editUser(userId) {
    showAlert(`Chỉnh sửa người dùng ID: ${userId}`, 'info');
}

function lockUser(userId) {
    if (confirm('Bạn có chắc chắn muốn khóa tài khoản này?')) {
        showAlert(`Đã khóa tài khoản người dùng ID: ${userId}`, 'success');
    }
}

// Waste Type Management Functions
function showAddWasteTypeModal() {
    showAlert('Chức năng thêm loại rác mới đang được phát triển', 'info');
}

function editWasteType(type) {
    showAlert(`Chỉnh sửa loại rác: ${type}`, 'info');
}

function viewWasteTypeDetails(type) {
    showAlert(`Xem chi tiết loại rác: ${type}`, 'info');
}

function deleteWasteType(type) {
    if (confirm(`Bạn có chắc chắn muốn xóa loại rác "${type}"?`)) {
        showAlert(`Đã xóa loại rác: ${type}`, 'success');
    }
}

// History Management Functions
function viewHistoryDetail(historyId) {
    showAlert(`Xem chi tiết lịch sử ID: ${historyId}`, 'info');
}

function deleteHistoryRecord(historyId) {
    if (confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
        // Remove the row from table
        const row = document.querySelector(`tr:has(td:first-child:contains('#${historyId}'))`);
        if (row) {
            row.remove();
        }
        showAlert(`Đã xóa bản ghi lịch sử ID: ${historyId}`, 'success');
    }
}

function exportHistory() {
    showAlert('Đang xuất báo cáo lịch sử...', 'info');
    // Simulate export process
    setTimeout(() => {
        showAlert('Báo cáo đã được xuất thành công!', 'success');
    }, 2000);
}

function clearOldHistory() {
    if (confirm('Bạn có chắc chắn muốn xóa dữ liệu lịch sử cũ (> 3 tháng)?')) {
        showAlert('Đã xóa dữ liệu lịch sử cũ', 'success');
    }
}

// Statistics Update Functions
function updateDashboardStats() {
    // Simulate real-time stats update
    const stats = {
        totalUsers: Math.floor(Math.random() * 100) + 1200,
        totalClassifications: Math.floor(Math.random() * 1000) + 15000,
        accuracyRate: (Math.random() * 5 + 92).toFixed(1),
        totalWaste: (Math.random() * 2 + 8).toFixed(1)
    };
    
    // Update stat cards
    const statCards = document.querySelectorAll('.stat-content h3');
    if (statCards[0]) statCards[0].textContent = stats.totalUsers.toLocaleString();
    if (statCards[1]) statCards[1].textContent = stats.totalClassifications.toLocaleString();
    if (statCards[2]) statCards[2].textContent = stats.accuracyRate + '%';
    if (statCards[3]) statCards[3].textContent = stats.totalWaste + 'T';
}

// Utility function for admin alerts
function showAlert(message, type = 'info') {
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
    
    // Add styles for admin alerts
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

// Auto-update dashboard stats every 30 seconds
setInterval(updateDashboardStats, 30000);

// Export admin functions for global use
window.AdminPanel = {
    viewUser,
    editUser,
    lockUser,
    showAddWasteTypeModal,
    editWasteType,
    viewWasteTypeDetails,
    deleteWasteType,
    viewHistoryDetail,
    deleteHistoryRecord,
    exportHistory,
    clearOldHistory,
    showAlert
};