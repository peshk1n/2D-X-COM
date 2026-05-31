import { Unit } from '../entities/Unit.js';

export class SummonerAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'summoner';
    }

    getActionsPlan(enemy, actionsLeft) {
        const closestData = this.scene.blackboard.getClosestPlayer(enemy);
        const closest = closestData.unit;
        const distanceToClosest = closestData.distance;

        if (!closest || !closest.isAlive) return { actions: [] };

        let actions = [];

        if (distanceToClosest <= 3) {
            const reachableTiles = this.scene.pathfinder.getTilesInRange(enemy.tile, enemy.moveRange);

            if (reachableTiles.length !== 0) {
                const mostDistantFromPlayers = this.scene.blackboard.getTheMostDistantTileFromPlayers(reachableTiles, enemy.tile, 7);
                const newClosestPlayerInfo = this.scene.blackboard.getClosestTile(this.scene.unitManager.getPlayerUnits().map(p => p.tile), mostDistantFromPlayers);

                if (newClosestPlayerInfo.distance > distanceToClosest)
                    actions = [...actions, { type: "move", tile: mostDistantFromPlayers }];
            }
        }

        if (enemy.maxSummonedUnits
            && 0 < enemy.maxSummonedUnits
            && enemy.minionRoles
            && enemy.minionRoles.length > 0
            && enemy.summonedUnits < enemy.maxSummonedUnits)
        {
            const tilesForSummoning = this.scene.pathfinder.getTilesInRange(enemy.tile, 1);
            
            if (tilesForSummoning && tilesForSummoning.length >= 0) {
                const minionRole = enemy.minionRoles[Math.floor(Math.random() * enemy.minionRoles.length)];

                actions = [...actions, {
                    type: "summon",
                    tile: tilesForSummoning[0],
                    config: { ...(enemy.minionConfigs.filter(c => c.role === minionRole)[0]), type: 'enemy', summoner: enemy }
                }];
            }
        }

        return { actions: actions };
    }

    static summon(summoner, tile, unitConfig) {
        const { x, y } = summoner.scene.tilemap.gridToWorld(tile.gridX, tile.gridY);

        const unit = new Unit(summoner.scene, x, y, unitConfig);
        unit.setTile(tile);

        summoner.scene.unitManager.enemyUnits.push(unit);
        summoner.scene.unitManager.allUnits.push(unit);

        summoner.summonedUnits += 1;
    }
}