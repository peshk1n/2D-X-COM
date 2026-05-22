import Phaser from 'phaser';
import { MainMenu } from './scenes/MainMenu.js';
import { MainScene } from './scenes/MainScene.js';
import { PauseMenu } from './scenes/PauseMenu.js';

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game',
    backgroundColor: '#0f172a',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainMenu, MainScene, PauseMenu],
    audio: {
        disableWebAudio: false,
        noAudio: false
    }
};

const game = new Phaser.Game(config);

console.log('Игра запущена');