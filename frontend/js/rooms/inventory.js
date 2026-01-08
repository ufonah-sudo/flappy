/**
 * js/rooms/inventory.js - ИНВЕНТАРЬ С ВКЛАДКАМИ
 */
import * as api from '../../api.js';

export function initInventory() {
    const state = window.state; 
    const container = document.querySelector('#scene-inventory #inventory-content');
    
    if (!container) return;

    // 1. БАЗА ДАННЫХ ПРЕДМЕТОВ
    // category: 'power' | 'skin' | 'misc'
    const allItems = [
        // --- СИЛЫ ---
        { id: 'heart', name: 'СЕРДЦЕ', icon: '❤️', cat: 'power', count: state.powerups?.heart, desc: 'Возрождение' },
        { id: 'shield', name: 'ЩИТ', icon: '🛡️', cat: 'power', count: state.powerups?.shield, desc: 'Защита' },
        { id: 'gap', name: 'ПРОЕМЫ', icon: '↔️', cat: 'power', count: state.powerups?.gap, desc: 'Широкие трубы' },
        { id: 'magnet', name: 'МАГНИТ', icon: '🧲', cat: 'power', count: state.powerups?.magnet, desc: 'Ловит монеты' },
        { id: 'ghost', name: 'ПРИЗРАК', icon: '👻', cat: 'power', count: state.powerups?.ghost, desc: 'Сквозь стены' },

        // --- СКИНЫ (Пример) ---
        { id: 'skin_bird_1', name: 'ЖЕЛТАЯ', icon: '🐦', cat: 'skin', count: 1, desc: 'Стандарт' }, // Всегда есть
        { id: 'skin_bird_2', name: 'КИБОРГ', icon: '🤖', cat: 'skin', count: state.inventory.includes('skin_bird_2') ? 1 : 0, desc: 'Робот-птица' },

        // --- РАЗНОЕ (Пример) ---
        { id: 'sound_pack_1', name: 'РЕТРО', icon: '🎵', cat: 'misc', count: 0, desc: 'Звуки 8-бит' }
    ];

    // 2. РЕНДЕР HTML
    container.innerHTML = `
        <div class="ui-tabs">
            <button class="ui-tab-btn active" data-target="inv-powers">СИЛЫ</button>
            <button class="ui-tab-btn" data-target="inv-skins">СКИНЫ</button>
            <button class="ui-tab-btn" data-target="inv-misc">РАЗНОЕ</button>
        </div>

        <div id="inv-powers" class="ui-tab-content active-view"></div>
        <div id="inv-skins" class="ui-tab-content"></div>
        <div id="inv-misc" class="ui-tab-content"></div>
    `;

    // 3. ФУНКЦИЯ ОТРИСОВКИ СПИСКА
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
            
            // Если нет -> Кнопка "Купить" (для сил) или "Закрыто" (для скинов)
            let actionHtml = '';
            
            if (isEmpty) {
                if (category === 'power') {
                    actionHtml = `<button class="go-shop-btn" style="background:#4ec0ca; color:#fff; border:none; border-radius:12px; padding:4px 10px; font-weight:900; font-size:10px;">КУПИТЬ</button>`;
                } else {
                    actionHtml = `<span style="font-size:18px;">🔒</span>`;
                }
            } else {
                if (category === 'power') {
                    actionHtml = `<div class="inventory-count">x${count}</div>`;
                } else {
                    // Для скинов кнопка "Выбрать"
                    actionHtml = `<button class="equip-btn" style="background:#f7d51d; color:#000; border:none; border-radius:12px; padding:4px 10px; font-weight:900; font-size:10px;">ВЗЯТЬ</button>`;
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

    // Заполняем вкладки
    renderList('power', 'inv-powers');
    renderList('skin', 'inv-skins');
    renderList('misc', 'inv-misc');

    // 4. ЛОГИКА ПЕРЕКЛЮЧЕНИЯ
    const tabs = container.querySelectorAll('.ui-tab-btn');
    const contents = container.querySelectorAll('.ui-tab-content');
    
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active-view'));
            
            tab.classList.add('active');
            document.getElementById(tab.dataset.target).classList.add('active-view');
        };
    });

    // 5. КЛИКИ ПО КНОПКАМ
    container.querySelectorAll('.go-shop-btn').forEach(btn => {
        btn.onclick = () => window.showRoom('shop');
    });
}
