// Импорт API (путь исправлен на два уровня вверх)
import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    if (!container) {
        console.warn("[Settings] Контейнер #settings-content не найден");
        return;
    }

    // Загружаем текущие настройки (безопасное получение)
    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    container.innerHTML = `
        <div class="settings-group" style="width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 10px;">
            <button id="toggle-sound" class="settings-btn" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; cursor: pointer;">
                <span>🔊 Звуковые эффекты</span>
                <span class="status" style="font-weight: bold; color: ${settings.sound ? '#4ec0ca' : '#ff4f4f'}">
                    ${settings.sound ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
            </button>
            <button id="toggle-music" class="settings-btn" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; cursor: pointer;">
                <span>🎵 Музыка</span>
                <span class="status" style="font-weight: bold; color: ${settings.music ? '#4ec0ca' : '#ff4f4f'}">
                    ${settings.music ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
            </button>
        </div>

        <div class="settings-group wallet-section" style="margin-top: 25px; width: 100%; max-width: 400px;">
            <h4 style="font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 10px; text-align: left;">Кошелек TON</h4>
            <div id="settings-ton-wallet" style="min-height: 44px; display: flex; justify-content: center;"></div>
            <p class="hint" style="font-size: 11px; color: #666; margin-top: 8px;">Подключите кошелек для вывода наград</p>
        </div>

        <div class="settings-group info-section" style="margin-top: 25px; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 10px;">
            <button id="btn-channel" class="secondary-btn" style="padding: 12px; font-size: 14px;">📢 Наш канал</button>
            <button id="btn-support" class="secondary-btn" style="padding: 12px; font-size: 14px;">🆘 Поддержка</button>
        </div>
        
        <div class="version-info" style="margin-top: 30px; font-size: 10px; opacity: 0.3;">Версия 1.0.2</div>
    `;

    // 1. Кошелек (Кнопка отрендерится автоматически через логику в main.js showRoom)
    // Но на случай прямой инициализации оставляем вызов:
    if (window.wallet && window.wallet.tonConnectUI) {
        window.wallet.tonConnectUI.setConnectButtonRoot('#settings-ton-wallet');
    }

    // 2. Логика переключения звука
    const soundBtn = document.getElementById('toggle-sound');
    if (soundBtn) {
        soundBtn.onclick = () => {
            settings.sound = !settings.sound;
            localStorage.setItem('sound', settings.sound ? 'on' : 'off');
            const statusEl = soundBtn.querySelector('.status');
            statusEl.innerText = settings.sound ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings.sound ? '#4ec0ca' : '#ff4f4f';
            
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
            const statusEl = musicBtn.querySelector('.status');
            statusEl.innerText = settings.music ? 'ВКЛ' : 'ВЫКЛ';
            statusEl.style.color = settings.music ? '#4ec0ca' : '#ff4f4f';
            
            // Здесь можно добавить вызов: if (window.game) window.game.updateMusic();
            
            if (window.Telegram?.WebApp?.HapticFeedback) {
                window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        };
    }

    // 4. Ссылки
    const openLink = (url) => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

    document.getElementById('btn-channel').onclick = () => openLink('https://t.me/your_channel');
    document.getElementById('btn-support').onclick = () => openLink('https://t.me/your_support');
}