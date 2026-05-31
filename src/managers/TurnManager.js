export class TurnManager {
    constructor(scene, blackboard) {
        this.scene = scene;
        this.blackboard = blackboard;
    }

    endUnitTurn(unit) {
        unit.deselect();
        this.scene.movementManager.clearHighlights();
        this.scene.targetManager.clearTargetHighlights();
        this.scene.targetManager.clearActionRange();
        this.scene.infoPanel.hide();
        this.scene.selectedUnit = null;
        this.scene.actionMode = null;
        this.scene.uiManager.updateHelpText();
        this.checkEndPlayerPhase();
    }

    skipUnitTurn() {
        if (this.scene.selectedUnit) {
            this.scene.targetManager.setUnitsInteractive(true);
            this.scene.selectedUnit.endTurn();
            this.endUnitTurn(this.scene.selectedUnit);
        }
    }

    clearSelection() {
        if (this.scene.selectedUnit) {
            this.scene.selectedUnit.deselect();
            this.scene.movementManager.clearHighlights();
            this.scene.targetManager.clearTargetHighlights();
            this.scene.targetManager.clearActionRange();
            this.scene.targetManager.setUnitsInteractive(true);
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
        if (this.scene.gameOver) return;
        this.scene.phase = 'player';
        this.scene.unitManager.getPlayerUnits().forEach(u => u.resetActions());
        this.scene.uiManager.updateHelpText();
    }

    startEnemyPhase() {
        if (this.scene.gameOver) return;
        this.scene.phase = 'enemy';
        this.scene.uiManager.updateHelpText();
        this.scene.unitManager.getEnemyUnits().forEach(e => e.resetActions());
        this.scene.time.delayedCall(500, () => this.processEnemyTurn());
    }

    processEnemyTurn() {
        if (this.scene.gameOver) return;
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
        this.scene.aiOrchestrator.processAIActions(enemy, () => {
            // Повторный ход
            if (enemy.consumeExtraTurn()) {
                this.scene.time.delayedCall(300, () => this.enemyAct(enemy));
                return;
            }
            enemy.endTurn();
            this.scene.time.delayedCall(300, () => this.processEnemyTurn());
        });
    }

    tickEnemyBuffs() {
        this.scene.unitManager.getEnemyUnits().forEach(e => e.tickBuffs());
    }

}