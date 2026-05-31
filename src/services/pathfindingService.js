export class PathfindingService {
    constructor(grid, cols, rows) {
        this.grid = grid;
        this.cols = cols;
        this.rows = rows;
    }


    getTilesInRange(startTile, range) {
        const visited = new Set();
        const queue = [{ tile: startTile, steps: 0 }];
        const reachable = [];
        visited.add(this._key(startTile));
        let head = 0;
        while ( head < queue.length) {
            const { tile, steps } = queue[head++];
            if (steps > 0) reachable.push(tile);
            if (steps >= range) continue;
            for (const neighbor of this._getNeighbors(tile)) {
                if (!neighbor.walkable) continue;
                if (neighbor.unit && neighbor.unit !== startTile.unit) continue;
                const key = this._key(neighbor);
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push({ tile: neighbor, steps: steps + 1 });
                }
            }
        }
        return reachable;
    }


    findPath(start, end, maxSteps = Infinity, ignoreOtherUnits = false) {

        if (start === end) {
            return [];
        }
        const visited = new Map();

        const queue = [{
            tile: start,
            steps: 0,
            path: []
        }];

        visited.set(this._key(start), 0);

        let head = 0;
        while (head < queue.length) {

            const { tile, steps, path } = queue[head++];

            if (tile === end) {
                return path;
            }

            for (const neighbor of this._getNeighbors(tile)) {
                if (!neighbor.walkable) {
                    continue;
                }

                if (!ignoreOtherUnits &&
                    neighbor.unit &&
                    neighbor !== end &&
                    neighbor.unit !== start.unit
                ) {
                    continue;
                }

                const newSteps = steps + 1;

                if (newSteps > maxSteps) {
                    continue;
                }

                const key = this._key(neighbor);

                if (
                    !visited.has(key) ||
                    visited.get(key) > newSteps
                ) {

                    visited.set(key, newSteps);

                    queue.push({
                        tile: neighbor,
                        steps: newSteps,
                        path: [...path, neighbor]
                    });
                }
            }
        }

        return null;
    }

    getDistance(start, end, maxSteps = Infinity, ignoreOtherUnits = false) {
        if (!start || !end) return Infinity;
        if (start === end) return 0;

        const total = this.cols * this.rows;
        const dist = new Int32Array(total);
        dist.fill(-1);

        const queue = new Array(total);
        let head = 0;
        let tail = 0;

        dist[this._index(start)] = 0;
        queue[tail++] = start;

        while (head < tail) {
            const tile = queue[head++];
            const steps = dist[this._index(tile)];

            if (tile === end) {
                return steps;
            }

            if (steps >= maxSteps) {
                continue;
            }

            for (const neighbor of this._getNeighbors(tile)) {
                if (!neighbor.walkable) {
                    continue;
                }

                if (!ignoreOtherUnits &&
                    neighbor.unit &&
                    neighbor !== end &&
                    neighbor.unit !== start.unit
                ) {
                    continue;
                }

                const idx = this._index(neighbor);
                if (dist[idx] !== -1) {
                    continue;
                }

                dist[idx] = steps + 1;
                queue[tail++] = neighbor;
            }
        }

        return Infinity;
    }

    _getNeighbors(tile) {
        const neighbors = [];
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = tile.gridX + dx;
            const ny = tile.gridY + dy;
            if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                neighbors.push(this.grid[ny][nx]);
            }
        }
        return neighbors;
    }

    pathDistance(a, b) {
        return this.getDistance(a, b, Infinity, true);
    }

    _index(tile) { return tile.gridY * this.cols + tile.gridX; }
    _key(tile) { return `${tile.gridX},${tile.gridY}`; }
}