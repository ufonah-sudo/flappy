import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    
    if (!container) return;

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // 1. HTML СТРУКТУРА
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; justify-content: flex-start; padding-top: 10px;">
            
            <!-- МЕСТО ДЛЯ КНОПКИ -->
            <div style="width: 100%; display: flex; justify-content: center; margin-bottom: 25px; min-height: 50px; position: relative;">
                
                <!-- 1. Сюда встанет Оригинальная кнопка -->
                <div id="settings-wallet-root-unique"></div>

                <!-- 2. Запасная кнопка (на случай, если оригинал не прогрузится) -->
                <!-- Стиль точь-в-точь как у TON Connect (Синий овал) -->
                <button id="manual-wallet-btn" style="
                    display: none; /* Скрыта по умолчанию */
                    background-color: #0098EA; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 20px; 
                    font-weight: 600; 
                    font-size: 15px; 
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0, 152, 234, 0.3);
                    align-items: center;
                    gap: 8px;
                ">
                    💎 Connect Wallet
                </button>
            </div>

            <!-- ПЕРЕКЛЮЧАТЕЛИ -->
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

            <!-- ССЫЛКИ -->
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="btn-channel" class="secondary-btn" style="flex: 1; font-size: 12px; padding: 12px;">📢 КАНАЛ</button>
                <button id="btn-support" class="secondary-btn" style="flex: 1; font-size: 12px; padding: 12px;">🆘 ПОМОЩЬ</button>
            </div>
            
            <div class="version-info" style="margin-top: auto; padding-bottom: 10px; font-size: 10px; opacity: 0.4; color: #fff; text-align: center;">
                v1.1.0
            </div>
        </div>
    `;

    // 2. УМНАЯ ЛОГИКА ОТРИСОВКИ КОШЕЛЬКА
    const attemptRender = (retries = 0) => {
        const root = document.getElementById('settings-wallet-root-unique');
        const manualBtn = document.getElementById('manual-wallet-btn');
        
        // Если контейнера уже нет (ушли со страницы), стоп
        if (!root) return;

        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                // Пробуем нарисовать родную кнопку
                window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
                if (manualBtn) manualBtn.style.display = 'none'; // Скрываем запасную
                console.log("Кнопка TON отрисована успешно.");
            } catch (e) {
                console.warn("Ошибка TON UI, включаем запасную кнопку:", e);
                if (manualBtn) manualBtn.style.display = 'flex';
            }
        } else {
            // Если кошелек еще не загрузился...
            if (retries < 10) {
                // ...ждем еще 200мс и пробуем снова (до 10 раз)
                setTimeout(() => attemptRender(retries + 1), 200);
            } else {
                // ...если совсем не грузится, показываем запасную кнопку
                console.warn("TON не загрузился, показываем Manual Button");
                if (manualBtn) manualBtn.style.display = 'flex';
            }
        }
    };

    // Запускаем попытки
    attemptRender();

    // Логика нажатия на ЗАПАСНУЮ кнопку
    const manualBtn = document.getElementById('manual-wallet-btn');
    if (manualBtn) {
        manualBtn.onclick = () => {
            if (window.wallet && window.wallet.tonConnectUI) {
                window.wallet.tonConnectUI.openModal();
            } else {
                alert("Кошелек загружается... Попробуй через пару секунд.");
            }
        };
    }

    // 3. ОБРАБОТЧИКИ ОСТАЛЬНЫХ КНОПОК
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
