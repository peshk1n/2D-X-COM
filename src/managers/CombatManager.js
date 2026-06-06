export class CombatManager {
    constructor(scene, unitManager) {
        this.scene = scene;
        this.unitManager = unitManager;
    }

    _getEffectiveDefense(attacker, defender) {
        const lowBonus = defender?.tile?.coverDefenseBonus ?? 0;
        const highBonus = this.scene.blackboard.getHighCoverBonus(defender, attacker?.tile);
        return {
            total: defender.defense + lowBonus + highBonus,
            lowBonus,
            highBonus
        };
    }

    performRangedAttack(attacker, defender) {

        this.scene.combatVFX.playBulletShot(
            attacker,
            defender
        );
        const { total: effectiveDefense, lowBonus, highBonus } = this._getEffectiveDefense(attacker, defender);
        const totalCover = lowBonus + highBonus;

        const baseAcc = attacker.accuracy - (effectiveDefense * 0.5);
        const hitChance = Phaser.Math.Clamp(baseAcc, 10, 95);
        if (Math.random() * 100 < hitChance) {
            const dmg = Math.max(1, attacker.attack - Math.floor(effectiveDefense * 0.3));
            defender.hp -= dmg;
            defender.lastAttacker = attacker;
            this.showFloatingText(defender, `-${dmg}`, '#ef4444');
            if (totalCover > 0) {
                const coverType = highBonus > 0 ? '🏛️ Укрытие!' : '🛡️ Укрытие!';
                this.showFloatingText(defender, coverType, '#22d3ee', -15);
            }
            if (defender.hp <= 0) this.unitManager.killUnit(defender);
        } else {
            this.showFloatingText(defender, 'Промах', '#94a3b8');
        }
    }

    performSniperShot(attacker, defender) {
        this.scene.combatVFX.playSniperShot(
            attacker,
            defender
        );
        // Снайпер частично игнорирует укрытия
        // У низкого укрытия будет +1 к защите вместо +3
        // У высокого укрытия +7 к защите вместо +10
        const { lowBonus, highBonus } = this._getEffectiveDefense(attacker, defender);
        const totalCover = lowBonus + highBonus;
        const SNIPER_COVER_HIGH_IGNORE = 3;
        const ignoredLow = Math.floor(lowBonus * 0.5);
        const ignoredHigh = Math.min(SNIPER_COVER_HIGH_IGNORE, highBonus);
        const effectiveDefense = defender.defense + (lowBonus - ignoredLow) + (highBonus - ignoredHigh);

        const baseAcc = attacker.accuracy + 15 - (effectiveDefense * 0.5);
        if (Math.random() * 100 < Phaser.Math.Clamp(baseAcc, 20, 99)) {
            const dmg = Math.max(2, attacker.attack - Math.floor(effectiveDefense * 0.2));
            defender.hp -= dmg;
            defender.lastAttacker = attacker;
            this.showFloatingText(defender, `-${dmg}`, '#ef4444');
            if (totalCover > 0) {
                const coverType = highBonus > 0 ? '🏛️ Укрытие!' : '🛡️ Укрытие!';
                this.showFloatingText(defender, coverType, '#22d3ee', -15);
            }
            if (defender.hp <= 0) this.unitManager.killUnit(defender);
        } else {
            this.showFloatingText(defender, 'Промах', '#94a3b8');
        }
    }

    performMeleeAttack(attacker, defender) {
        this.scene.combatVFX.playMeleeHit(
            attacker,
            defender
        );
        const dmg = Math.floor(attacker.attack * 1.5) - Math.floor(defender.defense * 0.3);
        const finalDmg = Math.max(2, dmg);
        defender.hp -= finalDmg;
        defender.lastAttacker = attacker;
        this.showFloatingText(defender, `-${finalDmg}`, '#ef4444');
        if (defender.hp <= 0) this.unitManager.killUnit(defender);
    }

    performHeal(medic, patient) {
        const heal = 25;
        patient.hp = Math.min(patient.maxHp, patient.hp + heal);
        this.showFloatingText(patient, `+${heal}`, '#22c55e');
    }

    showFloatingText(unit, text, color, offsetY = 0) {
        const tilemap = this.scene.tilemap;
        const { x, y } = tilemap.gridToWorld(unit.tile.gridX, unit.tile.gridY);
        const startY = y - 40 + offsetY;
        const endY = startY - 20;
        const txt = this.scene.add.text(x, startY, text, {
            fontSize: '16px', fontFamily: 'Segoe UI', color, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({
            targets: txt, y: endY, alpha: 0, duration: 800,
            onComplete: () => txt.destroy()
        });
    }
}