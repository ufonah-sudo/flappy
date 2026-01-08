import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    if (!container) return;

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // 1. РИСУЕМ ИНТЕРФЕЙС (Включая пустое место под кошелек)
    container.innerHTML = `
        <!-- ЗАГОЛОВОК СЕКЦИИ -->
        <h4 style="color: #f7d51d; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; text-shadow: 1px 1px 0 #000;">
            💎 КОШЕЛЕК
        </h4>

        <!-- СЮДА СКРИПТ ВСТАВИТ КНОПКУ -->
        <div id="dynamic-wallet-root" style="width: 100%; display: flex; justify-content: center; margin-bottom: 25px; min-height: 50px;">
            <!-- Если кнопка не появится, тут будет пусто -->
        </div>

        <!-- НАСТРОЙКИ ЗВУКА -->
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
        
        <div class="version-info" style="margin-top: 30px; font-size: 10px; opacity: 0.5; color: #fff; text-align: center;">Версия 1.0.5</div>
    `;

    // 2. ВСТАВЛЯЕМ КНОПКУ КОШЕЛЬКА (С задержкой, чтобы HTML успел отрисоваться)
    setTimeout(() => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                // Говорим библиотеке перенести кнопку в наш новый div
                window.wallet.tonConnectUI.setConnectButtonRoot('dynamic-wallet-root');
                console.log("Кнопка кошелька перенесена в настройки");
            } catch (e) {
                console.error("Ошибка кошелька:", e);
            }
        }
    }, 50);

    // 3. ОБРАБОТЧИКИ (Звук/Музыка)
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
