import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    preload() {
        this.load.audio('bgMusic', 'src/assets/music/background-music.mp3');
    }

    create() {
        console.log('MainMenu создан');

        this.cameras.main.setBackgroundColor('#1a1a2e');

        const title = this.add.text(640, 100, '2D-X-COM', {
            fontSize: '64px',
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#ff0000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.tweens.add({
            targets: title,
            y: '+=10',
            duration: 1500,
            yoyo: true,
            repeat: -1
        });

        AudioManager.init(this, 'bgMusic', { volume: 0.5 });
        AudioManager.playMusic();

        this.createButtons();
    }

    createButtons() {
        this.createButton(640, 300, 'Начать игру', () => this.startGame());
        this.createVolumeSlider(640, 400, 180);
        this.createButton(640, 500, 'Выход', () => this.exitGame());
    }

    createVolumeSlider(cx, cy, trackWidth) {
        const left = cx - trackWidth / 2;
        const right = cx + trackWidth / 2;
        const vol0 = AudioManager.volume;

        this.add.rectangle(cx, cy, trackWidth + 120, 60, 0x4a4a6a)
            .setStrokeStyle(2, 0xffffff);

        const icon = this.add.text(left - 28, cy, vol0 > 0 ? '🔊' : '🔇', {
            fontSize: '20px',
            padding: { top: 6 }
        }).setOrigin(0.5);

        this.add.rectangle(cx, cy, trackWidth, 6, 0x333355);

        const fw0 = Math.max(vol0 * trackWidth, 1);
        const fill = this.add.rectangle(left + fw0 / 2, cy, fw0, 6, 0x7777ff);

        const handle = this.add.circle(left + vol0 * trackWidth, cy, 10, 0xffffff);
        handle.setInteractive({ useHandCursor: true });

        const pct = this.add.text(right + 30, cy, `${Math.round(vol0 * 100)}%`, {
            fontSize: '18px', color: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(cx, cy, trackWidth, 26, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });

        const apply = (nx) => {
            const x = Math.max(left, Math.min(right, nx));
            const v = (x - left) / trackWidth;
            handle.setX(x);
            const fw = Math.max(v * trackWidth, 1);
            fill.setX(left + fw / 2);
            fill.setSize(fw, 6);
            pct.setText(`${Math.round(v * 100)}%`);
            icon.setText(v > 0 ? '🔊' : '🔇');
            AudioManager.setVolume(v);
        };

        let dragging = false;
        handle.on('pointerdown', () => { dragging = true; });
        hitArea.on('pointerdown', (ptr) => { apply(ptr.x); dragging = true; });
        this.input.on('pointermove', (ptr) => { if (dragging) apply(ptr.x); });
        this.input.on('pointerup', () => { dragging = false; });
    }

    createButton(x, y, text, callback) {
        const buttonBg = this.add.rectangle(x, y, 300, 60, 0x4a4a6a);
        buttonBg.setStrokeStyle(2, 0xffffff);
        buttonBg.setInteractive({ useHandCursor: true });

        const buttonText = this.add.text(x, y, text, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        buttonBg.on('pointerover', () => {
            buttonBg.setFillStyle(0x6a6a8a);
            buttonBg.setScale(1.05);
            buttonText.setScale(1.05);
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setFillStyle(0x4a4a6a);
            buttonBg.setScale(1);
            buttonText.setScale(1);
        });

        buttonBg.on('pointerdown', () => {
            buttonBg.setFillStyle(0x3a3a5a);
            callback();
        });
    }

    startGame() {
        this.cameras.main.fadeOut(500);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MainScene');
        });
    }

    exitGame() {
        const confirmed = confirm('Вы уверены, что хотите выйти?');
        if (confirmed) {
            window.close();
            alert('Для выхода закройте вкладку браузера');
        }
    }
}
