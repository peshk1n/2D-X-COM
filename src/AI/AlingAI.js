import { MathUtils } from "../utils/MathUtils";

export class AlingAI {
    constructor(scene) {
        this.scene = scene;
    }

    canProcess(enemy) {
        return enemy.role === 'swarm';
    }

    process(enemy) {

        const pathfinder = this.scene.pathfinder;
        const combat = this.scene.combatManager;
        const blackboard = this.scene.blackboard;

        const swarmUnits = this.scene.unitManager.getEnemyUnits()
            .filter(u => u.role === 'swarm' && u !== enemy);

        const playerUnits = this.scene.unitManager.getPlayerUnits();

        // Generate all possible action plans


        const possibleMoves =
            pathfinder.getTilesInRange(enemy.tile, enemy.moveRange)
                .filter(t => !t.unit || t.unit === enemy);

        let bestPlan = null;
        let bestScore = -Infinity;


        // DO NOTHING

        evaluatePlan({
            actions: [],
            finalTile: enemy.tile
        });


        // ATTACK WITHOUT MOVING

        for (const player of playerUnits) {

            const dist =
                blackboard.distanceBetweenTiles(
                    enemy.tile,
                    player.tile
                );

            if (dist <= 1) {

                evaluatePlan({
                    actions: [
                        {
                            type: 'attack',
                            target: player
                        }
                    ],
                    finalTile: enemy.tile
                });
            }
        }

        // PLAN TYPE 3:

        for (const moveTile of possibleMoves) {

            evaluatePlan({
                actions: [
                    {
                        type: 'move',
                        tile: moveTile
                    }
                ],
                finalTile: moveTile
            });
        }

        // MOVE + ATTACK

        for (const moveTile of possibleMoves) {

            for (const player of playerUnits) {

                const dist =
                    blackboard.distanceBetweenTiles(
                        moveTile,
                        player.tile
                    );

                if (dist <= 1) {

                    evaluatePlan({
                        actions: [
                            {
                                type: 'move',
                                tile: moveTile
                            },
                            {
                                type: 'attack',
                                target: player
                            }
                        ],
                        finalTile: moveTile
                    });
                }
            }
        }

        // MOVE + MOVE

        for (const firstTile of possibleMoves) {

            const secondMoves =
                pathfinder.getTilesInRange(firstTile, enemy.moveRange)
                    .filter(t => !t.unit || t.unit === enemy);

            for (const secondTile of secondMoves) {

                evaluatePlan({
                    actions: [
                        {
                            type: 'move',
                            tile: firstTile
                        },
                        {
                            type: 'move',
                            tile: secondTile
                        }
                    ],
                    finalTile: secondTile
                });
            }
        }


        if (!bestPlan) {
            return;
        }

        executePlan(bestPlan, this.scene);

        function evaluatePlan(plan) {

            const finalTile = plan.finalTile;

            let score = 0;


            score += Phaser.Math.FloatBetween(-4, 4);

            if (finalTile === enemy.tile) {
                score -= 10;
            }

            // COHESION

            for (const ally of swarmUnits) {

                const dist =
                    pathfinder.pathDistance(
                        finalTile,
                        ally.tile
                    );

                // avoid stacking
                if (dist <= 1) {
                    score -= 25;
                }
                // stay near swarm
                else if (dist <= 3) {
                    score += 20;
                }
                else if (dist <= 5) {
                    score += 10;
                }
                else if (dist <= 8) {
                    score += 2;
                }
                else {
                    score -= 5;
                }
            }


            for (const player of playerUnits) {

                const dist =
                    blackboard.distanceBetweenTiles(
                        finalTile,
                        player.tile
                    );

                const visible =
                    isVisibleForPlayer(
                        finalTile,
                        player
                    );

                if (!visible) {
                    score += 6;
                }

                if (dist <= 1) {

                    score += 40;

                    if (enemy.attack >= player.hp) {
                        score += 200;
                    }
                }
                else {

                    const woundedFactor =
                        1 - (player.hp / player.maxHp);

                    const proximityFactor =
                        Math.max(0, 1 - dist / 8);

                    score += woundedFactor *
                        proximityFactor *
                        30;
                }
            }


            for (const action of plan.actions) {

                if (action.type !== 'attack') {
                    continue;
                }

                const target = action.target;

                score += 60;

                if (enemy.attack >= target.hp) {
                    score += 200;
                }
            }


            //Wandering
            if (enemy.previousTile !== null) {
                const distFromPrevious =
                    blackboard.distanceBetweenTiles(
                        finalTile,
                        enemy.previousTile
                    );

                score += distFromPrevious * 3;
            }

            //React to attack
            for (const ally of swarmUnits) {

                if (!ally.lastAttacker || !ally.lastAttacker.hp > 0) {
                    continue;
                }

                const attacker =
                    ally.lastAttacker;

                const dist =
                    blackboard.distanceBetweenTiles(
                        finalTile,
                        attacker.tile
                    );

                score += Math.max(
                    0,
                    40 - dist * 3
                );
            }


            if (score > bestScore) {

                bestScore = score;
                bestPlan = plan;
            }
        }


        function executePlan(plan, scene) {

            let currentActionIndex = 0;

            executeNext();

            function executeNext() {

                if (currentActionIndex >= plan.actions.length) {
                    return;
                }

                const action =
                    plan.actions[currentActionIndex];

                currentActionIndex++;

                switch (action.type) {

                    case 'move':

                        scene.movementManager.moveUnitTo(
                            enemy,
                            action.tile
                        );

                        executeNext();

                        break;

                    case 'attack':

                        combat.performMeleeAttack(
                            enemy,
                            action.target
                        );

                        executeNext();

                        break;
                }
            }
        }


        function isVisibleForPlayer(tile, player) {

            const dist =
                blackboard.distanceBetweenTiles(
                    tile,
                    player.tile
                );

            return dist <= 8;
        }
    }

    _isVisibleToSwarm(tile, swarmUnits, self, player) {

        const allSwarm = [...swarmUnits, self];

        for (const ally of allSwarm) {

            const dist =
                this.scene.blackboard.distanceBetweenTiles(
                    ally.tile,
                    player.tile
                );

            if (dist <= 8) {
                return true;
            }
        }

        return false;
    }


}