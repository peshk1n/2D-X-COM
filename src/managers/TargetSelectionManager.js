export class TargetSelectionManager {
    constructor(scene) {
        this.scene = scene;
    }

    startAction(action) {
        const unit = this.scene.selectedUnit;
        if (!unit || this.scene.phase !== 'player') return;
        this.scene.actionMode = action;
        this.scene.movementManager.clearHighlights();
        this.setUnitsInteractive(false);
        this.showActionRange(unit, action);
        this.showTargetsForAction(action);
        this.scene.uiManager.updateHelpText();
    }

    showActionRange(unit, action) {
        this.clearActionRange();
        if (!unit?.tile) return;

        let maxRange = 5;
        let color = 0xf97316;

        if (action === 'skill') {
            if (unit.role === 'medic')        { maxRange = 1;  color = 0x2dd4bf; }
            else if (unit.role === 'sniper')  { maxRange = 12; color = 0xfbbf24; }
            else if (unit.role === 'assault') { maxRange = 1;  color = 0xef4444; }
        }

        const tilemap = this.scene.tilemap;
        for (let row = 0; row < tilemap.ROWS; row++) {
            for (let col = 0; col < tilemap.COLS; col++) {
                const tile = tilemap.getTile(col, row);
                if (!tile || !tile.walkable) continue;
                const dist = Math.abs(tile.gridX - unit.tile.gridX) + Math.abs(tile.gridY - unit.tile.gridY);
                if (dist < 1 || dist > maxRange) continue;
                const { x, y } = tilemap.gridToWorld(tile.gridX, tile.gridY);
                const rect = this.scene.add.rectangle(x, y, 36, 36, color, 0.22).setDepth(1);
                this.scene.rangeHighlights.push(rect);
            }
        }
    }

    clearActionRange() {
        (this.scene.rangeHighlights ?? []).forEach(r => r.destroy());
        this.scene.rangeHighlights = [];
    }

    showTargetsForAction(action) {
        this.clearTargetHighlights();
        const unit = this.scene.selectedUnit;
        let maxRange = 5, targetAllies = false, onlyAdjacent = false;

        if (action === 'shoot') maxRange = 5;
        else if (action === 'skill') {
            if (unit.role === 'medic') { maxRange = 1; targetAllies = true; }
            else if (unit.role === 'sniper') maxRange = 12;
            else if (unit.role === 'assault') { maxRange = 1; onlyAdjacent = true; }
        }

        const candidates = targetAllies ? this.scene.unitManager.getPlayerUnits() : this.scene.unitManager.getEnemyUnits();
        const tilemap = this.scene.tilemap;
        const fogOfWar = this.scene.fogOfWar;
        
        candidates.forEach(target => {
            if (target === unit || target.hp <= 0) return;
            
            const dist = this.gridDistance(unit.tile, target.tile);
            if (dist === 0 || dist > maxRange) return;
            if (onlyAdjacent && dist > 1) return;
            
            // Проверяем Line of Sight для всех действий
            let hasLoS = fogOfWar.hasLineOfSight(unit.tile, target.tile, maxRange);
            
            if (!hasLoS) return;
            
            const { x, y } = tilemap.gridToWorld(target.tile.gridX, target.tile.gridY);
            const color = targetAllies ? 0x00ff00 : 0xff0000;
            const marker = this.scene.add.rectangle(x, y, 36, 36, color, 0.4).setDepth(2);
            marker.setInteractive();
            marker.on('pointerdown', () => this.executeAction(action, target));
            this.scene.highlightedTargets.push(marker);
        });
    }

    executeAction(action, target) {
        this.clearTargetHighlights();
        this.setUnitsInteractive(true);
        this.scene.actionMode = null;
        const unit = this.scene.selectedUnit;
        if (!unit || !unit.hasActions()) return;

        unit.endTurn();

        const combat = this.scene.combatManager;
        if (action === 'shoot') {
            combat.performRangedAttack(unit, target);
        } else if (action === 'skill') {
            switch (unit.role) {
                case 'medic': combat.performHeal(unit, target); break;
                case 'sniper': combat.performSniperShot(unit, target); break;
                case 'assault': combat.performMeleeAttack(unit, target); break;
                default: combat.performRangedAttack(unit, target);
            }
        }

        this.scene.turnManager.endUnitTurn(unit);
    }

    clearTargetHighlights() {
        this.scene.highlightedTargets.forEach(s => s.destroy());
        this.scene.highlightedTargets = [];
    }

    setUnitsInteractive(enabled) {
        this.scene.unitManager.getUnits(false).forEach(u => {
            if (enabled) u.sprite.setInteractive();
            else u.sprite.disableInteractive();
        });
    }

    gridDistance(a, b) {
        return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
    }
}