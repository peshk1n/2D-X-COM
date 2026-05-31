import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';

export class PauseMenu extends Phaser.Scene {
    constructor() {
        super('PauseMenu');
    }

    create(data) {
        console.log('PauseMenu создан');

        const { mainScene } = data;
        this.mainScene = mainScene;

        const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.8);
        overlay.setInteractive();

        const menuBg = this.add.rectangle(640, 360, 400, 400, 0x1a1a2e);
        menuBg.setStrokeStyle(3, 0xff0000);

        const title = this.add.text(640, 200, 'ПАУЗА', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            color: '#ffffff',
            stroke: '#ff0000',
            strokeThickness: 4
        }).setOrigin(0.5);

        const resumeBtn = this.add.text(640, 300, 'Продолжить', {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#4a4a6a',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.createVolumeSlider(640, 385, 180);

        const menuBtn = this.add.text(640, 465, 'В главное меню', {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#4a4a6a',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        resumeBtn.on('pointerdown', () => {
            console.log('Продолжить игру');
            this.scene.stop('PauseMenu');
            this.mainScene.resumeGame();
        });

        menuBtn.on('pointerdown', () => {
            console.log('Выход в главное меню');
            this.scene.stop('PauseMenu');
            this.scene.stop('MainScene');
            this.scene.start('MainMenu');
        });

        [resumeBtn, menuBtn].forEach(btn => {
            btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#6a6a8a' }));
            btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#4a4a6a' }));
        });

        this.input.keyboard.on('keydown-ESC', () => {
            console.log('ESC в меню паузы');
            this.scene.stop('PauseMenu');
            this.mainScene.resumeGame();
        });
    }

    createVolumeSlider(cx, cy, trackWidth) {
        const left = cx - trackWidth / 2;
        const right = cx + trackWidth / 2;
        const vol0 = AudioManager.volume;

        this.add.rectangle(cx, cy, trackWidth + 110, 52, 0x4a4a6a)
            .setStrokeStyle(2, 0x888888);

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
}
