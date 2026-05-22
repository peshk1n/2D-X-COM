// Глобальный экземпляр аудио менеджера
class AudioManagerClass {
    constructor() {
        this.music = null;
        this.isMuted = false;
        this.currentScene = null;
        this.isInitialized = false;
    }

    init(scene, musicKey, config = {}) {
        this.currentScene = scene;
        
        if (!this.isInitialized) {
            // Создаём музыку только один раз
            if (scene.cache.audio.exists(musicKey)) {
                this.music = scene.sound.add(musicKey, {
                    volume: config.volume || 0.5,
                    loop: true,
                    mute: this.isMuted
                });
                this.isInitialized = true;
            }
        }
        
        // Загружаем сохранённое состояние
        this.loadSavedState();
    }

    playMusic() {
        if (this.music && !this.music.isPlaying) {
            this.music.play();
        }
    }

    stopMusic() {
        if (this.music && this.music.isPlaying) {
            this.music.stop();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.music) {
            this.music.setMute(this.isMuted);
        }
        if (this.currentScene) {
            this.currentScene.sound.setMute(this.isMuted);
        }
        localStorage.setItem('musicMuted', this.isMuted);
        return this.isMuted;
    }

    setVolume(volume) {
        if (this.music) {
            this.music.setVolume(volume);
        }
    }

    loadSavedState() {
        const savedMute = localStorage.getItem('musicMuted');
        if (savedMute !== null) {
            this.isMuted = savedMute === 'true';
            if (this.music) {
                this.music.setMute(this.isMuted);
            }
            if (this.currentScene) {
                this.currentScene.sound.setMute(this.isMuted);
            }
        }
    }
}

export const AudioManager = new AudioManagerClass();