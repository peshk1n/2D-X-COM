export class BruteAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'brute';
    }

    process(enemy) {
        const closestData = this.scene.blackboard.getClosestPlayer(enemy);
        if (!closestData) return;
        const closest = closestData.unit;
        const distanceToClosest = closestData.distance;

        if (!closest) { return; }

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
            return;
        }

        if (distanceToClosest <= 7)
        {
            const pathToPoint = pathfinder.findPath(enemy.tile, closest.tile, 7);
            if (pathToPoint && pathToPoint.length > 0)
            {
                enemy.targettile = closest.tile
            }
        }

        if (enemy.targettile && this.scene.blackboard.distanceBetweenTiles(enemy.targettile,enemy.tile) > 0)
        {
            const pathToPoint = pathfinder.findPath(enemy.tile, enemy.targettile, 7);
            const finalTileOnWayToPoint = pathToPoint[Math.min(enemy.moveRange,pathToPoint.length)-1];
            enemy.moveTo(finalTileOnWayToPoint);
            if (enemy.hasActions())
            {
                this.process(enemy);
            }
            return;
        }
    }
}