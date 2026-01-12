/**
 * js/rooms/settings.js - НАСТРОЙКИ (СТИЛЬ МАГАЗИНА + СИНХРОНИЗАЦИЯ)
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
                    background: #ff4747 !important; 
                    color: white !important; 
                    border: none !important; 
                    border-radius: 30px !important; 
                    padding: 10px 0 !important; 
                    width: 100% !important; 
                    margin-top: 5px !important; 
                    font-weight: 900 !important; 
                    font-size: 12px !important;
                    cursor: pointer !important;
                    display: none; 
                    box-shadow: 0 4px 0 #cc0000 !important;
                    transition: transform 0.1s !important;
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

    // Глобальная функция обновления для вызова из main.js или onStatusChange
    window.refreshWalletUI = () => {
        const discBtn = document.getElementById('btn-disconnect-ton');
        const manualBtn = document.getElementById('manual-wallet-btn');
        const statusText = document.getElementById('wallet-status-text');
        const walletRoot = document.getElementById('settings-wallet-root-unique');

        if (!window.wallet || !window.wallet.tonConnectUI) return;

        const isConnected = window.wallet.tonConnectUI.connected;
        const account = window.wallet.tonConnectUI.account;

        if (isConnected) {
            if (discBtn) discBtn.style.setProperty('display', 'block', 'important');
            if (walletRoot) walletRoot.style.display = 'none';
            if (manualBtn) manualBtn.style.display = 'none';

            if (statusText && account?.address) {
                const addr = account.address;
                statusText.innerText = addr.slice(0, 4) + '...' + addr.slice(-4);
                statusText.style.color = "#4ec0ca";
            }
        } else {
            if (discBtn) discBtn.style.setProperty('display', 'none', 'important');
            if (walletRoot) walletRoot.style.display = 'flex';
            if (statusText) {
                statusText.innerText = "OFFLINE";
                statusText.style.color = "#ff4f4f";
            }
        }
    };

    const attemptRender = (retries = 0) => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                // Привязываем синюю кнопку к контейнеру
                window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
                
                // Начальное обновление
                window.refreshWalletUI();
                
                // Подписка на изменения (чтобы кнопки менялись сразу при коннекте)
                window.wallet.tonConnectUI.onStatusChange(() => window.refreshWalletUI());
            } catch (e) {
                console.error("Wallet UI Error", e);
                const mBtn = document.getElementById('manual-wallet-btn');
                if (mBtn) mBtn.style.display = 'block';
            }
        } else {
            if (retries < 15) {
                setTimeout(() => attemptRender(retries + 1), 300);
            } else {
                const mBtn = document.getElementById('manual-wallet-btn');
                if (mBtn) mBtn.style.display = 'block';
            }
        }
    };

    attemptRender();

    // Логика кнопки Disconnect
    const dBtn = document.getElementById('btn-disconnect-ton');
    if (dBtn) {
        dBtn.onclick = async () => {
            if (window.audioManager) window.audioManager.playSound('button_click');
            dBtn.style.transform = "scale(0.95)";
            if (window.wallet && window.wallet.tonConnectUI) {
                try {
                    await window.wallet.tonConnectUI.disconnect();
                    window.refreshWalletUI();
                } catch (e) { console.error("Disconnect error", e); }
            }
            setTimeout(() => dBtn.style.transform = "scale(1)", 100);
        };
    }

    // Бэкап кнопка
    const manualBtn = document.getElementById('manual-wallet-btn');
    if (manualBtn) {
    manualBtn.onclick = () => {
        if (window.audioManager) window.audioManager.playSound('button_click');
        window.wallet?.tonConnectUI?.openModal();
    };
}

    // --- 3. ЛОГИКА НАСТРОЕК (ЗВУК/МУЗЫКА) ---
    const toggleSetting = (key, btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.onclick = () => {
        // 🎵 ЗВУК КЛИКА (Проигрываем ПЕРЕД переключением, чтобы игрок услышал подтверждение)
        if (window.audioManager) window.audioManager.playSound('button_click');

        settings[key] = !settings[key];
        localStorage.setItem(key, settings[key] ? 'on' : 'off');
        
        // Обновляем менеджер (он подхватит новые настройки из localStorage)
        if (window.audioManager) window.audioManager.updateAudioSettings();

        // Обновление UI...
        const statusEl = btn.querySelector('.status');
        statusEl.innerText = settings[key] ? 'ВКЛ' : 'ВЫКЛ';
        statusEl.style.color = settings[key] ? '#4ec0ca' : '#ff4f4f';
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    };
};

    toggleSetting('sound', 'toggle-sound');
    toggleSetting('music', 'toggle-music');
    
    // --- 4. ССЫЛКИ ---
    const openLink = (url) => {
        if (window.audioManager) window.audioManager.playSound('button_click');
        if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(url);
        else window.open(url, '_blank');
    };

    document.getElementById('btn-channel').onclick = () => openLink('https://t.me/valx7');
    document.getElementById('btn-support').onclick = () => openLink('https://t.me/valx7');
}