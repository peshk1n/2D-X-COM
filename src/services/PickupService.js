import { Pickup } from '../entities/Pickup.js';
import { TILE_TYPES } from '../entities/Tile.js';

export class PickupService {

    constructor(scene) {
        this.scene = scene;
        this.pickups = [];
    }

    spawnPickups() {
        this._createTextures();
        const tilemap = this.scene.tilemap;
        const freeTiles = [];

        for (let y = 0; y < tilemap.ROWS; y++) {
            for (let x = 0; x < tilemap.COLS; x++) {
                const tile = tilemap.getTile(x, y);
                if (!tile) continue;
                if (!tile.walkable) continue;       
                if (tile.unit) continue;             
                if (tile.pickup) continue;          
                freeTiles.push(tile);
            }
        }

        if (freeTiles.length === 0) return;
        this._shuffle(freeTiles);
        const count = { medkit: 3, attack_boost: 2 };
        let index = 0;

        for (const [type, amount] of Object.entries(count)) {
            for (let i = 0; i < amount && index < freeTiles.length; i++, index++) {
                this._placePickup(freeTiles[index], type);
            }
        }
    }

    _placePickup(tile, type) {
        const { x, y } = this.scene.tilemap.gridToWorld(tile.gridX, tile.gridY);

        const pickup = new Pickup(this.scene, tile, type);

        const textureKey = type === 'medkit' ? 'pickup_medkit' : 'pickup_attack';
        const sprite = this.scene.add.sprite(x, y, textureKey).setDepth(1);

        this.scene.tweens.add({
            targets: sprite,
            y: y - 6,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        pickup.sprite = sprite;
        tile.pickup = pickup;
        this.pickups.push(pickup);
    }

    _createTextures() {
        if (!this.scene.textures.exists('pickup_medkit')) {
            const g = this.scene.add.graphics();

            g.fillStyle(0xffffff);
            g.fillRoundedRect(0, 0, 24, 20, 4);

            g.fillStyle(0xef4444);
            g.fillRect(9, 3, 6, 14);  
            g.fillRect(4, 7, 16, 6);    

            g.generateTexture('pickup_medkit', 24, 20);
            g.destroy();
        }

        if (!this.scene.textures.exists('pickup_attack')) {
            const g = this.scene.add.graphics();

            g.fillStyle(0xf59e0b);
            g.fillCircle(12, 10, 10);

            g.fillStyle(0xffffff);
            g.fillRect(9, 4, 6, 2);
            g.fillRect(7, 7, 10, 2);
            g.fillRect(9, 10, 6, 2);

            g.generateTexture('pickup_attack', 24, 20);
            g.destroy();
        }
    }

    _shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
}