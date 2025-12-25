import { state } from '../../main.js';

export function initInventory() {
    const container = document.querySelector('#scene-inventory .inventory-items');
    if (!container) return;

    // Список предметов (пока хардкод, позже можно запрашивать из БД или state)
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

    container.innerHTML = items.map(item => `
        <div class="inventory-card ${item.status}">
            <div class="item-icon-wrapper">
                <span class="item-icon">${item.icon}</span>
                ${item.status === 'locked' ? '<div class="lock-overlay">🔒</div>' : ''}
            </div>
            <div class="item-info">
                <div class="item-header">
                    <span class="item-name">${item.name}</span>
                    <span class="item-level">Ур. ${item.level}</span>
                </div>
                <p class="item-desc">${item.description}</p>
            </div>
            ${item.status === 'active' ? '<button class="use-btn" disabled>Активен</button>' : '<button class="unlock-btn">Открыть</button>'}
        </div>
    `).join('');
}