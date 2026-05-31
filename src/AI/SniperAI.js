export class SniperAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'sniper';
    }

    getActionsPlan(enemy, actionsLeft) {
        const closestData = this.scene.blackboard.getClosestPlayer(enemy);

        if (!closestData) { return null; }

        const closestPlayer = closestData.unit;
        const distanceToClosestPlayer = closestData.distance;

        const enemyTile = enemy.tile;
        const playerTile = closestPlayer.tile;

        const hasDirectLoS = this.scene.fogOfWar.hasLineOfSight(enemyTile, playerTile, 12);

        if (distanceToClosestPlayer >= 8 && distanceToClosestPlayer <= 12 && hasDirectLoS) {
            return { actions: [{type: 'sniperShot', target: closestPlayer}] };
        }

        if (distanceToClosestPlayer < 8) {
            const reachableTiles = this.scene.pathfinder.getTilesInRange(enemyTile, enemy.moveRange);
            
            const tilesWithLoS = [];
            
            for (const tile of reachableTiles) {
                if (this.scene.fogOfWar.hasLineOfSight(tile, playerTile)) {
                    const dx = Math.abs(tile.gridX - playerTile.gridX);
                    const dy = Math.abs(tile.gridY - playerTile.gridY);
                    const distanceToPlayer = Math.max(dx, dy);
                    
                    if (distanceToPlayer < 12) {
                        tilesWithLoS.push({
                            tile: tile,
                            distanceToPlayer: distanceToPlayer
                        });
                    }
                }
            }
            
            if (tilesWithLoS.length > 0) {
                tilesWithLoS.sort((a, b) => b.distanceToPlayer - a.distanceToPlayer);
                const bestTile = tilesWithLoS[0].tile;
                
                const plan = { actions: [{type: 'move', tile: bestTile}] };
                
                actionsLeft--;

                const newEnemyTile = bestTile;
                if (this.scene.fogOfWar.hasLineOfSight(newEnemyTile, playerTile)) {
                    plan.actions.push({type: 'sniperShot', target: closestPlayer});
                }
                return plan;
            }
            
            if (hasDirectLoS) {
                return { actions: [{type: 'sniperShot', target: closestPlayer}] };
            }
            
            const mostDistantFromPlayers = this.scene.blackboard.getTheMostDistantTileFromPlayers(
                reachableTiles, 
                enemyTile, 
                enemy.moveRange
            );
            
            if (mostDistantFromPlayers) {
                return { actions: [{type: 'move', tile: mostDistantFromPlayers}] };
            }
        }

        return null;
    }
}
