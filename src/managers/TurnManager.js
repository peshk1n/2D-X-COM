export class TurnManager {
    constructor(scene, blackboard) {
        this.scene = scene;
        this.blackboard = blackboard;
    }

    endUnitTurn(unit) {
        unit.deselect();
        this.scene.movementManager.clearHighlights();
        this.scene.targetManager.clearTargetHighlights();
        this.scene.infoPanel.hide();
        this.scene.selectedUnit = null;
        this.scene.actionMode = null;
        this.scene.uiManager.updateHelpText();
        this.checkEndPlayerPhase();
    }

    skipUnitTurn() {
        if (this.scene.selectedUnit) {
            this.scene.selectedUnit.endTurn();
            this.endUnitTurn(this.scene.selectedUnit);
        }
    }

    clearSelection() {
        if (this.scene.selectedUnit) {
            this.scene.selectedUnit.deselect();
            this.scene.movementManager.clearHighlights();
            this.scene.targetManager.clearTargetHighlights();
            this.scene.infoPanel.hide();
            this.scene.selectedUnit = null;
            this.scene.actionMode = null;
            this.scene.uiManager.updateHelpText();
        }
    }

    checkEndPlayerPhase() {
        const playerUnits = this.scene.unitManager.getPlayerUnits();
        if (!playerUnits.some(u => u.hasActions())) {
            this.startEnemyPhase();
        }
    }

    startPlayerPhase() {
        this.scene.phase = 'player';
        this.scene.unitManager.getPlayerUnits().forEach(u => u.resetActions());
        this.scene.uiManager.updateHelpText();
    }

    startEnemyPhase() {
        this.scene.phase = 'enemy';
        this.scene.uiManager.updateHelpText();
        this.scene.unitManager.getEnemyUnits().forEach(e => e.resetActions());
        this.scene.time.delayedCall(500, () => this.processEnemyTurn());
    }

    processEnemyTurn() {
        const enemies = this.scene.unitManager.getEnemyUnits();
        const active = enemies.filter(e => e.hasActions());
        if (active.length === 0) {
            this.tickEnemyBuffs();
            this.startPlayerPhase();
            return;
        }
        const supportEnemies = active.filter(e => e.role === 'support');
        // Первым вызываем мага для раздачи баффов
        if (supportEnemies.length > 0) {
            this.enemyAct(supportEnemies[0]);
        }
        else {
            this.enemyAct(active[0]);
        }
    }

    enemyAct(enemy) {
        const closestData = this.blackboard.getClosestPlayer(enemy);

        const closestPlayer = closestData.unit;
        const distanceToClosestPlayer = closestData.distance;

        // Маг
        if (this.processSupportTurn(enemy, distanceToClosestPlayer, closestPlayer))
            return;

        if (!closestPlayer) { this.skipEnemyTurn(enemy); return; }

        const combat = this.scene.combatManager;
        if (distanceToClosestPlayer <= 1) {
            combat.performRangedAttack(enemy, closestPlayer);
            this.endEnemyTurn(enemy);
            return;
        }
        
        const tilemap = this.scene.tilemap;
        const pathfinder = this.scene.pathfinder;
        const neighbours = pathfinder.getTilesInRange(closestPlayer.tile, 1)
            .filter(t => t.walkable && !t.unit);
        if (neighbours.length === 0) {
            this.skipEnemyTurn(enemy);
            return;
        }

        const bestTile = this.blackboard.getClosestTile(neighbours, enemy.tile).tile;

        const path = pathfinder.findPath(enemy.tile, bestTile, enemy.moveRange);
        if (path && path.length > 0) {
            const finalTile = path[path.length - 1];
            
            enemy.moveTo(finalTile);

            if (enemy.hasActions() && this.blackboard.distanceBetweenTiles(enemy.tile, closestPlayer.tile) <= 1) {
                combat.performRangedAttack(enemy, closestPlayer);
            }
        }
        else {
            this.skipEnemyTurn(enemy);
            return;
        }
        this.endEnemyTurn(enemy);
    }

    tickEnemyBuffs() {
        this.scene.unitManager.getEnemyUnits().forEach(e => e.tickBuffs());
    }

    skipEnemyTurn(enemy) {
        enemy.endTurn();
        this.startNextEnemyTurn(0);
    }

    endEnemyTurn(enemy) {
        // Повторный ход
        if (enemy.consumeExtraTurn()) {
            this.startNextEnemyTurn(500);
            return;
        }
            
        enemy.endTurn();
        this.startNextEnemyTurn();
    }

    startNextEnemyTurn(delay = 300) {
        if (delay === 0) {
            this.processEnemyTurn();
            return;
        }
        this.scene.time.delayedCall(delay, () => this.processEnemyTurn());
    }

    // Поведение мага
    processSupportTurn(enemy, distanceToClosestPlayer, closestPlayer) {
        if (enemy.role === 'support') {
            
            // Если игрок слишком близко
            if (distanceToClosestPlayer <= 3) {
                const tilesToGo = this.scene.pathfinder.getTilesInRange(enemy.tile, enemy.moveRange);

                // Некуда убегать
                if (tilesToGo.length === 0) {
                    this.scene.supportAI.applyBestBuff(enemy);
                    this.endEnemyTurn(enemy);
                    return true;
                }

                const mostDistantFromPlayers = this.blackboard.getTheMostDistantTileFromPlayers(tilesToGo, enemy.tile, 7);

                const newClosestPlayerInfo = this.blackboard.getClosestTile(this.scene.unitManager.getPlayerUnits().map(p => p.tile), mostDistantFromPlayers);

                // Нет смысла убегать
                if (newClosestPlayerInfo.distance <= distanceToClosestPlayer) {
                    this.scene.supportAI.applyBestBuff(enemy);
                    this.endEnemyTurn(enemy);
                    return true;
                }

                enemy.moveTo(mostDistantFromPlayers);
            }
            // Если заметил игрока (пока захардкожено)
            else if (distanceToClosestPlayer <= 7) {
                this.scene.supportAI.applyBestBuff(enemy);
            }
            else {
                this.skipEnemyTurn(enemy);
                return true;
            }

            this.endEnemyTurn(enemy);
            return true;
        }

        return false;
    }
}