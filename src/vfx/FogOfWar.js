import { TILE_TYPES } from '../entities/Tile.js';

export class FogOfWar {
    constructor(scene, tilemapService, config = {}) {
        this.scene = scene;
        this.tilemap = tilemapService;
        this.visionRange = config.visionRange ?? 7;
        this.fogSprites = [];
        this.exploredTiles = new Set();
        this._createFogTexture();
    }

    isExplored(tile) {
        return this.exploredTiles.has(`${tile.gridX},${tile.gridY}`);
    }

    _createFogTexture() {
        const { width, height } = this._getTextureSize();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < 30; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const w = 4 + Math.random() * 12;
            const h = 2 + Math.random() * 6;
            const colors = ['#ff00ff', '#00ffff', '#ff6600', '#ffffff', '#44ff44'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(x, y, w, h);
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * 5);
            ctx.lineTo(width, i * 5);
            ctx.stroke();
        }

        ctx.fillStyle = '#ff000066';
        ctx.fillRect(5, 10, 15, 8);
        ctx.fillStyle = '#00ff0066';
        ctx.fillRect(20, 25, 12, 6);

        this.scene.textures.addCanvas('fog_overlay', canvas);
    }

    _getTextureSize() {
        const TS = this.tilemap.TILE_SIZE || 40;
        return { width: TS, height: TS };
    }

    render() {
        const TS = this.tilemap.TILE_SIZE;
        const ox = this.tilemap.offsetX;
        const oy = this.tilemap.offsetY;
        const cols = this.tilemap.COLS;
        const rows = this.tilemap.ROWS;

        this.fogSprites = [];

        for (let y = 0; y < rows; y++) {
            this.fogSprites[y] = [];

            for (let x = 0; x < cols; x++) {
                const tile = this.tilemap.getTile(x, y);

                if (
                    tile &&
                    (
                        tile.type === TILE_TYPES.WALL ||
                        tile.type === TILE_TYPES.COVER_HIGH
                    )
                ) {
                    this.fogSprites[y][x] = null;
                    continue;
                }

                const px = ox + x * TS + TS / 2;
                const py = oy + y * TS + TS / 2;

                const fog = this.scene.add.sprite(px, py, 'fog_overlay')
                    .setDepth(2)
                    .setVisible(true);

                this.fogSprites[y][x] = fog;
            }
        }
    }

    _isTileOpaque(tile) {
        // Только стены блокируют обзор
        // За высокими укрытиями цель видна, но получает бонус к защите
        return tile.type === TILE_TYPES.WALL;
    }

        computeVisibleTiles(playerUnits) {
        const visible = new Set();

        for (const unit of playerUnits) {
            const startTile = unit.tile;
            
            // Добавляем тайл самого юнита
            visible.add(`${startTile.gridX},${startTile.gridY}`);
            
            // Перебираем все тайлы в пределах visionRange
            for (let dx = -this.visionRange; dx <= this.visionRange; dx++) {
                for (let dy = -this.visionRange; dy <= this.visionRange; dy++) {
                    const checkX = startTile.gridX + dx;
                    const checkY = startTile.gridY + dy;
                    
                    // Проверяем, что тайл существует
                    const targetTile = this.tilemap.getTile(checkX, checkY);
                    if (!targetTile) continue;
                    
                    // Проверяем дистанцию (чебышевская)
                    const distance = Math.max(Math.abs(dx), Math.abs(dy));
                    if (distance > this.visionRange) continue;
                    
                    // Проверяем Line of Sight
                    if (this.hasLineOfSight(startTile, targetTile, this.visionRange)) {
                        visible.add(`${checkX},${checkY}`);
                    }
                }
            }
        }

        return visible;
    }

    computeMovementTiles(unit) {
        const reachable = new Set();

        const startPos = this.tilemap.worldToGrid(
            unit.sprite.x,
            unit.sprite.y
        );

        const queue = [{
            x: startPos.x,
            y: startPos.y,
            dist: 0
        }];

        const visited = new Set();

        visited.add(`${startPos.x},${startPos.y}`);
        reachable.add(`${startPos.x},${startPos.y}`);

        while (queue.length > 0) {
            const { x, y, dist } = queue.shift();

            if (dist >= unit.moveRange) {
                continue;
            }

            const neighbors = [
                { x: x + 1, y },
                { x: x - 1, y },
                { x, y: y + 1 },
                { x, y: y - 1 }
            ];

            for (const n of neighbors) {
                const key = `${n.x},${n.y}`;

                if (visited.has(key)) {
                    continue;
                }

                const tile = this.tilemap.getTile(n.x, n.y);

                if (!tile || tile.unit) {
                    continue;
                }

                visited.add(key);
                reachable.add(key);

                queue.push({
                    x: n.x,
                    y: n.y,
                    dist: dist + 1
                });
            }
        }

        return reachable;
    }

    _updateFogOverlay(visibleTiles) {
        for (const key of visibleTiles) {
            this.exploredTiles.add(key);
        }

        for (let y = 0; y < this.tilemap.ROWS; y++) {
            for (let x = 0; x < this.tilemap.COLS; x++) {
                const fog = this.fogSprites[y]?.[x];

                if (!fog) {
                    continue;
                }

                const key = `${x},${y}`;
                const explored = this.exploredTiles.has(key);
                fog.setVisible(!explored);
            }
        }
    }

    hideFog() {
        for (let y = 0; y < this.tilemap.ROWS; y++) {
            for (let x = 0; x < this.tilemap.COLS; x++) {
                const fog = this.fogSprites[y]?.[x];
                if (fog) {
                    fog.setVisible(false);
                }
            }
        }
    }

    showFog(visibleTiles) {
        this._updateFogOverlay(visibleTiles);
    }

    hasLineOfSight(startTile, endTile, visionRange = null) {
        // Проверяем дистанцию между тайлами
        const dx = Math.abs(startTile.gridX - endTile.gridX);
        const dy = Math.abs(startTile.gridY - endTile.gridY);
        const distance = Math.max(dx, dy);
        
        // Используем переданную дистанцию или стандартную из класса
        const maxRange = visionRange !== null ? visionRange : this.visionRange;
        
        // Если дистанция больше дальности зрения - нет видимости
        if (distance > maxRange) {
            return false;
        }
        
        // Если начальная и конечная позиция совпадают
        if (startTile.gridX === endTile.gridX && startTile.gridY === endTile.gridY) {
            return true;
        }
        
        // Алгоритм Брезенхема для линии между центрами тайлов
        let x0 = startTile.gridX;
        let y0 = startTile.gridY;
        let x1 = endTile.gridX;
        let y1 = endTile.gridY;
        
        const deltaX = Math.abs(x1 - x0);
        const deltaY = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = deltaX - deltaY;
        let x = x0;
        let y = y0;
        
        while (true) {
            // Пропускаем начальную и конечную позицию
            if (!(x === startTile.gridX && y === startTile.gridY) && 
                !(x === endTile.gridX && y === endTile.gridY)) {
                
                const tile = this.tilemap.getTile(x, y);
                // Если тайл существует и непрозрачный - видимости нет
                if (tile && this._isTileOpaque(tile)) {
                    return false;
                }
            }
            
            if (x === x1 && y === y1) break;
            
            const e2 = 2 * err;
            if (e2 > -deltaY) {
                err -= deltaY;
                x += sx;
            }
            if (e2 < deltaX) {
                err += deltaX;
                y += sy;
            }
        }
        
        return true;
    }

    _updateUnitVisibility(allUnits, visibleTiles, selectedUnit = null) {
        for (const unit of allUnits) {
            if (unit.type === 'player') {
                unit.sprite.setVisible(true);
                unit.nameLabel.setVisible(true);

                if (unit.marker) {
                    unit.marker.setVisible(selectedUnit === unit);
                }

                if (unit.sprite.input) {
                    unit.sprite.input.enabled = true;
                }

                continue;
            }

            const endTile = {
                gridX: this.tilemap.worldToGrid(unit.sprite.x, unit.sprite.y).x,
                gridY: this.tilemap.worldToGrid(unit.sprite.x, unit.sprite.y).y
            };

            let hasDirectLoS = false;
            
            // Проверяем прямую видимость от каждого игрового юнита
            for (const playerUnit of allUnits) {
                if (playerUnit.type !== 'player') continue;
                
                const startTile = {
                    gridX: this.tilemap.worldToGrid(playerUnit.sprite.x, playerUnit.sprite.y).x,
                    gridY: this.tilemap.worldToGrid(playerUnit.sprite.x, playerUnit.sprite.y).y
                };
                
                if (this.hasLineOfSight(startTile, endTile)) {
                    hasDirectLoS = true;
                    break;
                }
            }
            
            unit.sprite.setVisible(hasDirectLoS);
            unit.nameLabel.setVisible(hasDirectLoS);

            if (unit.marker) {
                unit.marker.setVisible(
                    hasDirectLoS && selectedUnit === unit
                );
            }

            if (unit.sprite.input) {
                unit.sprite.input.enabled = hasDirectLoS;
            }
        }
    }

    update(playerUnits, allUnits, selectedUnit = null) {
        const visibleTiles = this.computeVisibleTiles(playerUnits);
        this._updateFogOverlay(visibleTiles);
        this._updateUnitVisibility(
            allUnits,
            visibleTiles,
            selectedUnit
        );
    }

    setVisionRange(newRange) {
        this.visionRange = newRange;
    }
}