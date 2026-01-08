import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    
    if (!container) return;

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // 1. РИСУЕМ ИНТЕРФЕЙС (ТЕПЕРЬ С ПРАВИЛЬНОЙ HTML СТРУКТУРОЙ)
    container.innerHTML = `
        <!-- Секция Кошелька -->
        <div style="width: 100%; margin-bottom: 20px;">
            <h4 style="color: #f7d51d; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; text-shadow: 1px 1px 0 #000;">
                💎 КОШЕЛЕК
            </h4>
            
            <!-- 👇 ВАЖНО: Именно в этот DIV скрипт вставит кнопку 👇 -->
            <div id="dynamic-wallet-root" style="width: 100%; display: flex; justify-content: center; min-height: 50px;">
                <!-- Тут появится кнопка -->
            </div>
            
            <p style="font-size: 10px; color: #aaa; margin-top: 5px; text-align: center;">
                Подключи TON Wallet для покупок и вывода
            </p>
        </div>

        <!-- Секция Аудио -->
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

        <!-- Секция Инфо -->
        <div class="settings-group info-section" style="margin-top: 25px; width: 100%; display: flex; flex-direction: column; gap: 10px;">
            <button id="btn-channel" class="secondary-btn" style="width: 100%;">📢 НАШ КАНАЛ</button>
            <button id="btn-support" class="secondary-btn" style="width: 100%;">🆘 ПОДДЕРЖКА</button>
        </div>
        
        <div class="version-info" style="margin-top: 30px; font-size: 10px; opacity: 0.5; color: #fff; text-align: center;">
            Версия 1.0.6
        </div>
    `;

    // 2. ЛОГИКА ВСТАВКИ КНОПКИ (С задержкой для надежности)
    setTimeout(() => {
        // Проверяем, загружен ли модуль кошелька
        if (window.wallet && window.wallet.tonConnectUI) {
            console.log("Попытка отрисовки кошелька в настройках...");
            try {
                // ПРИНУДИТЕЛЬНО переносим кнопку в наш новый контейнер
                window.wallet.tonConnectUI.setConnectButtonRoot('dynamic-wallet-root');
            } catch (e) {
                console.error("Ошибка привязки кошелька:", e);
            }
        } else {
            console.warn("Модуль window.wallet не найден");
        }
    }, 100);

    // 3. ОБРАБОТЧИКИ КНОПОК
    
    // Звук
    const soundBtn = document.getElementById('toggle-sound');
    if (soundBtn) {
        soundBtn.onclick = () => {
            settings.sound = !settings.sound;
            localStorage.setItem('sound', settings.sound ? 'on' : 'off');
            const st = soundBtn.querySelector('.status');
            st.innerText = settings.sound ? 'ВКЛ' : 'ВЫКЛ';
            st.style.color = settings.sound ? '#4ec0ca' : '#ff4f4f';
        };
    }

    // Музыка
    const musicBtn = document.getElementById('toggle-music');
    if (musicBtn) {
        musicBtn.onclick = () => {
            settings.music = !settings.music;
            localStorage.setItem('music', settings.music ? 'on' : 'off');
            const st = musicBtn.querySelector('.status');
            st.innerText = settings.music ? 'ВКЛ' : 'ВЫКЛ';
            st.style.color = settings.music ? '#4ec0ca' : '#ff4f4f';
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

    const btnChannel = document.getElementById('btn-channel');
    if (btnChannel) btnChannel.onclick = () => openLink('https://t.me/твой_канал');

    const btnSupport = document.getElementById('btn-support');
    if (btnSupport) btnSupport.onclick = () => openLink('https://t.me/твой_саппорт');
}
