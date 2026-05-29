export class StupidAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return true;
    }

    process(enemy) {
        const closestData = this.scene.blackboard.getClosestPlayer(enemy);
        if (!closestData) return;
        const closest = closestData.unit;
        const distanceToClosest = closestData.distance;

        if (!closest || !closest.isAlive) { return; }

        const combat = this.scene.combatManager;
        if (distanceToClosest <= 1) {
            combat.performMeleeAttack(enemy, closest);
            return;
        }

        const pathfinder = this.scene.pathfinder;
        const neighbours = pathfinder.getTilesInRange(closest.tile, 1)
            .filter(t => t.walkable && !t.unit);
        if (neighbours.length === 0) {
            return;
        }

        const bestTile = this.scene.blackboard.getClosestTile(neighbours, enemy.tile).tile;

        const path = pathfinder.findPath(enemy.tile, bestTile, enemy.moveRange);
        if (path && path.length > 0) {
            const finalTile = path[path.length - 1];

            enemy.moveTo(finalTile);

            if (enemy.hasActions() && this.scene.blackboard.distanceBetweenTiles(enemy.tile, closest.tile) <= 1) {
                combat.performMeleeAttack(enemy, closest);
            }
        }
    }
}