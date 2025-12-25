// Убрали импорт из main.js для предотвращения Circular Dependency
export function initInventory() {
    const state = window.state; // Используем глобальный state
    const container = document.querySelector('#scene-inventory .inventory-items');
    
    if (!container) {
        console.warn("[Inventory] Container .inventory-items not found");
        return;
    }

    // Список предметов. 
    // В будущем: const items = state.user.inventory;
    const items = [
        { 
            id: 'magnet', 
            name: 'Магнит', 
            level: 1, 
            icon: '🧲', 
            description: 'Притягивает ближайшие монеты',
            status: 'active' 
        },
        { 
            id: 'shield', 
            name: 'Щит', 
            level: 0, 
            icon: '🛡️', 
            description: 'Защита от одного столкновения',
            status: 'locked' 
        }
    ];

    if (!items || items.length === 0) {
        container.innerHTML = '<p class="empty-text">Твой инвентарь пока пуст. Загляни в магазин!</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="inventory-card ${item.status}">
            <div class="item-icon-wrapper">
                <span class="item-icon">${item.icon}</span>
                ${item.status === 'locked' ? '<div class="lock-overlay">🔒</div>' : ''}
            </div>
            <div class="item-info">
                <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-level">${item.status === 'locked' ? '' : 'Ур. ' + item.level}</span>
                </div>
                <p class="item-desc">${item.description}</p>
            </div>
            <div class="item-actions">
                ${item.status === 'active' 
                    ? '<button class="use-btn" disabled>Включено</button>' 
                    : '<button class="unlock-btn" onclick="showRoom(\'shop\')">В магазин</button>'}
            </div>
        </div>
    `).join('');

    // Добавляем обработку кликов (опционально)
    container.querySelectorAll('.unlock-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (window.showRoom) window.showRoom('shop');
        };
    });
}