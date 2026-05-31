export class SupportAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'support';
    }

    getActionsPlan(enemy, actionsLeft) {

        const closestData = this.scene.blackboard.getClosestPlayer(enemy);

        if (!closestData) { return null; }

        const closest = closestData.unit;
        const distanceToClosest = closestData.distance;

        if (distanceToClosest <= 2) {
            const tilesToGo = this.scene.pathfinder.getTilesInRange(enemy.tile, enemy.moveRange);

            // Некуда убегать
            if (tilesToGo.length === 0) {
                return { actions: [{type: 'buff'}]};
            }

            const mostDistantFromPlayers = this.scene.blackboard.getTheMostDistantTileFromPlayers(tilesToGo, enemy.tile, 7);

            // нет живых игроков
            if (!mostDistantFromPlayers)
                return null;

            const newClosestPlayerInfo = this.scene.blackboard.getClosestTile(this.scene.unitManager.getPlayerUnits().map(p => p.tile), mostDistantFromPlayers);

            // Нет смысла убегать
            if (newClosestPlayerInfo.distance <= distanceToClosest) {
                return { actions: [{type: 'buff'}]};
            }

            return { actions: [{type: 'move', tile: mostDistantFromPlayers}]};
        }
        // Если заметил игрока (пока захардкожено)
        else if (distanceToClosest <= 7) {
            return { actions: [{type: 'buff'}]};
        }

        return null;
    }
}