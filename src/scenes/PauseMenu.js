import Phaser from 'phaser';
import { AudioManager } from '../managers/AudioManager.js';

export class PauseMenu extends Phaser.Scene {
    constructor() {
        super('PauseMenu');
        this.soundBtn = null;
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
        
        
        const soundText = AudioManager.isMuted ? '🔇 Включить звук' : '🔊 Выключить звук';
        const soundBtn = this.add.text(640, 380, soundText, {
            fontSize: '28px',
            color: '#ffffff',
            backgroundColor: '#4a4a6a',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        
        const menuBtn = this.add.text(640, 460, 'В главное меню', {
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
        
        soundBtn.on('pointerdown', () => {
            AudioManager.toggleMute();
            soundBtn.setText(AudioManager.isMuted ? '🔇 Включить звук' : '🔊 Выключить звук');
        });
        
        menuBtn.on('pointerdown', () => {
            console.log('Выход в главное меню');
            this.scene.stop('PauseMenu');
            this.scene.stop('MainScene');
            this.scene.start('MainMenu');
        });
        
        
        [resumeBtn, soundBtn, menuBtn].forEach(btn => {
            btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#6a6a8a' }));
            btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#4a4a6a' }));
        });
        
        
        this.input.keyboard.on('keydown-ESC', () => {
            console.log('ESC в меню паузы');
            this.scene.stop('PauseMenu');
            this.mainScene.resumeGame();
        });
        
        
        this.soundBtn = soundBtn;
    }
}