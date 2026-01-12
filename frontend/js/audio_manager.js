/**
 * js/audio_manager.js - OPTIMIZED FOR IOS/ANDROID (WEB AUDIO API)
 */
export class AudioManager {
    constructor() {
        // Создаем аудио-контекст (стандарт для игр)
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffers = {}; // Здесь будем хранить декодированные звуки
        this.music = null;
        
        this.currentMusicVolume = 0.3;
        this.currentSoundVolume = 0.7;

        this.soundEnabled = localStorage.getItem('sound') !== 'off';
        this.musicEnabled = localStorage.getItem('music') !== 'off';

        this.loadAll();
    }

    async loadAll() {
        const soundFiles = {
            flap: 'flap.mp3',
            point: 'point.mp3',
            hit: 'hit.mp3',
            die: 'die.mp3',
            swoosh: 'swoosh.mp3',
            coin: 'coin.mp3',
            powerup_grab: 'powerup_grab.mp3',
            button_click: 'button_click.mp3',
            chest_open: 'chest_open.mp3',
            purchase: 'purchase.mp3'
        };

        // Загружаем и декодируем все звуки сразу в память
        for (const [key, fileName] of Object.entries(soundFiles)) {
            try {
                const response = await fetch(`/frontend/assets/audio/${fileName}`);
                const arrayBuffer = await response.arrayBuffer();
                this.buffers[key] = await this.ctx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.error(`Ошибка загрузки звука ${key}:`, e);
            }
        }

        // Музыку оставляем обычным Audio-тегом, так как это длинный стрим
        this.initMusic();
    }

    initMusic() {
        this.music = new Audio('/frontend/assets/audio/bg_music.mp3');
        this.music.loop = true;
        this.music.volume = this.currentMusicVolume;
        if (this.musicEnabled) this.playMusic();
    }

    /**
     * ПРОИГРЫВАНИЕ ЭФФЕКТА (БЕЗ ЛАГОВ)
     */
    playSound(key) {
        if (!this.soundEnabled || !this.buffers[key]) return;

        // На iOS контекст часто "спит", пока пользователь не тапнет по экрану
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Создаем виртуальный источник звука (BufferSource)
        // Это "одноразовый" легкий объект, который не нагружает память
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[key];

        // Узел громкости
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = this.currentSoundVolume;

        // Соединяем: Источник -> Громкость -> Динамики
        source.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        source.start(0);
    }

    playMusic() {
        if (!this.musicEnabled) return;
        this.music.play().catch(() => {
            // iOS блокирует автоплей музыки до первого взаимодействия
            const resumeOnAction = () => {
                this.music.play();
                this.ctx.resume();
                window.removeEventListener('touchstart', resumeOnAction);
            };
            window.addEventListener('touchstart', resumeOnAction);
        });
    }

    pauseMusic() {
        if (this.music) this.music.pause();
    }

    updateAudioSettings() {
        this.soundEnabled = localStorage.getItem('sound') !== 'off';
        this.musicEnabled = localStorage.getItem('music') !== 'off';

        if (this.musicEnabled) this.playMusic();
        else this.pauseMusic();
    }
}