import * as api from '../../api.js';

export function initInventory() {
    // Берем актуальное состояние из window.state
    const state = window.state; 
    const container = document.querySelector('#scene-inventory #inventory-content');
    
    if (!container) {
        console.warn("[Inventory] Container #inventory-content not found");
        return;
    }

    // 1. Формируем список расходных материалов
    const consumables = [
        { 
            id: 'lives', 
            name: 'Сердечко', 
            icon: '❤️', 
            count: state.lives || 0,
            description: 'Второй шанс: Продолжи игру после столкновения.',
            status: state.lives > 0 ? 'active' : 'empty'
        },
        { 
            id: 'shield', 
            name: 'Щит', 
            icon: '🛡️', 
            count: state.powerups?.shield || 0,
            description: 'Защита от одного удара',
            status: state.powerups?.shield > 0 ? 'active' : 'empty'
        },
        { 
            id: 'gap', 
            name: 'Широкие проёмы', 
            icon: '↕️', 
            count: state.powerups?.gap || 0,
            description: 'Увеличивает расстояние между трубами (5 сек)',
            status: state.powerups?.gap > 0 ? 'active' : 'empty'
        },
        { 
            id: 'magnet', 
            name: 'Магнит', 
            icon: '🧲', 
            count: state.powerups?.magnet || 0,
            description: 'Притягивает монеты (6 сек)',
            status: state.powerups?.magnet > 0 ? 'active' : 'empty'
        },
        { 
            id: 'ghost', 
            name: 'Призрак', 
            icon: '👻', 
            count: state.powerups?.ghost || 0,
            description: 'Проход сквозь трубы (4 сек)',
            status: state.powerups?.ghost > 0 ? 'active' : 'empty'
        }
    ];

    // --- ЛОГИКА ДЛЯ ПУСТОГО ИНВЕНТАРЯ ---
    if (consumables.every(i => i.count === 0)) {
        container.innerHTML = `
            <div class="empty-text" style="padding: 50px 20px; opacity: 0.5; text-align: center;">
                <p>Твой рюкзак пуст.</p>
                <button id="go-to-shop-empty" class="primary-btn" style="margin-top:15px;">В МАГАЗИН</button>
            </div>
        `;
        
        // Привязываем событие через JS, так как onclick в строке может не сработать в модуле
        const emptyBtn = container.querySelector('#go-to-shop-empty');
        if (emptyBtn) {
            emptyBtn.onclick = (e) => {
                e.preventDefault();
                if (window.showRoom) window.showRoom('shop');
            };
        }
        return;
    }

    // Генерируем HTML списка
    container.innerHTML = consumables.map(item => {
        const isEmpty = item.count <= 0;
        
        return `
        <div class="inventory-card" 
             style="display: flex; align-items: center; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 12px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.1); opacity: ${isEmpty ? '0.6' : '1'};">
            
            <div class="item-icon-wrapper" style="position: relative; width: 50px; height: 50px; background: rgba(0,0,0,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                <span class="item-icon">${item.icon}</span>
                ${isEmpty ? '<div style="position:absolute; bottom:-5px; right:-5px; font-size:14px;">🛒</div>' : ''}
            </div>

            <div class="item-info" style="flex-grow: 1; text-align: left; padding-left: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 15px; color: #fff;">${item.name}</span>
                    <span style="color: #f7d51d; font-size: 11px; font-weight: bold;">
                        ${isEmpty ? 'КУПИТЬ' : 'x' + item.count}
                    </span>
                </div>
                <p style="margin: 3px 0 0 0; font-size: 11px; color: #aaa; line-height: 1.2;">${item.description}</p>
            </div>

            <div class="item-actions" style="margin-left: 10px;">
                ${!isEmpty 
                    ? '<div style="color: #4ec0ca; font-size: 10px; font-weight: 800; border: 1px solid #4ec0ca; padding: 4px 8px; border-radius: 6px;">READY</div>' 
                    : '<button class="secondary-btn go-to-shop-btn" style="padding: 6px 10px; font-size: 10px; width: auto; background: #555; color: #fff; border: none; border-radius: 6px;">SHOP</button>'}
            </div>
        </div>
    `;
    }).join('');

    // Привязываем клик к кнопкам SHOP внутри карточек
    container.querySelectorAll('.go-to-shop-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            if (window.showRoom) window.showRoom('shop');
        };
    });
}