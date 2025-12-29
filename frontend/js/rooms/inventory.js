/**
 * ЛОГИКА ИНВЕНТАРЯ (inventory.js)
 * Отображает текущие запасы игрока и позволяет быстро перейти в магазин.
 */
import * as api from '../../api.js';

export function initInventory() {
    // Получаем актуальный стейт
    const state = window.state; 
    const container = document.querySelector('#scene-inventory #inventory-content');
    
    if (!container) return;

    // 1. Формируем список предметов (Синхронизировано со структурой state)
    const items = [
        { 
            id: 'lives', 
            name: 'СЕРДЕЧКО', 
            icon: '❤️', 
            count: state.lives || 0, // Берём напрямую из state.lives
            description: 'Второй шанс: Продолжи игру после столкновения.',
            category: 'main'
        },
        { 
            id: 'shield', 
            name: 'ЩИТ', 
            icon: '🛡️', 
            count: state.powerups?.shield || 0, // Из ветки powerups
            description: 'Защита от одного удара. Активируется в игре.',
            category: 'powerup'
        },
        { 
            id: 'gap', 
            name: 'ШИРОКИЕ ПРОЁМЫ', 
            icon: '↕️', 
            count: state.powerups?.gap || 0,
            description: 'Увеличивает расстояние между трубами.',
            category: 'powerup'
        },
        { 
            id: 'magnet', 
            name: 'МАГНИТ', 
            icon: '🧲', 
            count: state.powerups?.magnet || 0,
            description: 'Притягивает все монеты на пути.',
            category: 'powerup'
        },
        { 
            id: 'ghost', 
            name: 'ПРИЗРАК', 
            icon: '👻', 
            count: state.powerups?.ghost || 0,
            description: 'Позволяет лететь сквозь препятствия.',
            category: 'powerup'
        }
    ];

    // --- ПРОВЕРКА НА ПУСТОТУ ---
    const isInventoryEmpty = items.every(i => i.count === 0);

    if (isInventoryEmpty) {
        container.innerHTML = `
            <div class="empty-state" style="padding: 60px 20px; text-align: center; background: rgba(0,0,0,0.2); border-radius: 20px; border: 1px dashed rgba(255,255,255,0.1);">
                <div style="font-size: 50px; margin-bottom: 10px; opacity: 0.3;">🎒</div>
                <p style="color: #aaa; font-size: 14px; margin-bottom: 20px;">Твой рюкзак пуст.</p>
                <button id="go-to-shop-empty" class="primary-btn" style="width: auto; padding: 12px 30px;">КУПИТЬ ПРЕДМЕТЫ</button>
            </div>
        `;
        
        const emptyBtn = container.querySelector('#go-to-shop-empty');
        if (emptyBtn) emptyBtn.onclick = () => window.showRoom('shop');
        return;
    }

    // --- ОТРИСОВКА КАРТОЧЕК ---
    container.innerHTML = items.map(item => {
        const isEmpty = item.count <= 0;
        
        return `
        <div class="inventory-card" 
             style="display: flex; align-items: center; background: ${isEmpty ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)'}; 
                    border-radius: 16px; padding: 15px; margin-bottom: 12px; 
                    border: 1px solid ${isEmpty ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}; 
                    transition: transform 0.2s ease; opacity: ${isEmpty ? '0.5' : '1'};">
            
            <div class="item-icon-wrapper" style="position: relative; width: 54px; height: 54px; background: rgba(0,0,0,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; border: 1px solid rgba(255,255,255,0.1);">
                ${item.icon}
                ${isEmpty ? '<div style="position:absolute; bottom:-5px; right:-5px; font-size:16px;">🛒</div>' : ''}
            </div>

            <div class="item-info" style="flex-grow: 1; margin-left: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 14px; color: #fff; letter-spacing: 0.5px;">${item.name}</span>
                    <span style="background: ${isEmpty ? '#444' : '#f7d51d'}; color: ${isEmpty ? '#aaa' : '#000'}; 
                                 padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 900;">
                        ${isEmpty ? '0' : 'x' + item.count}
                    </span>
                </div>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #888; line-height: 1.3;">${item.description}</p>
            </div>

            <div class="item-actions" style="margin-left: 10px;">
                ${isEmpty 
                    ? `<button class="go-to-shop-btn" style="background: #333; color: #fff; border: none; padding: 8px 12px; border-radius: 8px; font-size: 10px; font-weight: bold; cursor: pointer;">SHOP</button>` 
                    : `<div style="color: #4ec0ca; font-size: 10px; font-weight: 900; letter-spacing: 1px; padding: 6px; border: 1px solid rgba(78, 192, 202, 0.3); border-radius: 8px;">READY</div>`
                }
            </div>
        </div>
        `;
    }).join('');

    // Слушатели для кнопок магазина
    container.querySelectorAll('.go-to-shop-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            window.showRoom('shop');
        };
    });
}