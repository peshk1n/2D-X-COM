export class Unit {
    constructor(scene, x, y, config) {
        this.scene = scene;
        this.name = config.name;
        this.type = config.type;
        this.role = config.role ?? 'generic';
        this.maxHp = config.hp;
        this.hp = config.hp;
        this.attack = config.attack;
        this.defense = config.defense;
        this.accuracy = config.accuracy;
        this.moveRange = config.moveRange || 3;
        this.actionsLeft = 2;

        this.buffs = [];
        this.extraTurnCharges = 0;
        this.tile = null;
        
        const texture = config.type === 'player' ? 'player_unit' : 'enemy_unit';
        
        this.sprite = scene.add.sprite(x, y, texture).setDepth(5);
        this.marker = scene.add.circle(x, y - 30, 8, 0xffd700).setDepth(6);
        this.marker.setVisible(false);
        this.nameLabel = scene.add.text(x, y - 45, config.name, {
            fontSize: '11px', fontFamily: 'Segoe UI', color: '#64748b'
        }).setOrigin(0.5).setDepth(6);
        this.setupInteractivity();
    }

    get isAlive() {
        return this.hp > 0;
    }

    setTile(tile) {
        if (this.tile && this.tile.unit === this) {
            this.tile.unit = null;
        }

        this.tile = tile;

        if (tile) {
            tile.unit = this;
        }
    }

    hasBuff(type) {
        return this.buffs.some((buff) => buff.type === type);
    }

    applyBuff(buff = {}) {
        if (!buff.type) 
            return null;

        const entry = {
            type: buff.type,
            value: Number.isFinite(buff.value) ? buff.value : 1,
            duration: Number.isFinite(buff.duration) ? buff.duration : 1,
        };

        const existing = this.buffs.find((item) => item.type === entry.type);
        if (existing) {
            existing.duration = Math.max(existing.duration, entry.duration);
            existing.value = Math.max(existing.value, entry.value);
            return existing;
        }

        this.buffs.push(entry);

        if (entry.type === 'speed') {
            this.maxAp += entry.value;
            this.ap = Math.min(this.ap + entry.value, this.maxAp);
        } else if (entry.type === 'attack') {
            this.attack += entry.value;
        } else if (entry.type === 'extra_turn') {
            this.extraTurnCharges += entry.value;
        }

        // console.log(`${this.name} receives buff: ${entry.type} (value: ${entry.value}, duration: ${entry.duration})`);

        return entry;
    }

    tickBuffs() {
        if (this.buffs.length === 0) 
            return;

        const remaining = [];

        for (const buff of this.buffs) {
            buff.duration -= 1;
            if (buff.duration > 0) {
                remaining.push(buff);
                continue;
            }

            this._revertBuff(buff);
        }

        this.buffs = remaining;
    }

    consumeExtraTurn() {
        if (this.extraTurnCharges <= 0)
            return false;

        this.extraTurnCharges -= 1;
        return true;
    }

    _revertBuff(buff) {
        if (buff.type === 'speed') {
            this.maxAp = Math.max(1, this.maxAp - buff.value);
            this.ap = Math.min(this.ap, this.maxAp);
        } else if (buff.type === 'attack') {
            this.attack = Math.max(0, this.attack - buff.value);
        } else if (buff.type === 'extra_turn') {
            this.extraTurnCharges = Math.max(0, this.extraTurnCharges - buff.value);
        }
    }
    
    setupInteractivity() {
        this.sprite.setInteractive();
        this.sprite.on('pointerover', () => {
            if (this.scene.selectedUnit !== this) this.sprite.setTint(0xdddddd);
        });
        this.sprite.on('pointerout', () => {
            if (this.scene.selectedUnit !== this) this.sprite.clearTint();
        });
        this.sprite.on('pointerdown', () => {
            this.scene.selectUnit(this);
        });
    }

    hasActions() { return this.actionsLeft > 0; }
    useAction(amount = 1) { this.actionsLeft = Math.max(0, this.actionsLeft - amount); }
    endTurn() { this.actionsLeft = 0; }

    resetActions() {
        this.actionsLeft = 2;
        this.sprite.setAlpha(1);
    }

    select() {
        this.marker.setVisible(true);
        this.sprite.setTint(this.type === 'player' ? 0x44ff44 : 0xe3e300);
    }

    deselect() {
        this.marker.setVisible(false);
        this.sprite.clearTint();
    }
}