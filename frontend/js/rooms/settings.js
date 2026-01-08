import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    
    if (!container) return;

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // 1. РИСУЕМ ИНТЕРФЕЙС
    // Используем flex-column с gap, чтобы элементы шли друг за другом без лишних отступов
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
            
            <!-- БЛОК КОШЕЛЬКА (Красивая карточка сверху) -->
            <div style="background: #1e2329; border: 2px solid #5c4d32; border-radius: 16px; padding: 15px 10px; display: flex; justify-content: center; align-items: center; box-shadow: 0 4px 0 rgba(0,0,0,0.4);">
                <!-- Контейнер для кнопки TON Connect -->
                <div id="settings-wallet-root-unique" style="width: 100%; display: flex; justify-content: center;"></div>
            </div>

            <!-- ПЕРЕКЛЮЧАТЕЛИ (Звук/Музыка) -->
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

            <!-- ССЫЛКИ (В один ряд для компактности, или друг под другом) -->
            <div style="display: flex; gap: 10px; margin-top: 5px;">
                <button id="btn-channel" class="secondary-btn" style="flex: 1; font-size: 12px; padding: 10px;">📢 КАНАЛ</button>
                <button id="btn-support" class="secondary-btn" style="flex: 1; font-size: 12px; padding: 10px;">🆘 ПОМОЩЬ</button>
            </div>
            
            <div class="version-info" style="margin-top: 15px; font-size: 10px; opacity: 0.4; color: #fff; text-align: center;">
                v1.0.8
            </div>
        </div>
    `;

    // 2. ВСТАВЛЯЕМ КНОПКУ КОШЕЛЬКА (Принудительно)
    setTimeout(() => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                // Говорим библиотеке перенести кнопку в наш новый красивый блок
                window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
            } catch (e) {
                console.error("Ошибка кошелька:", e);
            }
        }
    }, 100);

    // 3. ЛОГИКА КНОПОК
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
