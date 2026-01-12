/**
 * js/rooms/settings.js - НАСТРОЙКИ (FIXED WALLET)
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
                    <div id="wallet-status-text" style="font-size: 10px; font-weight: 900; color: #aaa;">CHECKING...</div>
                </div>

                <div id="settings-wallet-root-unique" style="width: 100%; display: flex; justify-content: center;"></div>

                <button id="btn-disconnect-ton" style="
                    display: none; 
                    background: #ff4747 !important; 
                    color: white !important; 
                    border: none !important; 
                    border-radius: 30px !important; 
                    padding: 12px 0 !important; 
                    width: 100% !important; 
                    margin-top: 5px !important; 
                    font-weight: 900 !important; 
                    font-size: 12px !important;
                    cursor: pointer !important;
                    box-shadow: 0 4px 0 #cc0000 !important;
                    transition: transform 0.1s !important;
                    text-transform: uppercase !important;
                ">
                    🚪 DISCONNECT WALLET
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
        </div>
    `;

    // --- 2. ЛОГИКА КОШЕЛЬКА ---
    
    const updateWalletUI = () => {
        const discBtn = document.getElementById('btn-disconnect-ton');
        const walletRoot = document.getElementById('settings-wallet-root-unique');
        const statusText = document.getElementById('wallet-status-text');

        if (!window.wallet || !window.wallet.tonConnectUI) return;

        //account — самый надежный способ проверки
        const account = window.wallet.tonConnectUI.account;
        const isConnected = !!account;

        if (isConnected) {
            // СКРЫВАЕМ СИНЮЮ, ПОКАЗЫВАЕМ КРАСНУЮ
            if (walletRoot) walletRoot.style.display = 'none';
            if (discBtn) discBtn.style.setProperty('display', 'block', 'important');
            
            if (statusText) {
                const addr = account.address;
                statusText.innerText = addr.slice(0, 4) + '...' + addr.slice(-4);
                statusText.style.color = "#4ec0ca";
            }
        } else {
            // ПОКАЗЫВАЕМ СИНЮЮ, СКРЫВАЕМ КРАСНУЮ
            if (walletRoot) walletRoot.style.display = 'flex';
            if (discBtn) discBtn.style.setProperty('display', 'none', 'important');
            
            if (statusText) {
                statusText.innerText = "OFFLINE";
                statusText.style.color = "#ff4f4f";
            }
        }
    };

    const initWallet = async () => {
        if (window.wallet && window.wallet.tonConnectUI) {
            // Привязываем корень кнопки
            window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
            
            // Сразу проверяем статус
            updateWalletUI();

            // Слушаем изменения (подключение/отключение)
            window.wallet.tonConnectUI.onStatusChange(() => {
                updateWalletUI();
            });
        } else {
            // Если объект еще не готов, пробуем через 300мс
            setTimeout(initWallet, 300);
        }
    };

    initWallet();

    // Обработка клика по красной кнопке
    const discBtn = document.getElementById('btn-disconnect-ton');
    if (discBtn) {
        discBtn.onclick = async () => {
            discBtn.style.transform = "scale(0.95)";
            try {
                if (window.wallet && window.wallet.tonConnectUI) {
                    await window.wallet.tonConnectUI.disconnect();
                    updateWalletUI();
                }
            } catch (e) {
                console.error("Disconnect error", e);
            }
            setTimeout(() => discBtn.style.transform = "scale(1)", 100);
        };
    }

    // --- 3. ОСТАЛЬНАЯ ЛОГИКА ---
    const toggleSetting = (key, btnId) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        btn.onclick = () => {
            settings[key] = !settings[key];
            localStorage.setItem(key, settings[key] ? 'on' : 'off');
            const statusEl = btn.querySelector('.status');
            statusEl.innerText = settings[key] ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings[key] ? '#4ec0ca' : '#ff4f4f';
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
        };
    };

    toggleSetting('sound', 'toggle-sound');
    toggleSetting('music', 'toggle-music');

    const openLink = (url) => {
        if (window.Telegram?.WebApp?.openTelegramLink) window.Telegram.WebApp.openTelegramLink(url);
        else window.open(url, '_blank');
    };

    document.getElementById('btn-channel').onclick = () => openLink('https://t.me/valx7');
    document.getElementById('btn-support').onclick = () => openLink('https://t.me/valx7');
}