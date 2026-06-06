export class CombatManager {
    constructor(scene, unitManager) {
        this.scene = scene;
        this.unitManager = unitManager;
    }

    performRangedAttack(attacker, defender) {

        this.scene.combatVFX.playBulletShot(
            attacker,
            defender
        );
        const baseAcc = attacker.accuracy - (defender.defense * 0.5);
        const hitChance = Phaser.Math.Clamp(baseAcc, 10, 95);
        if (Math.random() * 100 < hitChance) {
            const dmg = Math.max(1, attacker.attack - Math.floor(defender.defense * 0.3));
            defender.hp -= dmg;
            defender.lastAttacker = attacker;
            this.showFloatingText(defender, `-${dmg}`, '#ef4444');
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
        const baseAcc = attacker.accuracy + 15 - (defender.defense * 0.5);
        if (Math.random() * 100 < Phaser.Math.Clamp(baseAcc, 20, 99)) {
            const dmg = Math.max(2, attacker.attack - Math.floor(defender.defense * 0.2));
            defender.hp -= dmg;
            defender.lastAttacker = attacker;
            this.showFloatingText(defender, `-${dmg}`, '#ef4444');
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

    showFloatingText(unit, text, color) {
        const tilemap = this.scene.tilemap;
        const { x, y } = tilemap.gridToWorld(unit.tile.gridX, unit.tile.gridY);
        const txt = this.scene.add.text(x, y - 40, text, {
            fontSize: '16px', fontFamily: 'Segoe UI', color, fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(20);
        this.scene.tweens.add({
            targets: txt, y: y - 60, alpha: 0, duration: 800,
            onComplete: () => txt.destroy()
        });
    }

    performGrenadeAttack(attacker, centerTile) {
        if (!attacker.pickedUpGrenade) return;

        attacker.pickedUpGrenade = false;

        const { x, y } = this.scene.tilemap.gridToWorld(centerTile.gridX, centerTile.gridY);
        this.scene.combatVFX.playExplosion(x, y);
        this.scene.cameras.main.shake(250, 0.015);

        const affectedTiles = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const tile = this.scene.tilemap.getTile(
                    centerTile.gridX + dx,
                    centerTile.gridY + dy
                );
                if (tile) affectedTiles.push(tile);
            }
        }

        const GRENADE_DAMAGE = 20;
        affectedTiles.forEach(tile => {
            if (tile.unit && tile.unit.isAlive && tile.unit !== attacker) {
                tile.unit.hp -= GRENADE_DAMAGE;
                tile.unit.lastAttacker = attacker;
                this.showFloatingText(tile.unit, `-${GRENADE_DAMAGE}`, '#ff8800');
                if (tile.unit.hp <= 0) {
                    this.unitManager.killUnit(tile.unit);
                }
            }
        });

        affectedTiles.forEach(tile => {
            if (tile.type === 'cover_low') {
                tile.setType('floor');
                if (tile.sprite) tile.sprite.setFrame(0);
            } else if (tile.type === 'cover_high') {
                tile.setType('rubble');
                if (tile.sprite) tile.sprite.setFrame(4);
            }
        });
    }
}