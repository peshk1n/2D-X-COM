export class CombatVFX {
    constructor(scene) {
        this.scene = scene;
        this._createTextures();
    }

    _createTextures() {
        if (!this.scene.textures.exists('bullet_vfx')) {
            const g = this.scene.add.graphics();
            g.fillStyle(0xffffaa);
            g.fillRect(0, 0, 18, 4);
            g.generateTexture('bullet_vfx', 18, 4);
            g.destroy();
        }

        if (!this.scene.textures.exists('sniper_beam_vfx')) {
            const g = this.scene.add.graphics();
            g.fillStyle(0x00ffff);
            g.fillRect(0, 0, 40, 3);
            g.generateTexture('sniper_beam_vfx', 40, 3);
            g.destroy();
        }

        if (!this.scene.textures.exists('hit_spark_vfx')) {
            const g = this.scene.add.graphics();
            g.fillStyle(0xffffff);
            g.fillCircle(12, 12, 12);
            g.generateTexture('hit_spark_vfx', 24, 24);
            g.destroy();
        }

        if (!this.scene.textures.exists('blood_vfx')) {
            const g = this.scene.add.graphics();
            g.fillStyle(0xaa0000);
            for (let i = 0; i < 6; i++) {
                const x = Phaser.Math.Between(4, 28);
                const y = Phaser.Math.Between(4, 28);
                const r = Phaser.Math.Between(2, 6);
                g.fillCircle(x, y, r);
            }
            g.generateTexture('blood_vfx', 32, 32);
            g.destroy();
        }

        if (!this.scene.textures.exists('heal_vfx')) {
            const g = this.scene.add.graphics();
            g.fillStyle(0x22c55e);
            g.fillRect(10, 0, 12, 32);
            g.fillRect(0, 10, 32, 12);
            g.generateTexture('heal_vfx', 32, 32);
            g.destroy();
        }
    }

    createMuzzleFlash(unit) {
        const flash = this.scene.add.circle(
            unit.sprite.x,
            unit.sprite.y,
            10,
            0xffee88
        ).setDepth(50);

        this.scene.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2,
            duration: 120,
            onComplete: () => flash.destroy()
        });
    }

    playBulletShot(attacker, defender) {
        this.createMuzzleFlash(attacker);

        const bullet = this.scene.add.sprite(
            attacker.sprite.x,
            attacker.sprite.y,
            'bullet_vfx'
        ).setDepth(40);

        const angle = Phaser.Math.Angle.Between(
            attacker.sprite.x,
            attacker.sprite.y,
            defender.sprite.x,
            defender.sprite.y
        );

        bullet.setRotation(angle);

        this.scene.tweens.add({
            targets: bullet,
            x: defender.sprite.x,
            y: defender.sprite.y,
            duration: 120,
            ease: 'Linear',
            onComplete: () => {
                bullet.destroy();
                this.playHitEffect(defender);
            }
        });
    }

    playSniperShot(attacker, defender) {
        const beam = this.scene.add.sprite(
            attacker.sprite.x,
            attacker.sprite.y,
            'sniper_beam_vfx'
        ).setOrigin(0, 0.5).setDepth(45).setAlpha(0.95);

        const angle = Phaser.Math.Angle.Between(
            attacker.sprite.x,
            attacker.sprite.y,
            defender.sprite.x,
            defender.sprite.y
        );

        const distance = Phaser.Math.Distance.Between(
            attacker.sprite.x,
            attacker.sprite.y,
            defender.sprite.x,
            defender.sprite.y
        );

        beam.setRotation(angle);
        beam.setDisplaySize(distance, 3);

        this.scene.tweens.add({
            targets: beam,
            alpha: 0,
            duration: 140,
            onComplete: () => {
                beam.destroy();
                this.playBigHitEffect(defender);
            }
        });
    }

    playMeleeHit(attacker, defender) {
        const slash = this.scene.add.rectangle(
            defender.sprite.x,
            defender.sprite.y,
            50,
            10,
            0xffffff
        ).setDepth(50).setAngle(-45);

        this.scene.tweens.add({
            targets: slash,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 2,
            duration: 140,
            onComplete: () => slash.destroy()
        });

        this.playBlood(defender);
    }

    playHealEffect(unit) {
        const heal = this.scene.add.sprite(
            unit.sprite.x,
            unit.sprite.y,
            'heal_vfx'
        ).setDepth(45).setAlpha(0.85);

        this.scene.tweens.add({
            targets: heal,
            y: unit.sprite.y - 40,
            alpha: 0,
            duration: 600,
            onComplete: () => heal.destroy()
        });
    }

    playHitEffect(unit) {
        const spark = this.scene.add.sprite(
            unit.sprite.x,
            unit.sprite.y,
            'hit_spark_vfx'
        ).setDepth(50).setScale(0.4);

        this.scene.tweens.add({
            targets: spark,
            scale: 1.6,
            alpha: 0,
            duration: 180,
            onComplete: () => spark.destroy()
        });

        this.playBlood(unit);
        this.shakeUnit(unit, 2);
    }

    playBigHitEffect(unit) {
        const spark = this.scene.add.sprite(
            unit.sprite.x,
            unit.sprite.y,
            'hit_spark_vfx'
        ).setDepth(50).setScale(0.7);

        this.scene.tweens.add({
            targets: spark,
            scale: 2.8,
            alpha: 0,
            duration: 240,
            onComplete: () => spark.destroy()
        });

        this.playBlood(unit);
        this.shakeUnit(unit, 5);
    }

    playBlood(unit) {
        const blood = this.scene.add.sprite(
            unit.sprite.x,
            unit.sprite.y,
            'blood_vfx'
        ).setDepth(30).setAlpha(0.85).setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

        this.scene.tweens.add({
            targets: blood,
            alpha: 0,
            duration: 700,
            onComplete: () => blood.destroy()
        });
    }

    playMissEffect(defender) {
        const miss = this.scene.add.text(
            defender.sprite.x,
            defender.sprite.y - 20,
            'MISS',
            {
                fontSize: '18px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setDepth(60);

        this.scene.tweens.add({
            targets: miss,
            y: defender.sprite.y - 50,
            alpha: 0,
            duration: 500,
            onComplete: () => miss.destroy()
        });
    }

    shakeUnit(unit, intensity = 3) {
        const originalX = unit.sprite.x;

        this.scene.tweens.add({
            targets: unit.sprite,
            x: originalX + intensity,
            yoyo: true,
            repeat: 3,
            duration: 40,
            onComplete: () => {
                unit.sprite.x = originalX;
            }
        });
    }
}