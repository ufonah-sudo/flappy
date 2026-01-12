/**
 * js/rooms/settings.js - НАСТРОЙКИ (СТИЛЬ МАГАЗИНА)
 */
import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    if (!container) return;

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // --- 1. HTML: ИНТЕРФЕЙС ---
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; padding-top: 10px;">
            
            <div class="powerup-card" style="border-color: #0098ea; flex-direction: column; align-items: center; padding: 15px;">
                <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">💎</div>
                        <div class="name">КОШЕЛЕК</div>
                    </div>
                    <div id="wallet-status-text" style="font-size: 10px; font-weight: 900; color: #aaa;">OFFLINE</div>
                </div>

                <div id="settings-wallet-root-unique" style="width: 100%; display: flex; justify-content: center;"></div>

                <button id="btn-disconnect-ton" style="
                    background: #ff4747; 
                    color: white; 
                    border: none; 
                    border-radius: 30px; /* Сделали овалом */
                    padding: 10px 0; 
                    width: 100%; 
                    margin-top: 5px; 
                    font-weight: 900; 
                    font-size: 12px;
                    cursor: pointer;
                    display: none; /* По умолчанию скрыта */
                    box-shadow: 0 4px 0 #cc0000;
                    transition: transform 0.1s;
                ">
                    🚪 DISCONNECT WALLET
                </button>
                
                <button id="manual-wallet-btn" class="action-btn btn-blue" style="display: none; width: 100%;">
                    CONNECT WALLET
                </button>
            </div>

            <div id="toggle-sound" class="powerup-card" style="cursor: pointer;">
                <div style="display: flex; align-items: center;">
                    <div class="icon">🔊</div>
                    <div class="name">ЗВУКИ</div>
                </div>
                <div class="status" style="font-weight: 900; color: ${settings.sound ? '#4ec0ca' : '#ff4f4f'};">
                    ${settings.sound ? 'ВКЛ' : 'ВЫКЛ'}
                </div>
            </div>

            <div id="toggle-music" class="powerup-card" style="cursor: pointer;">
                <div style="display: flex; align-items: center;">
                    <div class="icon">🎵</div>
                    <div class="name">МУЗЫКА</div>
                </div>
                <div class="status" style="font-weight: 900; color: ${settings.music ? '#4ec0ca' : '#ff4f4f'};">
                    ${settings.music ? 'ВКЛ' : 'ВЫКЛ'}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                <button id="btn-channel" class="powerup-card" style="justify-content: center; cursor: pointer; border-color: #ffd700;">
                    <span style="font-size: 12px; font-weight: 900; color: #333;">📢 КАНАЛ</span>
                </button>
                <button id="btn-support" class="powerup-card" style="justify-content: center; cursor: pointer; border-color: #ffd700;">
                    <span style="font-size: 12px; font-weight: 900; color: #333;">🆘 ПОМОЩЬ</span>
                </button>
            </div>
            
            <div class="version-info" style="margin-top: 20px; font-size: 10px; opacity: 0.4; color: #fff; text-align: center;">
                v1.2.2
            </div>
        </div>
    `;

    // --- 2. ЛОГИКА КОШЕЛЬКА ---
    const updateWalletState = () => {
        const discBtn = document.getElementById('btn-disconnect-ton');
        const manualBtn = document.getElementById('manual-wallet-btn');
        const statusText = document.getElementById('wallet-status-text');
        const walletRoot = document.getElementById('settings-wallet-root-unique'); // Стандартная кнопка

        if (!window.wallet || !window.wallet.tonConnectUI) return;

        const isConnected = window.wallet.tonConnectUI.connected;
        const account = window.wallet.tonConnectUI.account;

        if (isConnected) {
            // === ЕСЛИ ПОДКЛЮЧЕН ===
            
            // 1. Показываем КРАСНУЮ кнопку
            if(discBtn) discBtn.style.display = 'block';
            
            // 2. Скрываем стандартную СИНЮЮ кнопку (чтобы была "вместо")
            if(walletRoot) walletRoot.style.display = 'none';
            if(manualBtn) manualBtn.style.display = 'none';

            // 3. Показываем сокращенный адрес в статусе (так как синюю кнопку мы скрыли)
            if(statusText) {
                if (account && account.address) {
                    // Форматируем адрес: UQ...ABCD
                    const rawAddress = account.address;
                    const short = rawAddress.slice(0, 4) + '...' + rawAddress.slice(-4);
                    statusText.innerText = short;
                } else {
                    statusText.innerText = "ONLINE";
                }
                statusText.style.color = "#4ec0ca"; // Зеленый/Голубой цвет
            }

        } else {
            // === ЕСЛИ НЕ ПОДКЛЮЧЕН ===
            
            // 1. Скрываем КРАСНУЮ кнопку
            if(discBtn) discBtn.style.display = 'none';
            
            // 2. Показываем стандартную СИНЮЮ кнопку
            if(walletRoot) walletRoot.style.display = 'flex';
            
            if(statusText) { 
                statusText.innerText = "OFFLINE"; 
                statusText.style.color = "#ff4f4f"; // Красный цвет текста
            }
        }
    };

    const attemptRender = (retries = 0) => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                // Рендерим стандартную кнопку
                window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
                
                updateWalletState();
                
                // Следим за изменениями
                window.wallet.tonConnectUI.onStatusChange(() => updateWalletState());
            } catch (e) {
                console.error("Wallet UI Error", e);
                document.getElementById('manual-wallet-btn').style.display = 'block';
            }
        } else {
            if (retries < 10) setTimeout(() => attemptRender(retries + 1), 200);
            else document.getElementById('manual-wallet-btn').style.display = 'block';
        }
    };
    attemptRender();

    // --- ЛОГИКА КНОПКИ DISCONNECT ---
    const discBtn = document.getElementById('btn-disconnect-ton');
    if (discBtn) {
        discBtn.onclick = async () => {
            // Анимация нажатия
            discBtn.style.transform = "scale(0.95)";
            setTimeout(() => discBtn.style.transform = "scale(1)", 100);

            if (window.wallet && window.wallet.tonConnectUI) {
                await window.wallet.tonConnectUI.disconnect();
                // updateWalletState вызовется автоматически через onStatusChange, 
                // но можно вызвать и вручную для мгновенной реакции
                updateWalletState();
            }
        };
    }

    // Ручная кнопка (бэкап)
    const manualBtn = document.getElementById('manual-wallet-btn');
    if (manualBtn) manualBtn.onclick = () => window.wallet?.tonConnectUI?.openModal();


    // --- 3. ЛОГИКА НАСТРОЕК (ЗВУК/МУЗЫКА) ---
    const toggleSetting = (key, btnId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        btn.onclick = () => {
            settings[key] = !settings[key];
            localStorage.setItem(key, settings[key] ? 'on' : 'off');
            
            const statusEl = btn.querySelector('.status');
            statusEl.innerText = settings[key] ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings[key] ? '#4ec0ca' : '#ff4f4f';
            
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        };
    };

    toggleSetting('sound', 'toggle-sound');
    toggleSetting('music', 'toggle-music');
    
    // --- 4. ССЫЛКИ ---
    const openLink = (url) => {
        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    document.getElementById('btn-channel').onclick = () => openLink('https://t.me/valx7');
    document.getElementById('btn-support').onclick = () => openLink('https://t.me/valx7');
}