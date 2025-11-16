async function loadWasteGuide() {
  const container = document.getElementById('wasteGuideGrid');
  container.innerHTML = '<p>⏳ Đang tải dữ liệu hướng dẫn...</p>';

  try {
    // Lấy dữ liệu từ Supabase
    const data = await window.SupabaseService.getWasteCategories();

    if (!data || data.length === 0) {
      container.innerHTML = '<p>Không có dữ liệu hướng dẫn.</p>';
      return;
    }

    container.innerHTML = '';

    // 🔹 Map ánh xạ theo category_id (ổn định hơn theo name)
    const categoryMap = {
      1: { icon: 'fa-prescription-bottle', color: '#0984e3' }, // Nhựa
      2: { icon: 'fa-scroll', color: '#e3e309ff' },        // Giấy
      3: { icon: 'fa-cog', color: '#636e72' },           // Kim loại
      4: { icon: 'fa-wine-bottle', color: '#fd3131ff' },   // Thủy tinh
      5: { icon: 'fa-leaf', color: '#27ae60' }           // Hữu cơ
    };

    // Duyệt qua từng loại rác và hiển thị
    data.forEach(item => {
      const { category_id, name, description, guide_text, bin_color } = item;

      const card = document.createElement('div');
      card.classList.add('guide-card');

      const iconInfo = categoryMap[category_id] || { icon: 'fa-recycle', color: '#555' };

      // tô màu nền và viền bên trái
      card.style.backgroundColor = iconInfo.color + '20'; // thêm alpha để làm nhạt màu (ví dụ #00b89420)
      card.style.borderLeft = `6px solid ${iconInfo.color}`;
      card.style.borderTop = `6px solid ${iconInfo.color}`;
      const guideLines = guide_text
        ? guide_text.split('\n').map(line => `<li>${line}</li>`).join('')
        : '<li>Chưa có hướng dẫn cụ thể</li>';

      card.innerHTML = `
        <div class="guide-icon" style="color:${iconInfo.color}">
          <i class="fa-solid ${iconInfo.icon}"></i>
        </div>
        <h3>${name}</h3>
        <p class="guide-description">${description || ''}</p>
        <ul>${guideLines}</ul>
        <div class="bin-color">🗑️ ${bin_color || 'Chưa xác định màu thùng'}</div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu hướng dẫn:', error);
    container.innerHTML = `<p style="color:red;">Không thể tải dữ liệu từ Supabase.</p>`;
  }
}

// Gọi khi trang load
document.addEventListener('DOMContentLoaded', loadWasteGuide);
