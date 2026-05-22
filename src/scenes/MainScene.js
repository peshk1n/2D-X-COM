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
import { FogOfWar } from '../vfx/FogOfWar.js';
import { CombatVFX } from '../vfx/CombatVFX.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super('MainScene');
    }

    create() {
        this.cameras.main.setBackgroundColor('#0f172a');
        this.phase = 'player';
        this.selectedUnit = null;
        this.actionMode = null;
        this.highlightedTiles = [];
        this.highlightedTargets = [];

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

        this.unitManager.createUnits(this.tilemap);

        this.supportAI = new SupportEnemyAI(this.unitManager, this.blackboard);
        
        this.createUI();

        this.fogOfWar = new FogOfWar(this, this.tilemap, { visionRange: 7 });
        this.fogOfWar.render();

        this.fogOfWar.update(this.unitManager.playerUnits, this.unitManager.allUnits, this.selectedUnit);

        this.unitManager.playerUnits.forEach(u => u.resetActions());
        this.uiManager.updateHelpText();
    }

    preload() {
        this.load.spritesheet('tiles', tileset, { frameWidth: 40, frameHeight: 40 });
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

        // Маг
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
}