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
        
        const soundBtnText = AudioManager.isMuted ? '🔇 Включить звук' : '🔊 Выключить звук';
        this.createButton(640, 400, soundBtnText, () => {
            AudioManager.toggleMute();
            const buttonText = this.children.list.find(child => 
                child.type === 'Text' && (child.text.includes('Звук') || child.text.includes('🔇') || child.text.includes('🔊'))
            );
            if (buttonText) {
                buttonText.setText(AudioManager.isMuted ? '🔇 Включить звук' : '🔊 Выключить звук');
            }
        });
        
        this.createButton(640, 500, 'Выход', () => this.exitGame());
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