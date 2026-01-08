/**
 * ЛОГИКА ИНВЕНТАРЯ (inventory.js)
 * Показывает купленные способности.
 * Энергия (⚡) здесь НЕ показывается — она в шапке игры.
 */

import * as api from '../../api.js';

export function initInventory() {
    const state = window.state; 
    const container = document.querySelector('#scene-inventory #inventory-content');
    
    if (!container) return;

    // 1. Список предметов (Только способности!)
    const items = [
        { 
            id: 'heart', // ВАЖНО: Это способность из powerups, а не жизни из lives
            name: 'СЕРДЦЕ', 
            icon: '❤️', 
            count: state.powerups?.heart || 0, 
            description: 'Возрождение после смерти'
        },
        { 
            id: 'shield', 
            name: 'ЩИТ', 
            icon: '🛡️', 
            count: state.powerups?.shield || 0, 
            description: 'Защита от одного удара'
        },
        { 
            id: 'gap', 
            name: 'ПРОЕМЫ', 
            icon: '↔️', 
            count: state.powerups?.gap || 0, 
            description: 'Широкие трубы'
        },
        { 
            id: 'magnet', 
            name: 'МАГНИТ', 
            icon: '🧲', 
            count: state.powerups?.magnet || 0, 
            description: 'Притягивает монеты'
        },
        { 
            id: 'ghost', 
            name: 'ПРИЗРАК', 
            icon: '👻', 
            count: state.powerups?.ghost || 0, 
            description: 'Полет сквозь стены'
        }
    ];

    // 2. Отрисовка карточек
    container.innerHTML = items.map(item => {
        const isEmpty = item.count <= 0;
        
        // Кнопка "КУПИТЬ" или счетчик
        const actionHtml = isEmpty 
            ? `<button class="go-to-shop-btn" style="
                    background: #4ec0ca; 
                    color: #fff; 
                    border: none; 
                    border-radius: 15px; 
                    padding: 4px 12px; 
                    font-size: 10px; 
                    font-weight: 900; 
                    cursor: pointer;
                    box-shadow: 0 2px 0 #2e8b94;">
                КУПИТЬ
               </button>`
            : `<div class="inventory-count">x${item.count}</div>`;

        return `
        <div class="inventory-card ${isEmpty ? 'empty' : ''}">
            <div style="display: flex; align-items: center;">
                <div class="icon">${item.icon}</div>
                <div>
                    <div class="name">${item.name}</div>
                    <div class="desc">${item.description}</div>
                </div>
            </div>
            
            <div>
                ${actionHtml}
            </div>
        </div>
        `;
    }).join('');

    // 3. Обработчик перехода в магазин
    container.querySelectorAll('.go-to-shop-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            window.showRoom('shop');
        };
    });
}