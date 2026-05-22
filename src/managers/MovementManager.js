export class MovementManager {
    constructor(scene) {
        this.scene = scene;
    }

    showMoveRange(unit) {
        this.clearHighlights();
        const pathfinder = this.scene.pathfinder;
        const tilemap = this.scene.tilemap;
        const tiles = pathfinder.getTilesInRange(unit.tile, unit.moveRange);
        tiles.forEach(tile => {
            const { x, y } = tilemap.gridToWorld(tile.gridX, tile.gridY);
            const highlight = this.scene.add.rectangle(x, y, 36, 36, 0x00ff00, 0.3).setDepth(2);
            highlight.setInteractive();
            highlight.on('pointerdown', () => this.moveUnitTo(unit, tile));
            this.scene.highlightedTiles.push(highlight);
        });
    }

    moveUnitTo(unit, targetTile) {
        this.clearHighlights();

        if (this.scene.fogOfWar) {
            this.scene.fogOfWar.hideFog();
        }

        const pathfinder = this.scene.pathfinder;
        const tilemap = this.scene.tilemap;
        const path = pathfinder.findPath(unit.tile, targetTile, unit.moveRange);
        if (!path || path.length === 0) return;

        unit.moveTo(targetTile);

        if (this.scene.fogOfWar) {

            this.scene.fogOfWar.update(
                this.scene.unitManager.getPlayerUnits(),
                this.scene.unitManager.getUnits()
            );
        }

        if (unit.actionsLeft > 0) {
            this.showMoveRange(unit);
        } else {
            this.scene.turnManager.endUnitTurn(unit);
        }
    }

    clearHighlights() {
        this.scene.highlightedTiles.forEach(s => s.destroy());
        this.scene.highlightedTiles = [];
    }
}