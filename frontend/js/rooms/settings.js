import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    
    if (!container) return;

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // 1. РИСУЕМ ЧИСТЫЙ ИНТЕРФЕЙС
    // Используем flex-start, чтобы элементы прижались к верху
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; justify-content: flex-start; padding-top: 10px;">
            
            <!-- 1. КНОПКА КОШЕЛЬКА (Главная, сверху) -->
            <!-- Без рамок и надписей. Чистая кнопка от библиотеки TON -->
            <div id="settings-wallet-root-unique" style="width: 100%; display: flex; justify-content: center; margin-bottom: 30px; min-height: 50px;"></div>

            <!-- 2. ПЕРЕКЛЮЧАТЕЛИ (Звук/Музыка) -->
            <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                <button id="toggle-sound" class="settings-btn wooden-btn" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin: 0;">
                    <span>🔊 ЗВУК</span>
                    <span class="status" style="color: ${settings.sound ? '#4ec0ca' : '#ff4f4f'}">
                        ${settings.sound ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                </button>

                <button id="toggle-music" class="settings-btn wooden-btn" style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin: 0;">
                    <span>🎵 МУЗЫКА</span>
                    <span class="status" style="color: ${settings.music ? '#4ec0ca' : '#ff4f4f'}">
                        ${settings.music ? 'ВКЛ' : 'ВЫКЛ'}
                    </span>
                </button>
            </div>

            <!-- 3. ССЫЛКИ -->
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="btn-channel" class="secondary-btn" style="flex: 1; font-size: 12px; padding: 12px;">📢 КАНАЛ</button>
                <button id="btn-support" class="secondary-btn" style="flex: 1; font-size: 12px; padding: 12px;">🆘 ПОМОЩЬ</button>
            </div>
            
            <div class="version-info" style="margin-top: auto; padding-bottom: 10px; font-size: 10px; opacity: 0.4; color: #fff; text-align: center;">
                v1.0.9
            </div>
        </div>
    `;

    // 2. ОТРИСОВКА КНОПКИ TON (Принудительная)
    setTimeout(() => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                // Это вставит ту самую синюю овальную кнопку в наш div
                window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
            } catch (e) {
                console.error("Ошибка кошелька:", e);
            }
        }
    }, 50);

    // 3. ОБРАБОТЧИКИ
    const soundBtn = document.getElementById('toggle-sound');
    if (soundBtn) {
        soundBtn.onclick = () => {
            settings.sound = !settings.sound;
            localStorage.setItem('sound', settings.sound ? 'on' : 'off');
            soundBtn.querySelector('.status').innerText = settings.sound ? 'ВКЛ' : 'ВЫКЛ';
            soundBtn.querySelector('.status').style.color = settings.sound ? '#4ec0ca' : '#ff4f4f';
        };
    }

    const musicBtn = document.getElementById('toggle-music');
    if (musicBtn) {
        musicBtn.onclick = () => {
            settings.music = !settings.music;
            localStorage.setItem('music', settings.music ? 'on' : 'off');
            musicBtn.querySelector('.status').innerText = settings.music ? 'ВКЛ' : 'ВЫКЛ';
            musicBtn.querySelector('.status').style.color = settings.music ? '#4ec0ca' : '#ff4f4f';
        };
    }
    
    // Ссылки
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
