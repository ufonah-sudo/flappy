import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    const walletContainerId = 'settings-ton-wallet'; // Этот ID уже есть в index.html (внутри .vision-window)

    if (!container) return;

    // 1. Отрисовка кнопок (Звук, Музыка, Инфо)
    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    container.innerHTML = `
        <div class="settings-group" style="width: 100%; display: flex; flex-direction: column; gap: 10px;">
            <button id="toggle-sound" class="settings-btn wooden-btn" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
                <span>🔊 ЗВУК</span>
                <span class="status" style="color: ${settings.sound ? '#4ec0ca' : '#ff4f4f'}">
                    ${settings.sound ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
            </button>

            <button id="toggle-music" class="settings-btn wooden-btn" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
                <span>🎵 МУЗЫКА</span>
                <span class="status" style="color: ${settings.music ? '#4ec0ca' : '#ff4f4f'}">
                    ${settings.music ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
            </button>
        </div>

        <div class="settings-group info-section" style="margin-top: 25px; width: 100%; display: flex; flex-direction: column; gap: 10px;">
            <button id="btn-channel" class="secondary-btn">📢 НАШ КАНАЛ</button>
            <button id="btn-support" class="secondary-btn">🆘 ПОДДЕРЖКА</button>
        </div>
        
        <div class="version-info" style="margin-top: 30px; font-size: 10px; opacity: 0.5; color: #fff;">Версия 1.0.3</div>
    `;

    // 2. Логика Кошелька (перепривязка кнопки)
    // Мы делаем это ПОСЛЕ рендера, чтобы не мешать отрисовке кнопок
    if (window.wallet && window.wallet.tonConnectUI) {
        // Проверяем, существует ли контейнер кошелька в DOM
        const walletDiv = document.getElementById(walletContainerId);
        if (walletDiv) {
            // Очищаем его на всякий случай
            walletDiv.innerHTML = ''; 
            // Говорим TON Connect UI рисовать кнопку именно сюда
            try {
                window.wallet.tonConnectUI.setConnectButtonRoot(walletContainerId);
            } catch (e) {
                console.warn("TON Wallet UI error:", e);
            }
        }
    }

    // 3. Логика переключателей
    const soundBtn = document.getElementById('toggle-sound');
    if (soundBtn) {
        soundBtn.onclick = () => {
            settings.sound = !settings.sound;
            localStorage.setItem('sound', settings.sound ? 'on' : 'off');
            const statusEl = soundBtn.querySelector('.status');
            statusEl.innerText = settings.sound ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings.sound ? '#4ec0ca' : '#ff4f4f';
            
            // Если есть глобальный метод управления музыкой
            if (window.game && typeof window.game.updateAudio === 'function') {
                window.game.updateAudio();
            }
        };
    }

    const musicBtn = document.getElementById('toggle-music');
    if (musicBtn) {
        musicBtn.onclick = () => {
            settings.music = !settings.music;
            localStorage.setItem('music', settings.music ? 'on' : 'off');
            const statusEl = musicBtn.querySelector('.status');
            statusEl.innerText = settings.music ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings.music ? '#4ec0ca' : '#ff4f4f';
        };
    }
    
    // 4. Логика кнопок ссылок
    const openLink = (url) => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    const btnChannel = document.getElementById('btn-channel');
    if (btnChannel) btnChannel.onclick = () => openLink('https://t.me/ТВОЙ_КАНАЛ'); // Замени ссылку

    const btnSupport = document.getElementById('btn-support');
    if (btnSupport) btnSupport.onclick = () => openLink('https://t.me/ТВОЙ_САППОРТ'); // Замени ссылку
}
