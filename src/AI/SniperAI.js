export class SniperAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'sniper';
    }

    process(enemy) {
        const closestData = this.scene.blackboard.getClosestPlayer(enemy);
        if (!closestData) return;
        const closestPlayer = closestData.unit;
        const distanceToClosestPlayer = closestData.distance;

        if (!closestPlayer || !closestPlayer.isAlive) { return; }

        const enemyTile = enemy.tile;
        const playerTile = closestPlayer.tile;

        const hasDirectLoS = this.scene.fogOfWar.hasLineOfSight(enemyTile, playerTile, 12);

        if (distanceToClosestPlayer >= 8 && distanceToClosestPlayer <= 12 && hasDirectLoS) {
            this.scene.combatManager.performSniperShot(enemy, closestPlayer);
            return true;
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
                enemy.moveTo(bestTile);
                
                const newEnemyTile = enemy.tile;
                if (this.scene.fogOfWar.hasLineOfSight(newEnemyTile, playerTile)) {
                    this.scene.combatManager.performSniperShot(enemy, closestPlayer);
                }
                return true;
            }
            
            if (hasDirectLoS) {
                this.scene.combatManager.performSniperShot(enemy, closestPlayer);
                return true;
            }
            
            const mostDistantFromPlayers = this.scene.blackboard.getTheMostDistantTileFromPlayers(
                reachableTiles, 
                enemyTile, 
                enemy.moveRange
            );
            
            if (mostDistantFromPlayers) {
                enemy.moveTo(mostDistantFromPlayers);
            }
            
            return true;
        }

        return false;
    }
}
