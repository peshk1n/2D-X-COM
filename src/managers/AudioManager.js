class AudioManagerClass {
    constructor() {
        this.music = null;
        this.isMuted = false;
        this.volume = 0.5;
        this.currentScene = null;
        this.isInitialized = false;
    }

    init(scene, musicKey, config = {}) {
        this.currentScene = scene;
        // Загружаем сохранённое состояние до создания музыки, чтобы объект
        // сразу создавался с правильными volume/mute
        this.loadSavedState();

        if (!this.isInitialized) {
            if (scene.cache.audio.exists(musicKey)) {
                this.music = scene.sound.add(musicKey, {
                    volume: this.volume,
                    loop: true,
                    mute: this.isMuted
                });
                this.isInitialized = true;
            }
        }
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

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.isMuted = this.volume === 0;
        if (this.music) {
            this.music.setVolume(this.volume);
            this.music.setMute(this.isMuted);
        }
        if (this.currentScene) {
            this.currentScene.sound.setMute(this.isMuted);
        }
        localStorage.setItem('musicVolume', this.volume);
        localStorage.setItem('musicMuted', this.isMuted);
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

    loadSavedState() {
        const savedVolume = localStorage.getItem('musicVolume');
        const savedMute = localStorage.getItem('musicMuted');

        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
            this.isMuted = this.volume === 0;
        } else if (savedMute !== null) {
            this.isMuted = savedMute === 'true';
            if (this.isMuted) this.volume = 0;
        }

        if (this.music) {
            this.music.setVolume(this.volume);
            this.music.setMute(this.isMuted);
        }
        if (this.currentScene) {
            this.currentScene.sound.setMute(this.isMuted);
        }
    }
}

export const AudioManager = new AudioManagerClass();
