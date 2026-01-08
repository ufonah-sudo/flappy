import * as api from '../../api.js';

export function initSettings() {
    // 1. Ищем контейнер настроек
    const container = document.querySelector('#scene-settings #settings-content');
    if (!container) {
        console.error("Контейнер настроек не найден!");
        return;
    }

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // 2. ВСТАВЛЯЕМ HTML С ЯВНЫМ МЕСТОМ ПОД КНОПКУ
    container.innerHTML = `
        <!-- ЗАГОЛОВОК -->
        <h4 style="color: #f7d51d; margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; text-shadow: 1px 1px 0 #000; text-align: center;">
            💎 УПРАВЛЕНИЕ КОШЕЛЬКОМ
        </h4>

        <!-- ГЛАВНОЕ: КОНТЕЙНЕР ДЛЯ СИНЕЙ КНОПКИ -->
        <!-- width: fit-content центрирует саму кнопку -->
        <div id="settings-wallet-root-unique" style="width: 100%; display: flex; justify-content: center; min-height: 50px; margin-bottom: 20px;">
            <!-- СЮДА СКРИПТ ВСТАВИТ КНОПКУ -->
        </div>

        <!-- РЕЗЕРВНАЯ КНОПКА (Если синяя не появится) -->
        <button id="manual-connect-btn" class="wooden-btn" style="display: none; margin-bottom: 20px; background: #0098ea; border-color: #0077b5;">
            CONNECT TON WALLET
        </button>

        <!-- ПЕРЕКЛЮЧАТЕЛИ -->
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

        <!-- ИНФО -->
        <div class="settings-group info-section" style="margin-top: 25px; width: 100%; display: flex; flex-direction: column; gap: 10px;">
            <button id="btn-channel" class="secondary-btn" style="width: 100%;">📢 НАШ КАНАЛ</button>
            <button id="btn-support" class="secondary-btn" style="width: 100%;">🆘 ПОДДЕРЖКА</button>
        </div>
        
        <div class="version-info" style="margin-top: 30px; font-size: 10px; opacity: 0.5; color: #fff; text-align: center;">v1.0.7</div>
    `;

    // 3. ЛОГИКА ОТРИСОВКИ КОШЕЛЬКА
    setTimeout(() => {
        const rootId = 'settings-wallet-root-unique';
        const rootEl = document.getElementById(rootId);
        const manualBtn = document.getElementById('manual-connect-btn');

        if (window.wallet && window.wallet.tonConnectUI && rootEl) {
            console.log("Пытаемся нарисовать кнопку TON...");
            
            try {
                // ПРИНУДИТЕЛЬНО СТАВИМ КНОПКУ СЮДА
                window.wallet.tonConnectUI.setConnectButtonRoot(rootId);
                
                // Проверяем, появилась ли кнопка через 0.5 сек. Если нет — покажем свою.
                setTimeout(() => {
                    if (rootEl.childNodes.length === 0) {
                        console.warn("Синяя кнопка не отрисовалась, показываем резервную.");
                        if (manualBtn) manualBtn.style.display = 'block';
                    }
                }, 500);

            } catch (e) {
                console.error("Ошибка библиотеки TON:", e);
                if (manualBtn) manualBtn.style.display = 'block';
            }
        } else {
            // Если библиотеки нет, показываем резервную кнопку
            if (manualBtn) manualBtn.style.display = 'block';
        }

        // Логика резервной кнопки
        if (manualBtn) {
            manualBtn.onclick = () => {
                if (window.wallet && window.wallet.tonConnectUI) {
                    window.wallet.tonConnectUI.openModal();
                } else {
                    alert("Библиотека TON не загружена!");
                }
            };
        }
    }, 100);

    // 4. ОБРАБОТЧИКИ ОСТАЛЬНЫХ КНОПОК
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
