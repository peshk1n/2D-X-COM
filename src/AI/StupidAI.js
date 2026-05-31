export class StupidAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return true;
    }

    getActionsPlan(enemy, actionsLeft) {

        const closestData = this.scene.blackboard.getClosestPlayer(enemy);

        if (!closestData) { return null; }

        const closest = closestData.unit;
        const distanceToClosest = closestData.distance;

        const combat = this.scene.combatManager;
        if (distanceToClosest <= 1) {
            return { actions: [{type: 'attack', target: closest}] };
        }

        const pathfinder = this.scene.pathfinder;
        const neighbours = pathfinder.getTilesInRange(closest.tile, 1)
            .filter(t => t.walkable && !t.unit);
        if (neighbours.length === 0) {
            return null;
        }

        const bestTile = this.scene.blackboard.getClosestTile(neighbours, enemy.tile).tile;

        const path = pathfinder.findPath(enemy.tile, bestTile, enemy.moveRange);
        if (path && path.length > 0) {
            const finalTile = path[path.length - 1];

            const plan = { actions: [{type: 'move', tile: finalTile}] };

            actionsLeft--;

            if (actionsLeft > 0 && this.scene.blackboard.distanceBetweenTiles(finalTile, closest.tile) <= 1) {
                plan.actions.push({type: 'attack', target: closest});
            }
            
            return plan;
        }

        return null;
    }
}