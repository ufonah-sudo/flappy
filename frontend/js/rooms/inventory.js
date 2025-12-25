import * as api from '../../api.js';

export function initInventory() {
    const state = window.state; 
    const container = document.querySelector('#scene-inventory .inventory-items');
    
    if (!container) {
        console.warn("[Inventory] Container .inventory-items not found");
        return;
    }

    // Список предметов (заглушка, пока не подтянем из БД)
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
        <div class="inventory-card ${item.status === 'locked' ? 'locked' : ''}">
            <div class="item-icon-wrapper">
                <span class="item-icon">${item.icon}</span>
                ${item.status === 'locked' ? '<div class="lock-overlay" style="position:absolute; font-size:12px;">🔒</div>' : ''}
            </div>
            <div class="item-info" style="flex-grow: 1; text-align: left; padding-left: 10px;">
                <div class="item-header" style="display: flex; justify-content: space-between;">
                    <span class="item-name" style="font-weight: bold;">${item.name}</span>
                    <span class="item-level" style="color: #f7d51d; font-size: 12px;">
                        ${item.status === 'locked' ? '' : 'Ур. ' + item.level}
                    </span>
                </div>
                <p class="item-desc" style="margin: 5px 0 0 0; font-size: 11px; color: #ccc;">${item.description}</p>
            </div>
            <div class="item-actions">
                ${item.status === 'active' 
                    ? '<button class="primary-btn" disabled style="padding: 5px 10px; font-size: 10px; opacity: 0.6;">АКТИВНО</button>' 
                    : '<button class="secondary-btn go-to-shop-btn" style="padding: 5px 10px; font-size: 10px; margin:0;">В МАГАЗИН</button>'}
            </div>
        </div>
    `).join('');

    // Обработка перехода в магазин
    container.querySelectorAll('.go-to-shop-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (window.showRoom) window.showRoom('shop');
        };
    });
}