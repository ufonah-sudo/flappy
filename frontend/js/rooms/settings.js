import * as api from '../../api.js';

export function initSettings() {
    const container = document.querySelector('#scene-settings #settings-content');
    if (!container) return;

    const settings = {
        sound: localStorage.getItem('sound') !== 'off',
        music: localStorage.getItem('music') !== 'off'
    };

    // 1. HTML: Добавили красную кнопку #btn-disconnect-ton (скрытую по умолчанию)
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; width: 100%; height: 100%; justify-content: flex-start; padding-top: 10px;">
            
            <!-- БЛОК КОШЕЛЬКА -->
            <div style="width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 25px;">
                
                <!-- 1. Синяя кнопка (TON Connect) -->
                <div id="settings-wallet-root-unique" style="width: 100%; display: flex; justify-content: center; min-height: 50px;"></div>

                <!-- 2. Запасная кнопка "Connect" (если синяя сломалась) -->
                <button id="manual-wallet-btn" style="display: none; background: #0098EA; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; font-size: 15px; cursor: pointer; margin-top: 10px;">
                    💎 Connect Wallet
                </button>

                <!-- 3. Кнопка ОТКЛЮЧИТЬ (Появляется только если подключен) -->
                <button id="btn-disconnect-ton" style="
                    display: none; /* Скрыта */
                    margin-top: 15px;
                    background: transparent;
                    border: 1px solid #ff4f4f;
                    color: #ff4f4f;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 900;
                    cursor: pointer;
                    text-transform: uppercase;
                ">
                    ❌ ОТКЛЮЧИТЬ КОШЕЛЕК
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
                v1.1.1
            </div>
        </div>
    `;

    // 2. ФУНКЦИЯ ОБНОВЛЕНИЯ СТАТУСА (Показать/Скрыть кнопки)
    const updateWalletState = () => {
        const discBtn = document.getElementById('btn-disconnect-ton');
        const manualBtn = document.getElementById('manual-wallet-btn');
        const root = document.getElementById('settings-wallet-root-unique');

        if (!window.wallet || !discBtn) return;

        if (window.wallet.isConnected) {
            // Если подключен: Показываем "Отключить", скрываем "Manual"
            discBtn.style.display = 'block';
            if (manualBtn) manualBtn.style.display = 'none';
        } else {
            // Если отключен: Скрываем "Отключить"
            discBtn.style.display = 'none';
        }
    };

    // 3. ОТРИСОВКА И ПОДПИСКА НА СОБЫТИЯ
    const attemptRender = (retries = 0) => {
        if (window.wallet && window.wallet.tonConnectUI) {
            try {
                // Рисуем основную кнопку
                window.wallet.tonConnectUI.setConnectButtonRoot('settings-wallet-root-unique');
                
                // Обновляем состояние кнопок
                updateWalletState();
                
                // Подписываемся на изменения (чтобы кнопка "Отключить" появлялась/исчезала сама)
                // Важно: отписываемся от старых, чтобы не дублировать (упрощенно)
                window.wallet.tonConnectUI.onStatusChange(() => {
                    updateWalletState();
                });

            } catch (e) {
                console.warn("TON UI Error:", e);
                document.getElementById('manual-wallet-btn').style.display = 'block';
            }
        } else {
            if (retries < 10) setTimeout(() => attemptRender(retries + 1), 200);
            else document.getElementById('manual-wallet-btn').style.display = 'block';
        }
    };
    attemptRender();

    // 4. ОБРАБОТЧИК КНОПКИ "ОТКЛЮЧИТЬ"
    const discBtn = document.getElementById('btn-disconnect-ton');
    if (discBtn) {
        discBtn.onclick = async () => {
            if (window.wallet) {
                await window.wallet.disconnect();
                // Принудительно обновляем UI
                updateWalletState();
                // Перезагружаем страницу для чистоты (опционально, но надежно)
                // window.location.reload(); 
            }
        };
    }

    // Обработчик Manual Connect
    const manualBtn = document.getElementById('manual-wallet-btn');
    if (manualBtn) {
        manualBtn.onclick = () => window.wallet?.tonConnectUI?.openModal();
    }

    // 5. ОСТАЛЬНЫЕ КНОПКИ (Звук, Музыка...)
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