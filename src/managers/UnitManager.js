import { Unit } from '../entities/Unit.js';

export class UnitManager {
    constructor(scene) {
        this.scene = scene;
        this.playerUnits = [];
        this.enemyUnits = [];
        this.allUnits = [];
    }

    createUnits(tilemapService) {
        const toXY = (tile) => tilemapService.gridToWorld(tile.gridX, tile.gridY);
        const playerTiles = tilemapService.getSpawnTiles('left', 3);
        const enemyTiles = tilemapService.getSpawnTiles('right', 7);

        const playerDefs = [
            { name: 'Медик', hp: 100, attack: 10, defense: 8, accuracy: 70, role: 'medic', moveRange: 3 },
            { name: 'Снайпер', hp: 80, attack: 15, defense: 5, accuracy: 85, role: 'sniper', moveRange: 3 },
            { name: 'Штурмовик', hp: 120, attack: 18, defense: 10, accuracy: 65, role: 'assault', moveRange: 2 },
        ];
        const enemyDefs = [
            { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm", moveRange: 4 },
            { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm", moveRange: 4 },
            { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm", moveRange: 4 },
            { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm", moveRange: 4 },
            { name: 'Вражеский снайпер', hp: 70, ap: 2, attack: 16, defense: 4, accuracy: 85, role: 'sniper', moveRange: 3 },
            { name: 'Толстяк', hp: 130, ap: 1, attack: 22, defense: 8, accuracy: 60, role: 'brute', moveRange: 2 },
            { name: 'Маг', hp: 80, ap: 2, attack: 8, defense: 4, accuracy: 70, role: 'support', textureKey: 'enemy_support_unit', moveRange: 3 },
        ];

        playerDefs.forEach((def, i) => {
            const tile = playerTiles[i];
            if (!tile) return;
            const { x, y } = toXY(tile);
            const unit = new Unit(this.scene, x, y, { ...def, type: 'player' });
            unit.setTile(tile);
            this.playerUnits.push(unit);
            this.allUnits.push(unit);
        });

        enemyDefs.forEach((def, i) => {
            const tile = enemyTiles[i];
            if (!tile) return;
            const { x, y } = toXY(tile);
            const unit = new Unit(this.scene, x, y, { ...def, type: 'enemy' });
            unit.setTile(tile);
            this.enemyUnits.push(unit);
            this.allUnits.push(unit);
        });
    }

    getUnits(alive = true) {
        const units = this.allUnits ?? [];
        return alive ? units.filter(unit => unit.isAlive) : units;
    }

    getEnemyUnits(alive = true) {
        const units = this.enemyUnits ?? [];
        return alive ? units.filter(unit => unit.isAlive) : units;
    }

    getPlayerUnits(alive = true) {
        const units = this.playerUnits ?? [];
        return alive ? units.filter(unit => unit.isAlive) : units;
    }

    killUnit(unit) {
        unit.hp = 0;
        unit.actionsLeft = 0;
        unit.setTile(null);
        unit.sprite.setVisible(false);
        unit.marker.setVisible(false);
        unit.nameLabel.setVisible(false);
        this.scene.time.delayedCall(600, () => this.scene.checkWinLose?.());
    }
}