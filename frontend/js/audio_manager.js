// frontend/js/audio_manager.js
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.currentMusicVolume = 0.3; // Громкость музыки (0.0 - 1.0)
        this.currentSoundVolume = 0.7; // Громкость звуков
        this.isMusicPlaying = false;

        // Загружаем настройки из localStorage
        this.soundEnabled = localStorage.getItem('sound') !== 'off';
        this.musicEnabled = localStorage.getItem('music') !== 'off';

        this.loadSounds();
        this.initMusic();
    }

    // Загрузка всех звуковых файлов
    loadSounds() {
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

        for (const key in soundFiles) {
            this.sounds[key] = new Audio(`/frontend/assets/audio/${soundFiles[key]}`);
            this.sounds[key].volume = this.currentSoundVolume;
        }
    }

    // Инициализация фоновой музыки
    initMusic() {
        this.music = new Audio('/frontend/assets/audio/bg_music.mp3');
        this.music.loop = true; // Зацикливаем
        this.music.volume = this.currentMusicVolume;
        // Запускаем музыку, если она включена в настройках
        if (this.musicEnabled) {
            this.playMusic();
        }
    }

    // Проигрывание звукового эффекта
    playSound(key) {
        if (!this.soundEnabled || !this.sounds[key]) return;
        // Клонируем, чтобы звуки могли накладываться
        const sound = this.sounds[key].cloneNode();
        sound.volume = this.currentSoundVolume;
        sound.play().catch(e => console.warn("Audio play failed:", key, e));
    }

    // Запуск/продолжение музыки
    playMusic() {
        if (!this.musicEnabled || this.isMusicPlaying) return;
        this.music.play().then(() => {
            this.isMusicPlaying = true;
        }).catch(e => console.warn("Music play failed:", e));
    }

    // Пауза музыки
    pauseMusic() {
        if (this.isMusicPlaying) {
            this.music.pause();
            this.isMusicPlaying = false;
        }
    }

    // Обновление состояния аудио (из настроек)
    updateAudioSettings() {
        this.soundEnabled = localStorage.getItem('sound') !== 'off';
        this.musicEnabled = localStorage.getItem('music') !== 'off';

        if (this.musicEnabled) {
            this.playMusic();
        } else {
            this.pauseMusic();
        }
    }
}
