import Phaser from 'phaser';
import { InfoPanel } from '../ui/InfoPanel.js';
import { WorldBlackboard } from '../services/worldBlackboard.js';
import { SupportEnemyAI } from '../services/supportEnemyAI.js';
import { TilemapService } from '../services/tilemapService.js';
import { PathfindingService } from '../services/pathfindingService.js';
import { UnitManager } from '../managers/UnitManager.js';
import { CombatManager } from '../managers/CombatManager.js';
import { MovementManager } from '../managers/MovementManager.js';
import { TargetSelectionManager } from '../managers/TargetSelectionManager.js';
import { TurnManager } from '../managers/TurnManager.js';
import { UIManager } from '../managers/UIManager.js';
import tileset from '../assets/tileset.png';
import aling from '../assets/aling.png';
import { FogOfWar } from '../vfx/FogOfWar.js';
import { CombatVFX } from '../vfx/CombatVFX.js';
import { AIOrchestrator } from '../AI/AIOrchestrator.js';
import { AudioManager } from '../managers/AudioManager.js';
import { TILE_TYPES } from '../entities/Tile.js';
import { PickupService } from '../services/PickupService.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
        this.isPaused = false;
        this.pauseOverlay = null;
        this.pauseMenuContainer = null;
        this.escKey = null;
        this.pauseButton = null;
        this.pauseIcon = null;
    }

    init() {
        this.isPaused = false;
        this.gameOver = false;
        this.pauseOverlay = null;
        this.pauseMenuContainer = null;
    }

    create() {

        this.anims.create({
            key: 'aling_idle',

            frames: this.anims.generateFrameNumbers('aling', {
                start: 0,
                end: 5
            }),

            frameRate: 8,
            repeat: -1
        });

        this.cameras.main.setBackgroundColor('#0f172a');
        this.phase = 'player';
        this.selectedUnit = null;
        this.actionMode = null;
        this.highlightedTiles = [];
        this.highlightedTargets = [];
        this.rangeHighlights = [];

        this.createMap();
        this.createTextures();

        this.blackboard = new WorldBlackboard(this);
        this.unitManager = new UnitManager(this);
        this.combatManager = new CombatManager(this, this.unitManager);
        this.combatVFX = new CombatVFX(this);
        this.movementManager = new MovementManager(this);
        this.targetManager = new TargetSelectionManager(this);
        this.turnManager = new TurnManager(this, this.blackboard);
        this.uiManager = new UIManager(this);

        this.aiOrchestrator = new AIOrchestrator(this);

        this.unitManager.createUnits(this.tilemap);

        this.pickupService = new PickupService(this);
        this.pickupService.spawnPickups();

        this.supportAI = new SupportEnemyAI(this.unitManager, this.blackboard, this.aiOrchestrator);

        this.createUI();

        this.fogOfWar = new FogOfWar(this, this.tilemap, { visionRange: 7 });
        this.fogOfWar.render();

        this.fogOfWar.update(this.unitManager.playerUnits, this.unitManager.allUnits, this.selectedUnit);

        this.unitManager.playerUnits.forEach(u => u.resetActions());
        this.uiManager.updateHelpText();


        AudioManager.playMusic();


        this.createPauseButton();


        if (this.escKey) {
            this.escKey.destroy();
        }


        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);


        this.escKey.on('down', () => {
            console.log('ESC нажата');
            this.togglePause();
        });
    }

    createPauseButton() {

        if (this.pauseButton) {
            this.pauseButton.destroy();
        }
        if (this.pauseIcon) {
            this.pauseIcon.destroy();
        }


        this.pauseButton = this.add.rectangle(1250, 30, 40, 40, 0xffffff, 0.8)
            .setInteractive({ useHandCursor: true })
            .setDepth(1000);

        this.pauseIcon = this.add.text(1250, 30, '⏸', {
            fontSize: '28px',
            color: '#000000'
        }).setOrigin(0.5).setDepth(1000);

        this.pauseButton.on('pointerdown', () => {
            console.log('Кнопка паузы нажата');
            this.togglePause();
        });

        this.pauseButton.on('pointerover', () => this.pauseButton.setFillStyle(0xcccccc));
        this.pauseButton.on('pointerout', () => this.pauseButton.setFillStyle(0xffffff));
    }

    togglePause() {
        console.log('togglePause вызван, isPaused:', this.isPaused);

        if (!this.isPaused) {
            this.isPaused = true;
            this.scene.pause('MainScene');

            this.scene.launch('PauseMenu', {
                mainScene: this
            });
        }
    }

    resumeGame() {
        console.log('resumeGame вызван');
        this.isPaused = false;
        this.scene.resume('MainScene');
    }

    shutdown() {
        console.log('MainScene выгружается');

        if (this.escKey) {
            this.escKey.destroy();
            this.escKey = null;
        }

        if (this.pauseButton) {
            this.pauseButton.destroy();
            this.pauseButton = null;
        }
        if (this.pauseIcon) {
            this.pauseIcon.destroy();
            this.pauseIcon = null;
        }

        this.time.removeAllEvents();

        this.tweens.killAll();
    }

    preload() {
        this.load.spritesheet('tiles', tileset, { frameWidth: 40, frameHeight: 40 });
        this.load.spritesheet('aling', aling, {
            frameWidth: 184,
            frameHeight: 168
        });
    }

    createMap() {
        this.tilemap = new TilemapService(this, {
            tileSize: 40, cols: 32, rows: 18, offsetX: 0, offsetY: 0,
        });
        this.tilemap.generate().render();
        this.pathfinder = new PathfindingService(this.tilemap.getTileMap(), this.tilemap.COLS, this.tilemap.ROWS);
    }

    createTextures() {
        const g = this.add.graphics();
        g.fillStyle(0x22d3ee); g.fillCircle(20, 20, 20);
        g.generateTexture('player_unit', 40, 40);
        g.clear(); g.fillStyle(0xef4444); g.fillCircle(20, 20, 20);
        g.generateTexture('enemy_unit', 40, 40);
        g.clear();
        g.fillStyle(0xf593af);
        g.fillCircle(20, 20, 20);
        g.generateTexture('enemy_support_unit', 40, 40);
        g.destroy();
    }

    createUI() {
        this.infoPanel = new InfoPanel(this);
        this.uiManager.createHelpText();
    }

    selectUnit(unit) {
        if (this.phase !== 'player') return;
        if (this.actionMode) return;

        if (this.selectedUnit) {
            this.selectedUnit.deselect();
            this.movementManager.clearHighlights();
        }
        this.selectedUnit = unit;
        unit.select();
        this.infoPanel.update(unit);
        this.updateMovementDisplay(unit);
    }

    updateMovementDisplay(unit) {
        if (unit.type === 'player' && unit.hasActions()) {
            this.movementManager.showMoveRange(unit);
        } else {
            this.movementManager.clearHighlights();
        }
        this.uiManager.updateHelpText();
    }

    startAction(action) {
        this.targetManager.startAction(action);
    }

    skipUnitTurn() {
        this.turnManager.skipUnitTurn();
    }

    clearSelection() {
        this.turnManager.clearSelection();
    }

    checkWinLose() {
        if (this.gameOver) return;
        const aliveEnemies = this.unitManager.getEnemyUnits(true).length;
        const alivePlayers = this.unitManager.getPlayerUnits(true).length;
        if (aliveEnemies === 0) {
            this.gameOver = true;
            this.showGameResult(true);
        } else if (alivePlayers === 0) {
            this.gameOver = true;
            this.showGameResult(false);
        }
    }

    showGameResult(isVictory) {
        const depth = 2000;

        this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85)
            .setDepth(depth)
            .setInteractive();

        const titleText = isVictory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
        const titleColor = isVictory ? '#22d3ee' : '#ef4444';
        const titleStroke = isVictory ? '#0e7490' : '#991b1b';

        this.add.text(640, 270, titleText, {
            fontSize: '80px',
            fontFamily: 'Arial Black',
            color: titleColor,
            stroke: titleStroke,
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(depth + 1);

        const subText = isVictory ? 'Все враги уничтожены' : 'Все союзники погибли';
        this.add.text(640, 370, subText, {
            fontSize: '30px',
            fontFamily: 'Arial',
            color: '#cccccc'
        }).setOrigin(0.5).setDepth(depth + 1);

        const menuBtn = this.add.text(640, 460, 'Главное меню', {
            fontSize: '32px',
            color: '#ffffff',
            backgroundColor: '#4a4a6a',
            padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(depth + 1);

        menuBtn.on('pointerdown', () => {
            this.scene.stop('MainScene');
            this.scene.start('MainMenu');
        });
        menuBtn.on('pointerover', () => menuBtn.setStyle({ backgroundColor: '#6a6a8a' }));
        menuBtn.on('pointerout', () => menuBtn.setStyle({ backgroundColor: '#4a4a6a' }));
    }
}