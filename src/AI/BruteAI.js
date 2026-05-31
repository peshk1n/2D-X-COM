export class BruteAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'brute';
    }

    getActionsPlan(enemy, actionsLeft) {
        return this._calculateActionsPlan(
            enemy,
            enemy.tile,
            actionsLeft
        );
    }

    _calculateActionsPlan(enemy, fromTile, actionsLeft) {
        const closestData = this.scene.blackboard.getClosestPlayerForTile(fromTile);
        if (!closestData) { return null; }

        const closest = closestData.unit;
        const distance = this.scene.blackboard.distanceBetweenTiles(fromTile, closest.tile);

        const combat = this.scene.combatManager;

        if (distance <= 1) {
            return { actions: [{ type: 'attack', target: closest }] };
        }

        const pathfinder = this.scene.pathfinder;
        const neighbours = pathfinder.getTilesInRange(closest.tile, 1)
            .filter(t => t.walkable && !t.unit);
        if (neighbours.length === 0) {
            return null;
        }

        const bestTile = this.scene.blackboard.getClosestTile(neighbours, fromTile).tile;
        const path = pathfinder.findPath(fromTile, bestTile, enemy.moveRange);

        if (path && path.length > 0) {
            const finalTile = path[path.length - 1];
            const plan = { actions: [{ type: 'move', tile: finalTile }] };
            actionsLeft--;

            if (actionsLeft > 0 && this.scene.blackboard.distanceBetweenTiles(finalTile, closest.tile) <= 1) {
                plan.actions.push({ type: 'attack', target: closest });
            }
            return plan;
        }

        if (distance <= 7) {
            const pathToPoint = pathfinder.findPath(fromTile, closest.tile, 7);
            if (pathToPoint && pathToPoint.length > 0) {
                const stepCount = Math.min(enemy.moveRange, pathToPoint.length);
                const nextTile = pathToPoint[stepCount - 1];

                const plan = { actions: [{ type: 'move', tile: nextTile }] };
                actionsLeft--;

                if (actionsLeft > 0) {
                    const newPlan = this._calculateActionsPlan(enemy, nextTile, actionsLeft);
                    if (newPlan) {
                        plan.actions.push(...newPlan.actions);
                    }
                }
                return plan;
            }
        }

        return null;
    }
}