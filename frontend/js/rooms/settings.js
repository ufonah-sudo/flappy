// Импорт API (путь исправлен на два уровня вверх)
import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings .settings-options');
    if (!container) {
        console.warn("[Settings] Контейнер .settings-options не найден");
        return;
    }

    // Загружаем текущие настройки
    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    container.innerHTML = `
        <div class="settings-group">
            <button id="toggle-sound" class="settings-btn">
                Звуковые эффекты: <span>${settings.sound ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
            <button id="toggle-music" class="settings-btn">
                Музыка: <span>${settings.music ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
        </div>

        <div class="settings-group wallet-section">
            <h4>Кошелек TON</h4>
            <div id="settings-ton-button"></div>
            <p class="hint">Подключите кошелек для вывода наград</p>
        </div>

        <div class="settings-group info-section">
            <button id="btn-channel" class="settings-btn secondary">
                📢 Наш канал
            </button>
            <button id="btn-support" class="settings-btn secondary">
                🆘 Поддержка
            </button>
        </div>
        
        <div class="version-info" style="margin-top: 20px; font-size: 10px; opacity: 0.5;">Версия 1.0.2</div>
    `;

    // 1. Инициализация кнопки TON Connect
    const walletContainer = document.getElementById('settings-ton-button');
    if (window.wallet && walletContainer) {
        walletContainer.innerHTML = ''; // Очищаем перед рендером
        window.wallet.renderButton('settings-ton-button');
    }

    // 2. Логика переключения звука
    const soundBtn = document.getElementById('toggle-sound');
    if (soundBtn) {
        soundBtn.onclick = () => {
            settings.sound = !settings.sound;
            localStorage.setItem('sound', settings.sound ? 'on' : 'off');
            soundBtn.querySelector('span').innerText = settings.sound ? 'ВКЛ' : 'ВЫКЛ';
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        };
    }

    // 3. Логика переключения музыки
    const musicBtn = document.getElementById('toggle-music');
    if (musicBtn) {
        musicBtn.onclick = () => {
            settings.music = !settings.music;
            localStorage.setItem('music', settings.music ? 'on' : 'off');
            musicBtn.querySelector('span').innerText = settings.music ? 'ВКЛ' : 'ВЫКЛ';
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        };
    }

    // 4. Кнопки ссылок
    const openLink = (url) => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    const chanBtn = document.getElementById('btn-channel');
    if (chanBtn) chanBtn.onclick = () => openLink('https://t.me/ваша_ссылка');

    const suppBtn = document.getElementById('btn-support');
    if (suppBtn) suppBtn.onclick = () => openLink('https://t.me/ваша_поддержка');
}