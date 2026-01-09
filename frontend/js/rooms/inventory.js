/**
 * js/rooms/inventory.js - ИНВЕНТАРЬ
 * Показывает купленные способности и скины.
 */

import * as api from '../../api.js';

// Запоминаем вкладку
let currentInvTab = 'inv-powers';

export function initInventory() {
    const state = window.state; 
    const container = document.querySelector('#scene-inventory #inventory-content');
    
    if (!container) return;

    // База предметов
    const allItems = [
        // Powers
        { id: 'heart', name: 'СЕРДЦЕ', icon: '❤️', cat: 'power', count: state.powerups?.heart, desc: 'Возрождение' },
        { id: 'shield', name: 'ЩИТ', icon: '🛡️', cat: 'power', count: state.powerups?.shield, desc: 'Защита' },
        { id: 'gap', name: 'ПРОЕМЫ', icon: '↔️', cat: 'power', count: state.powerups?.gap, desc: 'Широкие трубы' },
        { id: 'magnet', name: 'МАГНИТ', icon: '🧲', cat: 'power', count: state.powerups?.magnet, desc: 'Ловит монеты' },
        { id: 'ghost', name: 'ПРИЗРАК', icon: '👻', cat: 'power', count: state.powerups?.ghost, desc: 'Сквозь стены' },
        
        // Skins (пример)
        { id: 'skin_default', name: 'КЛАССИК', icon: '🐦', cat: 'skin', count: 1, desc: 'Обычная птица' }
    ];

    // --- HTML СТРУКТУРА ---
    container.innerHTML = `
        <div class="ui-tabs">
            <button class="ui-tab-btn ${currentInvTab === 'inv-powers' ? 'active' : ''}" data-target="inv-powers">СИЛЫ</button>
            <button class="ui-tab-btn ${currentInvTab === 'inv-skins' ? 'active' : ''}" data-target="inv-skins">СКИНЫ</button>
        </div>

        <div id="inv-powers" class="ui-tab-content ${currentInvTab === 'inv-powers' ? 'active-view' : ''}"></div>
        <div id="inv-skins" class="ui-tab-content ${currentInvTab === 'inv-skins' ? 'active-view' : ''}"></div>
        <div style="height: 40px;"></div>
    `;

    // --- ФУНКЦИЯ РЕНДЕРА СПИСКА ---
    const renderList = (category, rootId) => {
        const root = document.getElementById(rootId);
        const list = allItems.filter(i => i.cat === category);

        if (list.length === 0) {
            root.innerHTML = `<div style="text-align:center; color:#888; padding: 20px;">Пусто...</div>`;
            return;
        }

        root.innerHTML = list.map(item => {
            const count = item.count || 0;
            const isEmpty = count <= 0;
            
            let actionHtml = '';
            if (isEmpty) {
                // Если нет -> Кнопка "Купить" (для сил)
                if (category === 'power') {
                    actionHtml = `<button class="go-shop-btn action-btn btn-green">КУПИТЬ</button>`;
                } else {
                    actionHtml = `<span style="font-size:18px;">🔒</span>`;
                }
            } else {
                if (category === 'power') {
                    actionHtml = `<div class="inventory-count">x${count}</div>`;
                } else {
                    actionHtml = `<button class="equip-btn action-btn btn-blue">ВЗЯТЬ</button>`;
                }
            }

            return `
                <div class="inventory-card ${isEmpty ? 'empty' : ''}">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">${item.icon}</div>
                        <div>
                            <div class="name">${item.name}</div>
                            <div class="desc">${item.desc}</div>
                        </div>
                    </div>
                    <div>${actionHtml}</div>
                </div>
            `;
        }).join('');
    };

    // Заполняем списки
    renderList('power', 'inv-powers');
    renderList('skin', 'inv-skins');

    // --- ЛОГИКА ---
    
    // Вкладки
    const tabs = container.querySelectorAll('.ui-tab-btn');
    const contents = container.querySelectorAll('.ui-tab-content');
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-view'));
            
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            document.getElementById(targetId).classList.add('active-view');
            currentInvTab = targetId;
        };
    });

    // Переход в магазин
    container.querySelectorAll('.go-shop-btn').forEach(btn => {
        btn.onclick = () => window.showRoom('shop');
    });
}
