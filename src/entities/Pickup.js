export class Pickup {

    constructor(scene, tile, type) {
        this.scene = scene;
        this.tile = tile;
        this.type = type;
        this.consumed = false;
        this.sprite = null;
    }


    applyTo(unit) {
        if (this.consumed) return;

        if (this.type === 'medkit') {
            const healAmount = 30;
            const oldHp = unit.hp;
            unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
            const actualHeal = unit.hp - oldHp;

            if (actualHeal > 0 && this.scene.combatManager) {
                this.scene.combatManager.showFloatingText(unit, `+${actualHeal} HP`, '#22c55e');
            }
        }

        if (this.type === 'attack_boost') {
            unit.applyBuff({ type: 'attack', value: 5, duration: 1 });

            if (this.scene.combatManager) {
                this.scene.combatManager.showFloatingText(unit, '+5 ATK', '#f59e0b');
            }
        }

        if (this.type === 'grenade') {
            unit.pickedUpGrenade = true;

            if (this.scene.combatManager) {
                this.scene.combatManager.showFloatingText(unit, '💣 Граната!', '#ff8800');
            }
        }

        this._destroy();
    }

    
    _destroy() {
        this.consumed = true;
        if (this.sprite) {
            this.sprite.destroy();
            this.sprite = null;
        }
        if (this.tile) {
            this.tile.pickup = null;
        }
    }
}
