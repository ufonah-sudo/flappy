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

    // --- 1. HTML: КРАСИВЫЕ БЛОКИ (.powerup-card) ---
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; padding-top: 10px;">
            
            <!-- БЛОК КОШЕЛЬКА (Специальная карточка) -->
            <div class="powerup-card" style="border-color: #0098ea; flex-direction: column; align-items: center; padding: 15px;">
                <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center;">
                        <div class="icon">💎</div>
                        <div class="name">КОШЕЛЕК</div>
                    </div>
                    <!-- Статус (подключен или нет) -->
                    <div id="wallet-status-text" style="font-size: 10px; font-weight: 900; color: #aaa;">OFFLINE</div>
                </div>

                <!-- Место для синей кнопки -->
                <div id="settings-wallet-root-unique" style="width: 100%; display: flex; justify-content: center;"></div>

                <!-- Кнопка "Отключить" (появляется при подключении) -->
                <button id="btn-disconnect-ton" class="action-btn" style="background: #ff4f4f; display: none; width: 100%; margin-top: 10px;">
                    ОТКЛЮЧИТЬ
                </button>
                
                <!-- Запасная кнопка -->
                <button id="manual-wallet-btn" class="action-btn btn-blue" style="display: none; width: 100%;">
                    CONNECT WALLET
                </button>
            </div>

            <!-- ЗВУК -->
            <div id="toggle-sound" class="powerup-card" style="cursor: pointer;">
                <div style="display: flex; align-items: center;">
                    <div class="icon">🔊</div>
                    <div class="name">ЗВУКИ</div>
                </div>
                <div class="status" style="font-weight: 900; color: ${settings.sound ? '#4ec0ca' : '#ff4f4f'};">
                    ${settings.sound ? 'ВКЛ' : 'ВЫКЛ'}
                </div>
            </div>

            <!-- МУЗЫКА -->
            <div id="toggle-music" class="powerup-card" style="cursor: pointer;">
                <div style="display: flex; align-items: center;">
                    <div class="icon">🎵</div>
                    <div class="name">МУЗЫКА</div>
                </div>
                <div class="status" style="font-weight: 900; color: ${settings.music ? '#4ec0ca' : '#ff4f4f'};">
                    ${settings.music ? 'ВКЛ' : 'ВЫКЛ'}
                </div>
            </div>

            <!-- ССЫЛКИ -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
                <button id="btn-channel" class="powerup-card" style="justify-content: center; cursor: pointer; border-color: #ffd700;">
                    <span style="font-size: 12px; font-weight: 900; color: #333;">📢 КАНАЛ</span>
                </button>
                <button id="btn-support" class="powerup-card" style="justify-content: center; cursor: pointer; border-color: #ffd700;">
                    <span style="font-size: 12px; font-weight: 900; color: #333;">🆘 ПОМОЩЬ</span>
                </button>
            </div>
            
            <div class="version-info" style="margin-top: 20px; font-size: 10px; opacity: 0.4; color: #fff; text-align: center;">
                v1.2.0
            </div>
        </div>
    `;

    // --- 2. ЛОГИКА КОШЕЛЬКА ---
    const updateWalletState = () => {
        const discBtn = document.getElementById('btn-disconnect-ton');
        const manualBtn = document.getElementById('manual-wallet-btn');
        const statusText = document.getElementById('wallet-status-text');

        if (!window.wallet) return;

        if (window.wallet.isConnected) {
            if(discBtn) discBtn.style.display = 'block';
            if(manualBtn) manualBtn.style.display = 'none';
            if(statusText) { statusText.innerText = "ONLINE"; statusText.style.color = "#4ec0ca"; }
        } else {
            if(discBtn) discBtn.style.display = 'none';
            if(statusText) { statusText.innerText = "OFFLINE"; statusText.style.color = "#ff4f4f"; }
        }
    };

    const attemptRender = (retries = 0) => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
                updateWalletState();
                
                // Подписка на изменения
                window.wallet.tonConnectUI.onStatusChange(() => updateWalletState());
            } catch (e) {
                document.getElementById('manual-wallet-btn').style.display = 'block';
            }
        } else {
            if (retries < 10) setTimeout(() => attemptRender(retries + 1), 200);
            else document.getElementById('manual-wallet-btn').style.display = 'block';
        }
    };
    attemptRender();

    // Кнопка отключения
    const discBtn = document.getElementById('btn-disconnect-ton');
    if (discBtn) {
        discBtn.onclick = async () => {
            if (window.wallet) {
                await window.wallet.disconnect();
                updateWalletState();
            }
        };
    }

    // Ручная кнопка подключения
    const manualBtn = document.getElementById('manual-wallet-btn');
    if (manualBtn) manualBtn.onclick = () => window.wallet?.tonConnectUI?.openModal();


    // --- 3. ЛОГИКА НАСТРОЕК (ЗВУК/МУЗЫКА) ---
    const toggleSetting = (key, btnId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        btn.onclick = () => {
            // Меняем значение
            settings[key] = !settings[key];
            localStorage.setItem(key, settings[key] ? 'on' : 'off');
            
            // Обновляем UI
            const statusEl = btn.querySelector('.status');
            statusEl.innerText = settings[key] ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings[key] ? '#4ec0ca' : '#ff4f4f';
            
            // Вибрация
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

    document.getElementById('btn-channel').onclick = () => openLink('https://t.me/your_channel');
    document.getElementById('btn-support').onclick = () => openLink('https://t.me/your_support');
}
