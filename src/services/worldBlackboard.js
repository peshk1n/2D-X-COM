import { MathUtils } from "../utils/MathUtils";

/**
 * Сервис, который предоставляет интерфейс для доступа к информации о состоянии игрового мира.
 */
export class WorldBlackboard {
    constructor(scene) {
        this.scene = scene;
    }

    getUnits(alive = true) {
        const units = this.scene.unitManager.allUnits ?? [];
        return alive ? units.filter(unit => this.isAlive(unit)) : units;
    }

    getEnemyUnits(alive = true) {
        const units = this.scene.unitManager.enemyUnits ?? [];
        return alive ? units.filter(unit => this.isAlive(unit)) : units;
    }

    getPlayerUnits(alive = true) {
        const units = this.scene.unitManager.playerUnits ?? [];
        return alive ? units.filter(unit => this.isAlive(unit)) : units;
    }

    isAlive(unit) {
        return unit && unit.hp > 0;
    }

    getUnitTile(unit) {
        if (!unit)
            return null;

        if (unit.tile)
            return unit.tile;

        const grid = this.scene.tilemap?.grid;
        if (!grid)
            return null;

        for (const row of grid) {
            for (const tile of row) {
                if (tile.unit === unit)
                    return tile;
            }
        }

        return null;
    }

    getUnitGridPosition(unit) {
        const tile = this.getUnitTile(unit);
        if (tile) {
            return { x: tile.gridX, y: tile.gridY };
        }

        if (this.scene.tilemap && unit?.sprite) {
            return this.scene.tilemap.worldToGrid(unit.sprite.x, unit.sprite.y);
        }

        return null;
    }

    getMaxGridDistance() {
        const tilemap = this.scene.tilemap;
        if (!tilemap)
            return 20;

        return (tilemap.COLS ?? 0) + (tilemap.ROWS ?? 0);
    }

    distanceBetweenUnits(a, b) {
        const posA = this.getUnitGridPosition(a);
        const posB = this.getUnitGridPosition(b);

        if (!posA || !posB)
            return Infinity;

        return MathUtils.gridDistance(posA, posB);
    }

    distanceBetweenTiles(t1, t2) {
        const pos1 = { x: t1.gridX, y: t1.gridY };
        const pos2 = { x: t2.gridX, y: t2.gridY };

        return MathUtils.gridDistance(pos1, pos2);
    }

    getClosestPlayer(unit) {
        return this.getClosestUnit(this.getPlayerUnits(), unit);
    }

    getClosestEnemy(unit) {
        return this.getClosestUnit(this.getEnemyUnits(), unit);
    }


    isEnemyUnitVisible(unit) {
        return this.scene.fogOfWar.isExplored(this.getUnitTile(unit));
    }

    getClosestPlayer(unit) {
        return this.getClosestUnit(this.scene.unitManager.getPlayerUnits(), unit);
    }

    getClosestEnemy(unit) {
        return this.getClosestUnit(this.scene.unitManager.getEnemyUnits(), unit);
    }

    getClosestTile(tiles, tile) {
        let best = null;

        for (const t of tiles) {
            const distance = this.distanceBetweenTiles(tile, t);
            if (!best || distance < best.distance) {
                best = { tile: t, distance: distance };
            }
        }

        return best;
    }

    getTheMostDistantTileFromPlayers(tiles, currentTile, checkRange) {
        return this._getTheMostDistantTileFrom(this.scene.unitManager.getPlayerUnits(), tiles, currentTile, checkRange);
    }

    getTheMostDistantTileFromEnemies(tiles, currentTile, checkRange) {
        return this._getTheMostDistantTileFrom(this.scene.unitManager.getEnemyUnits(), tiles, currentTile, checkRange);
    }

    _getTheMostDistantTileFrom(units, tiles, currentTile, checkRange) {
        if (!units || !tiles || !currentTile || !checkRange)
            return null;

        let bestTile = null;
        let maxDist = -Infinity;

        for (const t of tiles) {
            const distancesSum = MathUtils.sum(
                units.filter(unit => this.distanceBetweenTiles(this.getUnitTile(unit), currentTile) <= checkRange)
                    .map(unit => this.distanceBetweenTiles(this.getUnitTile(unit), t))
            );

            if (distancesSum > maxDist) {
                maxDist = distancesSum;
                bestTile = t;
            }
        }

        return bestTile;
    }

    getClosestUnit(units, unit) {
        let best = null;

        for (const u of units) {
            const distance = this.distanceBetweenUnits(unit, u);
            if (!best || distance < best.distance) {
                best = { unit: u, distance: distance };
            }
        }

        return best;
    }

    getAlliesInRange(unit, range) {
        let allies = unit.type === 'player' ? this.scene.unitManager.getPlayerUnits() : this.scene.unitManager.getEnemyUnits();
        allies = allies.filter((ally) => ally !== unit);
        return allies.filter((ally) => this.distanceBetweenUnits(unit, ally) <= range);
    }

    getUnitAtGrid(gx, gy) {
        const tile = this.scene.tilemap?.getTile(gx, gy);
        if (tile?.unit)
            return tile.unit;

        return this.scene.unitManager.getUnits(false).find((unit) => {
            const pos = this.getUnitGridPosition(unit);
            return pos && pos.x === gx && pos.y === gy;
        }) ?? null;
    }

    getEnemyAtGrid(gx, gy) {
        const unit = this.getUnitAtGrid(gx, gy);
        return unit && unit.type === 'enemy' ? unit : null;
    }

    getPlayerAtGrid(gx, gy) {
        const unit = this.getUnitAtGrid(gx, gy);
        return unit && unit.type === 'player' ? unit : null;
    }

    getMapCenter() {
        const tilemap = this.scene.tilemap;
        return tilemap.getTile(tilemap.COLS / 2, tilemap.ROWS / 2);
    }
}
