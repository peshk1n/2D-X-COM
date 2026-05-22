export class SupportAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'support';
    }

    process(enemy) {
        const closestData = this.scene.blackboard.getClosestPlayer(enemy);

        const closest = closestData.unit;
        const distanceToClosest = closestData.distance;

        if (!closest) { return; }

        if (distanceToClosest <= 3) {
            const tilesToGo = this.scene.pathfinder.getTilesInRange(enemy.tile, enemy.moveRange);

            // Некуда убегать
            if (tilesToGo.length === 0) {
                this.scene.supportAI.applyBestBuff(enemy);
                this.endEnemyTurn(enemy);
                return;
            }

            const mostDistantFromPlayers = this.scene.blackboard.getTheMostDistantTileFromPlayers(tilesToGo, enemy.tile, 7);

            const newClosestPlayerInfo = this.scene.blackboard.getClosestTile(this.scene.unitManager.getPlayerUnits().map(p => p.tile), mostDistantFromPlayers);

            // Нет смысла убегать
            if (newClosestPlayerInfo.distance <= distanceToClosest) {
                this.scene.supportAI.applyBestBuff(enemy);
                return;
            }

            enemy.moveTo(mostDistantFromPlayers);
        }
        // Если заметил игрока (пока захардкожено)
        else if (distanceToClosest <= 7) {
            this.scene.supportAI.applyBestBuff(enemy);
        }


    }
}