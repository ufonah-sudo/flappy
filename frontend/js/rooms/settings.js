import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    const walletContainerId = 'settings-ton-wallet'; // ID, который мы только что добавили в HTML

    // 1. ЛОГИКА КОШЕЛЬКА (Самое важное)
    // Проверяем, загрузилась ли библиотека и существует ли контейнер
    if (window.wallet && window.wallet.tonConnectUI) {
        const walletDiv = document.getElementById(walletContainerId);
        
        if (walletDiv) {
            console.log("Отрисовка кнопки кошелька в Настройках...");
            // Очищаем контейнер от мусора
            walletDiv.innerHTML = ''; 
            // Говорим библиотеке: "Рисуй кнопку здесь!"
            try {
                window.wallet.tonConnectUI.setConnectButtonRoot(walletContainerId);
            } catch (e) {
                console.warn("Ошибка отрисовки кнопки:", e);
            }
        } else {
            console.error("Не найден контейнер #settings-ton-wallet в HTML!");
        }
    }

    if (!container) return;

    // 2. ОТРИСОВКА ОСТАЛЬНЫХ НАСТРОЕК
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
        
        <div class="version-info" style="margin-top: 30px; font-size: 10px; opacity: 0.5; color: #fff; text-align: center;">Версия 1.0.4</div>
    `;

    // 3. Обработчики кнопок
    const soundBtn = document.getElementById('toggle-sound');
    if (soundBtn) {
        soundBtn.onclick = () => {
            settings.sound = !settings.sound;
            localStorage.setItem('sound', settings.sound ? 'on' : 'off');
            const statusEl = soundBtn.querySelector('.status');
            statusEl.innerText = settings.sound ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings.sound ? '#4ec0ca' : '#ff4f4f';
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
    
    // Ссылки
    const openLink = (url) => {
        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    document.getElementById('btn-channel').onclick = () => openLink('https://t.me/ТВОЙ_КАНАЛ');
    document.getElementById('btn-support').onclick = () => openLink('https://t.me/ТВОЙ_КОНТАКТ');
}
