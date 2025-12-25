import * as api from '../../api.js';

export function initInventory() {
    const state = window.state; 
    const container = document.querySelector('#scene-inventory #inventory-content');
    
    if (!container) {
        console.warn("[Inventory] Container #inventory-content not found");
        return;
    }

    // В будущем данные будут браться из state.user.inventory
    // Сейчас используем расширенную заглушку для проверки верстки
    const items = state?.user?.inventory || [
        { 
            id: 'magnet', 
            name: 'Магнит', 
            level: 1, 
            icon: '🧲', 
            description: 'Притягивает монеты в радиусе',
            status: 'active' 
        },
        { 
            id: 'shield', 
            name: 'Щит', 
            level: 0, 
            icon: '🛡️', 
            description: 'Защита от одного удара',
            status: 'locked' 
        }
    ];

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="empty-text" style="padding: 50px 20px; opacity: 0.5;">
                <p>Твой рюкзак пуст.</p>
                <button class="primary-btn" onclick="showRoom('shop')" style="margin-top:15px;">В МАГАЗИН</button>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="inventory-card ${item.status === 'locked' ? 'locked' : ''}" 
             style="display: flex; align-items: center; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1);">
            
            <div class="item-icon-wrapper" style="position: relative; width: 50px; height: 50px; background: rgba(0,0,0,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                <span class="item-icon">${item.icon}</span>
                ${item.status === 'locked' ? '<div style="position:absolute; bottom:-5px; right:-5px; font-size:14px;">🔒</div>' : ''}
            </div>

            <div class="item-info" style="flex-grow: 1; text-align: left; padding-left: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 15px; color: #fff;">${item.name}</span>
                    <span style="color: #f7d51d; font-size: 11px; font-weight: bold;">
                        ${item.status === 'locked' ? '' : 'LVL ' + item.level}
                    </span>
                </div>
                <p style="margin: 3px 0 0 0; font-size: 11px; color: #aaa; line-height: 1.2;">${item.description}</p>
            </div>

            <div class="item-actions" style="margin-left: 10px;">
                ${item.status === 'active' 
                    ? '<div style="color: #4ec0ca; font-size: 10px; font-weight: 800; border: 1px solid #4ec0ca; padding: 4px 8px; border-radius: 6px;">EQUIPPED</div>' 
                    : '<button class="secondary-btn go-to-shop-btn" style="padding: 6px 10px; font-size: 10px; width: auto; background: #555; color: #fff; border: none; border-radius: 6px;">UNLOCK</button>'}
            </div>
        </div>
    `).join('');

    // Навешиваем клики
    container.querySelectorAll('.go-to-shop-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (window.showRoom) window.showRoom('shop');
        };
    });
}