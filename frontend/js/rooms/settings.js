import { WalletManager } from '../wallet.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings .settings-options');
    if (!container) return;

    // Загружаем текущие настройки или ставим по умолчанию
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
            <h4>Кошелек</h4>
            <div id="settings-ton-connect"></div>
            <p class="hint">Подключите кошелек для покупки монет и вывода наград</p>
        </div>

        <div class="settings-group info-section">
            <button class="settings-btn secondary" onclick="window.open('https://t.me/your_channel', '_blank')">
                📢 Наш канал
            }
            </button>
            <button class="settings-btn secondary" onclick="window.Telegram.WebApp.openTelegramLink('https://t.me/your_support')">
                🆘 Поддержка
            </button>
        </div>
    `;

    // Логика переключения звука
    document.getElementById('toggle-sound').onclick = (e) => {
        settings.sound = !settings.sound;
        localStorage.setItem('sound', settings.sound ? 'on' : 'off');
        e.currentTarget.querySelector('span').innerText = settings.sound ? 'ВКЛ' : 'ВЫКЛ';
    };

    // Логика переключения музыки
    document.getElementById('toggle-music').onclick = (e) => {
        settings.music = !settings.music;
        localStorage.setItem('music', settings.music ? 'on' : 'off');
        e.currentTarget.querySelector('span').innerText = settings.music ? 'ВКЛ' : 'ВЫКЛ';
    };
}