import { Unit } from '../entities/Unit.js';

export class UnitManager {
    constructor(scene) {
        this.scene = scene;
        this.playerUnits = [];
        this.enemyUnits = [];
        this.allUnits = [];
    }

    createUnits(tilemapService) {
        const toXY = (tile) => tilemapService.gridToWorld(tile.gridX, tile.gridY);
        
        // Получаем все тайлы со всей карты
        const allTiles = [];
        const tilemap = tilemapService.getTilemap?.() || tilemapService.tilemap;
        
        if (tilemap) {
            for (let x = 0; x < tilemap.width; x++) {
                for (let y = 0; y < tilemap.height; y++) {
                    const tile = tilemapService.getTileAt(x, y);
                    if (tile && this.isSpawnableTile(tile)) {
                        allTiles.push(tile);
                    }
                }
            }
        }
        
        if (allTiles.length === 0) {
            const allSpawnTiles = tilemapService.getAllTiles?.() || 
                                 tilemapService.getSpawnTiles?.('all', 1000) || 
                                 tilemapService.getAllSpawnTiles?.() || [];
            allTiles.push(...allSpawnTiles);
        }
        
        // Определяем юнитов
        const playerDefs = [
            { name: 'Медик', hp: 100, attack: 10, defense: 8, accuracy: 70, role: 'medic' },
            { name: 'Снайпер', hp: 80, attack: 15, defense: 5, accuracy: 85, role: 'sniper' },
            { name: 'Штурмовик', hp: 120, attack: 18, defense: 10, accuracy: 65, role: 'assault' },
        ];
        
        const enemyDefs = {
            alings: [
                { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm" }
            ],
            sniper: { name: 'Вражеский снайпер', hp: 70, ap: 2, attack: 16, defense: 4, accuracy: 85, role: 'sniper' },
            brute: { name: 'Толстяк', hp: 130, ap: 1, attack: 22, defense: 8, accuracy: 60, role: 'brute' },
            mage: { name: 'Маг', hp: 80, ap: 2, attack: 8, defense: 4, accuracy: 70, role: 'support', textureKey: 'enemy_support_unit' },
            summoner: { name: 'Призыватель', hp: 60, ap: 2, attack: 6, defense: 4, accuracy: 60, role: 'summoner', moveRange: 2, maxSummonedUnits: 3,minionRoles: ['swarm'],minionConfigs: [{ 
                    name: 'Алинг (миньон)', hp: 25, attack: 15, defense: 8, accuracy: 50, role: "swarm", moveRange: 4 
                }]
            }
        };

        // Гарантированно получаем 8 тайлов
        const selectedTiles = this.ensureMinimumTiles(allTiles, 8);
        
        if (!selectedTiles || selectedTiles.length < 8) {
            console.error('КРИТИЧЕСКАЯ ОШИБКА: Невозможно получить 8 тайлов для спавна юнитов');
            return this.createUnitsWithFallback(tilemapService, selectedTiles, playerDefs, enemyDefs);
        }

        const assignments = this.assignAllPositions(selectedTiles, playerDefs, enemyDefs);
        
        // Финальная проверка и гарантированное заполнение всех 8 слотов
        const finalAssignments = this.ensureAllUnitsAssigned(assignments, selectedTiles, playerDefs, enemyDefs);
        
        finalAssignments.forEach((assignment) => {
            const { tile, def, type } = assignment;
            const { x, y } = toXY(tile);
            const unit = new Unit(this.scene, x, y, { ...def, type: type });
            unit.setTile(tile);
            
            if (type === 'player') {
                this.playerUnits.push(unit);
            } else {
                this.enemyUnits.push(unit);
            }
            this.allUnits.push(unit);
        });
        
        console.log(`Заспавнено ${this.allUnits.length} юнитов: ${this.playerUnits.length} игроков, ${this.enemyUnits.length} врагов`);
    }

    createUnitsWithFallback(tilemapService, selectedTiles, playerDefs, enemyDefs) {
        const toXY = (tile) => tilemapService.gridToWorld(tile?.gridX || 0, tile?.gridY || 0);
        const tiles = selectedTiles || [];
        
        playerDefs.forEach((def, index) => {
            const tile = tiles[index] || { gridX: index, gridY: 0 };
            const { x, y } = toXY(tile);
            const unit = new Unit(this.scene, x, y, { ...def, type: 'player' });
            unit.setTile(tile);
            this.playerUnits.push(unit);
            this.allUnits.push(unit);
        });
        
        const enemyList = [
            enemyDefs.mage,
            enemyDefs.sniper,
            enemyDefs.alings[0],
            enemyDefs.brute,
            enemyDefs.summoner
        ];
        
        enemyList.forEach((def, index) => {
            const tile = tiles[index + 3] || { gridX: index + 3, gridY: 0 };
            const { x, y } = toXY(tile);
            const unit = new Unit(this.scene, x, y, { ...def, type: 'enemy' });
            unit.setTile(tile);
            this.enemyUnits.push(unit);
            this.allUnits.push(unit);
        });
    }

    ensureMinimumTiles(allTiles, minCount) {
        if (!allTiles || allTiles.length === 0) {
            console.error('Нет доступных тайлов для спавна');
            return [];
        }
        
        if (allTiles.length >= minCount) {
            return this.getRandomTilesFromAllMap(allTiles, minCount);
        }
        
        console.warn(`Доступно только ${allTiles.length} тайлов, пытаемся дополнить до ${minCount}`);
        
        const extendedTiles = [...allTiles];
        let attempts = 0;
        const maxAttempts = minCount * 10;
        
        while (extendedTiles.length < minCount && attempts < maxAttempts) {
            const sourceTile = allTiles[Math.floor(Math.random() * allTiles.length)];
            const virtualTile = this.createVirtualTile(sourceTile, extendedTiles);
            if (virtualTile) {
                extendedTiles.push(virtualTile);
            }
            attempts++;
        }
        
        if (extendedTiles.length < minCount) {
            for (let i = extendedTiles.length; i < minCount; i++) {
                const virtualTile = {
                    gridX: (i * 3) % 20,
                    gridY: Math.floor(i / 3),
                    properties: {},
                    isVirtual: true
                };
                extendedTiles.push(virtualTile);
            }
        }
        
        return extendedTiles;
    }

    createVirtualTile(sourceTile, existingTiles) {
        if (!sourceTile) return null;
        
        const directions = [
            { dx: 0, dy: 1 }, { dx: 1, dy: 0 }, 
            { dx: 0, dy: -1 }, { dx: -1, dy: 0 },
            { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, 
            { dx: 1, dy: -1 }, { dx: -1, dy: -1 }
        ];
        
        const shuffled = directions.sort(() => Math.random() - 0.5);
        
        for (const dir of shuffled) {
            const newX = sourceTile.gridX + dir.dx;
            const newY = sourceTile.gridY + dir.dy;
            
            const exists = existingTiles.some(t => t.gridX === newX && t.gridY === newY);
            if (!exists) {
                return {
                    gridX: newX,
                    gridY: newY,
                    properties: {},
                    isVirtual: true
                };
            }
        }
        
        return null;
    }

    isSpawnableTile(tile) {
        if (!tile) return false;
        if (tile.isVirtual) return true;
        if (tile.properties) {
            if (tile.properties.isWall || tile.properties.isObstacle || tile.properties.isBlocked) {
                return false;
            }
        }
        if (tile.unit) return false;
        return true;
    }

    getRandomTilesFromAllMap(allTiles, count) {
        if (!allTiles || allTiles.length === 0) return [];
        
        const shuffled = [...allTiles];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    assignAllPositions(allTiles, playerDefs, enemyDefs) {
        if (allTiles.length < 8) {
            console.warn(`Недостаточно тайлов (${allTiles.length}) для всех юнитов, продолжаем с доступными`);
        }

        const assignments = [];
        const usedTiles = new Set();

        const shuffledTiles = this.getRandomTilesFromAllMap(allTiles, allTiles.length);
        if (shuffledTiles.length === 0) return assignments;
        
        const playerCenter = shuffledTiles[0];
        
        const tilesByDistanceToPlayerCenter = [...shuffledTiles]
            .filter(t => t !== playerCenter)
            .sort((a, b) => {
                const distA = Math.abs(a.gridX - playerCenter.gridX) + Math.abs(a.gridY - playerCenter.gridY);
                const distB = Math.abs(b.gridX - playerCenter.gridX) + Math.abs(b.gridY - playerCenter.gridY);
                return distA - distB;
            });
        
        const playerZone = [playerCenter, ...tilesByDistanceToPlayerCenter.slice(0, 2)];
        const enemyZone = tilesByDistanceToPlayerCenter.slice(2, 7);
        
        if (enemyZone.length < 5) {
            const remainingTiles = shuffledTiles.filter(t => !playerZone.includes(t) && !enemyZone.includes(t));
            enemyZone.push(...remainingTiles.slice(0, 5 - enemyZone.length));
        }
        
        const enemyPositions = this.calculateEnemyPositionsByDistance(enemyZone, playerZone);
        const playerPositions = this.calculatePlayerPositionsByDistance(playerZone, enemyZone);
        
        // Расставляем игроков
        const playerAssignments = this.assignPlayerPositionsGuaranteed(playerPositions, playerDefs, allTiles);
        playerAssignments.forEach(a => {
            assignments.push({ ...a, type: 'player' });
            usedTiles.add(a.tile);
        });

        // Расставляем врагов с передачей информации об игроках
        const enemyAssignments = this.assignEnemyPositionsGuaranteed(enemyPositions, enemyDefs, allTiles, usedTiles, playerAssignments);
        enemyAssignments.forEach(a => {
            assignments.push({ ...a, type: 'enemy' });
            usedTiles.add(a.tile);
        });

        return assignments;
    }

    assignPlayerPositionsGuaranteed(positions, playerDefs, allTiles) {
        const assignments = [];
        const usedTiles = new Set();
        
        const strategicAssignments = this.assignPlayerPositions(positions, playerDefs);
        
        const assignedDefs = new Set(strategicAssignments.filter(a => a).map(a => a.def));
        
        playerDefs.forEach(def => {
            if (!assignedDefs.has(def)) {
                const availableTile = this.findAnyAvailableTile(allTiles, usedTiles);
                if (availableTile) {
                    assignments.push({ tile: availableTile, def: def });
                    usedTiles.add(availableTile);
                }
            }
        });
        
        strategicAssignments.forEach(a => {
            if (a && a.tile && a.def) {
                if (!assignments.some(existing => existing.def === a.def)) {
                    assignments.push(a);
                    usedTiles.add(a.tile);
                }
            }
        });
        
        return assignments.slice(0, 3);
    }

    assignEnemyPositionsGuaranteed(positions, enemyDefs, allTiles, usedTiles, playerAssignments) {
        const assignments = [];
        const allUsedTiles = new Set(usedTiles);
        
        const strategicAssignments = this.assignEnemyPositions(positions, enemyDefs, allUsedTiles, playerAssignments);
        
        const requiredEnemies = [
            enemyDefs.mage,
            enemyDefs.sniper,
            enemyDefs.alings[0],
            enemyDefs.brute,
            enemyDefs.summoner
        ];
        
        const assignedDefs = new Set();
        strategicAssignments.forEach(a => {
            if (a && a.tile && a.def) {
                assignments.push(a);
                allUsedTiles.add(a.tile);
                assignedDefs.add(a.def);
            }
        });
        
        requiredEnemies.forEach(def => {
            if (!assignedDefs.has(def)) {
                const availableTile = this.findAnyAvailableTile(allTiles, allUsedTiles);
                if (availableTile) {
                    assignments.push({ tile: availableTile, def: def });
                    allUsedTiles.add(availableTile);
                } else {
                    console.warn(`Не удалось найти тайл для врага: ${def.name}`);
                }
            }
        });
        
        return assignments.slice(0, 5);
    }

    findAnyAvailableTile(allTiles, usedTiles) {
        const available = allTiles.filter(tile => !usedTiles.has(tile));
        if (available.length > 0) {
            return available[Math.floor(Math.random() * available.length)];
        }
        
        const virtualTiles = allTiles.filter(t => t.isVirtual && !usedTiles.has(t));
        if (virtualTiles.length > 0) {
            return virtualTiles[0];
        }
        
        return null;
    }

    ensureAllUnitsAssigned(assignments, selectedTiles, playerDefs, enemyDefs) {
        const requiredCount = {
            player: 3,
            enemy: 5
        };
        
        const currentCount = {
            player: assignments.filter(a => a.type === 'player').length,
            enemy: assignments.filter(a => a.type === 'enemy').length
        };
        
        const usedTiles = new Set(assignments.map(a => a.tile));
        const result = [...assignments];
        
        if (currentCount.player < requiredCount.player) {
            const missingPlayerDefs = playerDefs.slice(currentCount.player);
            missingPlayerDefs.forEach(def => {
                const availableTile = this.findAnyAvailableTile(selectedTiles, usedTiles);
                if (availableTile) {
                    result.push({ tile: availableTile, def: def, type: 'player' });
                    usedTiles.add(availableTile);
                }
            });
        }
        
        if (currentCount.enemy < requiredCount.enemy) {
            const allEnemyDefs = [
                enemyDefs.mage,
                enemyDefs.sniper,
                enemyDefs.alings[0],
                enemyDefs.brute,
                enemyDefs.summoner
            ];
            
            const assignedEnemyRoles = new Set(
                result
                    .filter(a => a.type === 'enemy')
                    .map(a => a.def.role)
            );
            
            const missingEnemyDefs = allEnemyDefs.filter(def => !assignedEnemyRoles.has(def.role));
            
            missingEnemyDefs.forEach(def => {
                const availableTile = this.findAnyAvailableTile(selectedTiles, usedTiles);
                if (availableTile) {
                    result.push({ tile: availableTile, def: def, type: 'enemy' });
                    usedTiles.add(availableTile);
                }
            });
        }
        
        return result;
    }

    calculateEnemyPositionsByDistance(enemyTiles, playerTiles) {
        if (enemyTiles.length === 0 || playerTiles.length === 0) {
            return { 1: [], 2: [], 3: [], 4: [] };
        }

        const avgPlayerX = playerTiles.reduce((sum, t) => sum + t.gridX, 0) / playerTiles.length;
        const avgPlayerY = playerTiles.reduce((sum, t) => sum + t.gridY, 0) / playerTiles.length;
        
        const sortedByDistance = [...enemyTiles].sort((a, b) => {
            const distA = Math.sqrt((a.gridX - avgPlayerX) ** 2 + (a.gridY - avgPlayerY) ** 2);
            const distB = Math.sqrt((b.gridX - avgPlayerX) ** 2 + (b.gridY - avgPlayerY) ** 2);
            return distA - distB;
        });
        
        return {
            1: sortedByDistance.slice(0, 1),
            2: sortedByDistance.slice(1, 2),
            3: sortedByDistance.slice(2, 3),
            4: sortedByDistance.slice(3, 5)
        };
    }

    calculatePlayerPositionsByDistance(playerTiles, enemyTiles) {
        if (playerTiles.length === 0 || enemyTiles.length === 0) {
            return { 1: [], 2: [], 3: [] };
        }

        const avgEnemyX = enemyTiles.reduce((sum, t) => sum + t.gridX, 0) / enemyTiles.length;
        const avgEnemyY = enemyTiles.reduce((sum, t) => sum + t.gridY, 0) / enemyTiles.length;
        
        const sortedByDistance = [...playerTiles].sort((a, b) => {
            const distA = Math.sqrt((a.gridX - avgEnemyX) ** 2 + (a.gridY - avgEnemyY) ** 2);
            const distB = Math.sqrt((b.gridX - avgEnemyX) ** 2 + (b.gridY - avgEnemyY) ** 2);
            return distA - distB;
        });
        
        return {
            1: sortedByDistance.slice(0, 1),
            2: sortedByDistance.slice(1, 2),
            3: sortedByDistance.slice(2, 3)
        };
    }

    assignPlayerPositions(positions, playerDefs) {
        if (!positions[1]?.length || !positions[2]?.length || !positions[3]?.length) {
            console.warn('Недостаточно тайлов для оптимального размещения игроков');
            return [];
        }

        const assignments = [];
        const usedTiles = new Set();
        const medic = playerDefs.find(d => d.role === 'medic');
        const sniper = playerDefs.find(d => d.role === 'sniper');
        const assault = playerDefs.find(d => d.role === 'assault');

        // Медик: позиции 2-3, высокий приоритет укрытий, LOS к союзнику
        const medicPositions = [...positions[2], ...positions[3]];
        const medicTile = this.getMedicTileImproved(medicPositions, usedTiles, positions);
        if (medicTile && medic) {
            assignments.push({ tile: medicTile, def: medic });
            usedTiles.add(medicTile);
        }

        // Снайпер: позиции 2-3, высокий приоритет укрытий
        const sniperPositions = [...positions[2], ...positions[3]].filter(t => !usedTiles.has(t));
        const sniperTile = this.getSniperTile(sniperPositions, usedTiles);
        if (sniperTile && sniper) {
            assignments.push({ tile: sniperTile, def: sniper });
            usedTiles.add(sniperTile);
        }

        // Штурмовик: позиции 1-2, ниже вероятность рядом со снайпером, выше - с медиком
        const assaultPositions = [...positions[1], ...positions[2]].filter(t => !usedTiles.has(t));
        const assaultTile = this.getAssaultTileImproved(assaultPositions, usedTiles, assignments);
        if (assaultTile && assault) {
            assignments.push({ tile: assaultTile, def: assault });
            usedTiles.add(assaultTile);
        }

        return assignments;
    }

    // Улучшенный метод для медика с гарантированным LOS
    getMedicTileImproved(availableTiles, usedTiles, allPositions) {
        const available = availableTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) return null;

        // Сначала ищем тайлы с укрытием
        const tilesWithCover = this.sortByCoverPriority(available);
        
        // Ищем тайлы с LOS к любой возможной позиции союзника
        const tilesWithLOS = tilesWithCover.filter(tile => {
            // Проверяем все незанятые позиции союзников
            for (const pos of [1, 2, 3]) {
                if (allPositions[pos]) {
                    for (const allyTile of allPositions[pos]) {
                        if (allyTile !== tile && !usedTiles.has(allyTile)) {
                            if (this.hasLineOfSight(tile, allyTile)) {
                                return true;
                            }
                        }
                    }
                }
            }
            // Если нет незанятых, проверяем все возможные позиции
            for (const pos of [1, 2, 3]) {
                if (allPositions[pos]) {
                    for (const allyTile of allPositions[pos]) {
                        if (allyTile !== tile) {
                            if (this.hasLineOfSight(tile, allyTile)) {
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        });

        if (tilesWithLOS.length > 0) {
            return tilesWithLOS[0];
        }
        
        if (tilesWithCover.length > 0) {
            // Если нет LOS, выбираем лучший с укрытием
            for (const tile of tilesWithCover) {
                // Проверяем хотя бы примерный LOS к центру союзников
                const allyCenter = this.calculateAllyCenter(allPositions);
                if (allyCenter && this.hasLineOfSight(tile, allyCenter)) {
                    return tile;
                }
            }
            return tilesWithCover[0];
        }
        
        return this.getRandomFromArray(available);
    }

    calculateAllyCenter(allPositions) {
        let totalX = 0, totalY = 0, count = 0;
        for (const pos of [1, 2, 3]) {
            if (allPositions[pos]) {
                for (const tile of allPositions[pos]) {
                    totalX += tile.gridX;
                    totalY += tile.gridY;
                    count++;
                }
            }
        }
        return count > 0 ? { gridX: Math.round(totalX / count), gridY: Math.round(totalY / count) } : null;
    }

    getSniperTile(availableTiles, usedTiles) {
        const available = availableTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) return null;

        const tilesWithCover = this.sortByCoverPriority(available);
        return tilesWithCover.length > 0 ? tilesWithCover[0] : this.getRandomFromArray(available);
    }

    // Улучшенный метод для штурмовика с вероятностным подходом
    getAssaultTileImproved(availableTiles, usedTiles, existingAssignments) {
        let available = availableTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) return null;

        const sniperAssignment = existingAssignments.find(a => a?.def?.role === 'sniper');
        const medicAssignment = existingAssignments.find(a => a?.def?.role === 'medic');
        
        // Правило: ниже вероятность рядом со снайпером, выше - с медиком
        let weightedTiles = [];
        
        available.forEach(tile => {
            let weight = 1.0;
            
            if (sniperAssignment?.tile) {
                const distToSniper = Math.abs(tile.gridX - sniperAssignment.tile.gridX) + 
                                    Math.abs(tile.gridY - sniperAssignment.tile.gridY);
                // Значительно понижаем вес для близких к снайперу
                if (distToSniper <= 2) weight *= 0.3;
                else if (distToSniper <= 3) weight *= 0.6;
            }
            
            if (medicAssignment?.tile) {
                const distToMedic = Math.abs(tile.gridX - medicAssignment.tile.gridX) + 
                                   Math.abs(tile.gridY - medicAssignment.tile.gridY);
                // Повышаем вес для близких к медику
                if (distToMedic <= 2) weight *= 2.0;
                else if (distToMedic <= 3) weight *= 1.5;
            }
            
            weightedTiles.push({ tile, weight });
        });
        
        // Сортируем по весу и выбираем из лучших
        weightedTiles.sort((a, b) => b.weight - a.weight);
        
        // Берем случайный тайл из топ-50%
        const topCount = Math.max(1, Math.ceil(weightedTiles.length / 2));
        const selectedIndex = Math.floor(Math.random() * topCount);
        
        return weightedTiles[selectedIndex].tile;
    }

    hasLineOfSight(tile1, tile2) {
        const dx = Math.abs(tile1.gridX - tile2.gridX);
        const dy = Math.abs(tile1.gridY - tile2.gridY);
        const distance = dx + dy;
        
        if (distance > 5) return false;
        
        const steps = Math.max(dx, dy);
        if (steps === 0) return true;
        
        const xStep = (tile2.gridX - tile1.gridX) / steps;
        const yStep = (tile2.gridY - tile1.gridY) / steps;
        
        for (let i = 1; i < steps; i++) {
            const checkX = Math.round(tile1.gridX + xStep * i);
            const checkY = Math.round(tile1.gridY + yStep * i);
            
            if (tile1.tilemap) {
                const checkTile = tile1.tilemap.getTileAt(checkX, checkY);
                if (checkTile && (checkTile.properties?.isWall || checkTile.properties?.isObstacle)) {
                    return false;
                }
            }
        }
        
        return true;
    }

    assignEnemyPositions(positions, enemyDefs, usedTiles, playerAssignments) {
        const assignments = [];
        const playerSniper = playerAssignments?.find(a => a?.def?.role === 'sniper');
        const playerMedic = playerAssignments?.find(a => a?.def?.role === 'medic');
    
        // 1. Размещаем мага (позиции 2-3)
        const magePositions = [...(positions[2] || []), ...(positions[3] || [])];
        const mageTile = this.getRandomTileFromPosition(magePositions, usedTiles);
        if (mageTile) {
            assignments.push({ tile: mageTile, def: enemyDefs.mage });
            usedTiles.add(mageTile);
        }
    
        // 2. Размещаем снайпера (позиции 2-4, высокий приоритет укрытий)
        const sniperPositions = this.sortByCoverPriority([
            ...(positions[2] || []), 
            ...(positions[3] || []), 
            ...(positions[4] || [])
        ]);
        const sniperTile = this.getRandomTileFromPosition(sniperPositions, usedTiles);
        if (sniperTile) {
            assignments.push({ tile: sniperTile, def: enemyDefs.sniper });
            usedTiles.add(sniperTile);
        }
    
        // 3. Размещаем алинга (позиции 1-3, с правилами вероятности)
        const alingPositions = [...(positions[1] || []), ...(positions[2] || []), ...(positions[3] || [])];
        const alingTile = this.getAlingTileWithRules(alingPositions, usedTiles, playerSniper);
        if (alingTile) {
            assignments.push({ tile: alingTile, def: enemyDefs.alings[0] });
            usedTiles.add(alingTile);
        }
    
        // 4. Размещаем толстяка (с правилами вероятности)
        const bruteTile = this.assignBrutePositionWithRules(positions, usedTiles, assignments, playerAssignments);
        if (bruteTile) {
            assignments.push({ tile: bruteTile, def: enemyDefs.brute });
            usedTiles.add(bruteTile);
        }
    
        // 5. Размещаем саммонера
        const summonerPositions = this.sortByCoverPriority([
            ...(positions[2] || []),
            ...(positions[3] || []),
            ...(positions[4] || [])
        ]);
        
        const rearSummonerPositions = summonerPositions.filter(tile => {
            const hasEnemyInFront = assignments.some(a => {
                if (!playerAssignments[0]?.tile) return false;
                const distToPlayer = Math.abs(tile.gridX - playerAssignments[0].tile.gridX) + 
                                    Math.abs(tile.gridY - playerAssignments[0].tile.gridY);
                const distEnemyToPlayer = Math.abs(a.tile.gridX - playerAssignments[0].tile.gridX) + 
                                         Math.abs(a.tile.gridY - playerAssignments[0].tile.gridY);
                return distEnemyToPlayer < distToPlayer;
            });
            return hasEnemyInFront;
        });
        
        const summonerTile = this.getRandomTileFromPosition(
            rearSummonerPositions.length > 0 ? rearSummonerPositions : summonerPositions,
            usedTiles
        );
        
        if (summonerTile && enemyDefs.summoner) {
            assignments.push({ tile: summonerTile, def: enemyDefs.summoner });
            usedTiles.add(summonerTile);
        }
    
        // Проверяем позицию мага (должен быть в радиусе 2 других врагов)
        if (mageTile) {
            const mageAssignment = assignments.find(a => a.tile === mageTile);
            const otherEnemies = assignments.filter(a => a.tile !== mageTile && a.def.role !== 'support');
            
            let enemiesInRange = 0;
            for (const enemy of otherEnemies) {
                const distance = Math.abs(mageTile.gridX - enemy.tile.gridX) + 
                               Math.abs(mageTile.gridY - enemy.tile.gridY);
                if (distance <= 2) {
                    enemiesInRange++;
                }
            }
            
            if (enemiesInRange < 2 && magePositions.length > 1) {
                const alternativeTiles = magePositions.filter(t => t !== mageTile && !usedTiles.has(t));
                for (const altTile of alternativeTiles) {
                    let countInRange = 0;
                    for (const enemy of otherEnemies) {
                        const distance = Math.abs(altTile.gridX - enemy.tile.gridX) + 
                                       Math.abs(altTile.gridY - enemy.tile.gridY);
                        if (distance <= 2) countInRange++;
                    }
                    
                    if (countInRange >= 2) {
                        usedTiles.delete(mageTile);
                        mageAssignment.tile = altTile;
                        usedTiles.add(altTile);
                        break;
                    }
                }
            }
        }
    
        return assignments.filter(a => a !== null);
    }

    // Новый метод для алинга с правилами вероятности
    getAlingTileWithRules(alingPositions, usedTiles, playerSniper) {
        const available = alingPositions.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) return null;
        
        // Правило 2: ниже вероятность рядом со снайпером игрока
        let weightedTiles = available.map(tile => {
            let weight = 1.0;
            
            if (playerSniper?.tile) {
                const distToSniper = Math.abs(tile.gridX - playerSniper.tile.gridX) + 
                                    Math.abs(tile.gridY - playerSniper.tile.gridY);
                // Значительно понижаем вес для близких к снайперу
                if (distToSniper <= 2) weight *= 0.2;
                else if (distToSniper <= 3) weight *= 0.5;
            }
            
            return { tile, weight };
        });
        
        // Сортируем по весу
        weightedTiles.sort((a, b) => b.weight - a.weight);
        
        // Выбираем из топ-60% с наивысшими весами
        const topCount = Math.max(1, Math.ceil(weightedTiles.length * 0.6));
        const selectedIndex = Math.floor(Math.random() * topCount);
        
        return weightedTiles[selectedIndex].tile;
    }

    // Улучшенный метод для толстяка с вероятностными правилами
    assignBrutePositionWithRules(positions, usedTiles, existingAssignments, playerAssignments) {
        const mageAssignment = existingAssignments.find(a => a?.def?.role === 'support');
        const playerSniper = playerAssignments?.find(a => a?.def?.role === 'sniper');
        const playerMedic = playerAssignments?.find(a => a?.def?.role === 'medic');
        
        let availableTiles = [];
        for (const pos of [1, 2, 3, 4]) {
            if (positions[pos]) {
                availableTiles.push(...positions[pos].filter(t => !usedTiles.has(t)));
            }
        }
        
        if (availableTiles.length === 0) return null;
        
        // Правило 2: ниже вероятность рядом со снайпером игрока
        // Правило 3: средняя вероятность (50%) рядом с магом
        let weightedTiles = availableTiles.map(tile => {
            let weight = 1.0;
            
            // Правило 2: пониженная вероятность рядом со снайпером игрока
            if (playerSniper?.tile) {
                const distToSniper = Math.abs(tile.gridX - playerSniper.tile.gridX) + 
                                    Math.abs(tile.gridY - playerSniper.tile.gridY);
                if (distToSniper <= 2) weight *= 0.3;
                else if (distToSniper <= 3) weight *= 0.6;
            }
            
            // Повышенная вероятность рядом с другими союзниками (не снайпером)
            if (playerMedic?.tile) {
                const distToMedic = Math.abs(tile.gridX - playerMedic.tile.gridX) + 
                                   Math.abs(tile.gridY - playerMedic.tile.gridY);
                if (distToMedic <= 2) weight *= 1.3;
            }
            
            // Правило 3: средняя вероятность (50%) рядом с магом
            if (mageAssignment?.tile) {
                const distToMage = Math.abs(tile.gridX - mageAssignment.tile.gridX) + 
                                  Math.abs(tile.gridY - mageAssignment.tile.gridY);
                if (distToMage <= 2) {
                    // 50% шанс быть рядом с магом (реализуется через случайное изменение веса)
                    weight *= (Math.random() < 0.5) ? 2.0 : 0.5;
                }
            }
            
            return { tile, weight };
        });
        
        // Сортируем по весу
        weightedTiles.sort((a, b) => b.weight - a.weight);
        
        // Выбираем из топ-60%
        const topCount = Math.max(1, Math.ceil(weightedTiles.length * 0.6));
        const selectedIndex = Math.floor(Math.random() * topCount);
        
        return weightedTiles[selectedIndex].tile;
    }

    sortByCoverPriority(tiles) {
        return [...tiles].sort((a, b) => {
            const coverA = this.countAdjacentWalls(a);
            const coverB = this.countAdjacentWalls(b);
            return coverB - coverA;
        });
    }

    countAdjacentWalls(tile) {
        let wallCount = 0;
        const neighbors = [
            { x: tile.gridX - 1, y: tile.gridY },
            { x: tile.gridX + 1, y: tile.gridY },
            { x: tile.gridX, y: tile.gridY - 1 },
            { x: tile.gridX, y: tile.gridY + 1 }
        ];
        
        for (const neighbor of neighbors) {
            if (tile.tilemap) {
                const neighborTile = tile.tilemap.getTileAt(neighbor.x, neighbor.y);
                if (neighborTile && (neighborTile.properties?.isWall || neighborTile.properties?.isObstacle)) {
                    wallCount++;
                }
            }
        }
        
        return wallCount;
    }

    getRandomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    getRandomTileFromPosition(positionTiles, usedTiles) {
        const available = positionTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) {
            return null;
        }
        return this.getRandomFromArray(available);
    }

    getUnits(alive = true) {
        const units = this.allUnits ?? [];
        return alive ? units.filter(unit => unit.isAlive) : units;
    }

    getEnemyUnits(alive = true) {
        const units = this.enemyUnits ?? [];
        return alive ? units.filter(unit => unit.isAlive) : units;
    }

    getPlayerUnits(alive = true) {
        const units = this.playerUnits ?? [];
        return alive ? units.filter(unit => unit.isAlive) : units;
    }

    killUnit(unit) {
        unit.hp = 0;
        unit.actionsLeft = 0;
        unit.setTile(null);
        unit.sprite.setVisible(false);
        unit.marker.setVisible(false);
        unit.nameLabel.setVisible(false);
        if (unit.type === 'enemy') {
            const points = this._getKillPoints(unit);
            this.scene.addScore(points);
        }
        this.scene.checkWinLose();
    }

    _getKillPoints(unit) {
        switch (unit.role) {
            case 'summoner': return 60;
            case 'support':  return 50;
            case 'brute':    return 40;
            case 'sniper':   return 30;
            case 'swarm':    return 10;
            default:         return 15;
        }
    }
}