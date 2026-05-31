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
        
        // Выбираем 10 случайных тайлов по всей карте
        const selectedTiles = this.getRandomTilesFromAllMap(allTiles, 10);
        
        if (selectedTiles.length < 10) {
            console.warn('Недостаточно тайлов для всех юнитов');
            return;
        }

        const playerDefs = [
            { name: 'Медик', hp: 100, attack: 10, defense: 8, accuracy: 70, role: 'medic' },
            { name: 'Снайпер', hp: 80, attack: 15, defense: 5, accuracy: 85, role: 'sniper' },
            { name: 'Штурмовик', hp: 120, attack: 18, defense: 10, accuracy: 65, role: 'assault' },
        ];
        
        const enemyDefs = {
            alings: [
                { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm" },
                { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm" },
                { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm" },
                { name: 'Алинг', hp: 30, attack: 20, defense: 10, accuracy: 60, role: "swarm" },
            ],
            sniper: { name: 'Вражеский снайпер', hp: 70, ap: 2, attack: 16, defense: 4, accuracy: 85, role: 'sniper' },
            brute: { name: 'Толстяк', hp: 130, ap: 1, attack: 22, defense: 8, accuracy: 60, role: 'brute' },
            mage: { name: 'Маг', hp: 80, ap: 2, attack: 8, defense: 4, accuracy: 70, role: 'support', textureKey: 'enemy_support_unit' },
        };

        const assignments = this.assignAllPositions(selectedTiles, playerDefs, enemyDefs);
        
        assignments.forEach((assignment) => {
            if (!assignment) return;
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
    }

    isSpawnableTile(tile) {
        if (!tile) return false;
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
        if (allTiles.length < 10) {
            console.warn('Недостаточно тайлов для всех юнитов');
            return [];
        }

        const assignments = [];
        const usedTiles = new Set();

        // Выбираем начальный тайл для группы игроков
        const shuffledTiles = this.getRandomTilesFromAllMap(allTiles, allTiles.length);
        
        // Выбираем центральный тайл для группы игроков
        const playerCenter = shuffledTiles[0];
        
        // Находим ближайшие тайлы к центру игроков для формирования компактной группы
        const tilesByDistanceToPlayerCenter = [...shuffledTiles]
            .filter(t => t !== playerCenter)
            .sort((a, b) => {
                const distA = Math.abs(a.gridX - playerCenter.gridX) + Math.abs(a.gridY - playerCenter.gridY);
                const distB = Math.abs(b.gridX - playerCenter.gridX) + Math.abs(b.gridY - playerCenter.gridY);
                return distA - distB;
            });
        
        // Берем 2 ближайших тайла к центру для игроков
        const playerZone = [playerCenter, ...tilesByDistanceToPlayerCenter.slice(0, 2)];
        
        // Остальные тайлы для врагов
        const enemyZone = tilesByDistanceToPlayerCenter.slice(2, 9);
        
        // Если врагов меньше 7, добираем из оставшихся
        if (enemyZone.length < 7) {
            const remainingTiles = shuffledTiles.filter(t => !playerZone.includes(t) && !enemyZone.includes(t));
            enemyZone.push(...remainingTiles.slice(0, 7 - enemyZone.length));
        }
        
        // Определяем позиции врагов по расстоянию до игроков (1 - ближе всех, 4 - дальше всех)
        const enemyPositions = this.calculateEnemyPositionsByDistance(enemyZone, playerZone);
        
        // Определяем позиции игроков по расстоянию до врагов (1 - ближе всех, 3 - дальше всех)
        const playerPositions = this.calculatePlayerPositionsByDistance(playerZone, enemyZone);
        
        // Расставляем игроков согласно их правилам
        const playerAssignments = this.assignPlayerPositions(playerPositions, playerDefs);
        playerAssignments.forEach(a => {
            if (a) {
                assignments.push({ ...a, type: 'player' });
                usedTiles.add(a.tile);
            }
        });

        // Расставляем врагов согласно их правилам
        const enemyAssignments = this.assignEnemyPositions(enemyPositions, enemyDefs, usedTiles, playerAssignments);
        enemyAssignments.forEach(a => {
            if (a) {
                assignments.push({ ...a, type: 'enemy' });
                usedTiles.add(a.tile);
            }
        });

        return assignments;
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
            1: sortedByDistance.slice(0, 2),    // Самые близкие к игрокам
            2: sortedByDistance.slice(2, 4),    // Средне-близкие
            3: sortedByDistance.slice(4, 6),    // Средне-дальние
            4: sortedByDistance.slice(6, 7)     // Самые дальние
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
            1: sortedByDistance.slice(0, 1),    // Самый близкий к врагам
            2: sortedByDistance.slice(1, 2),    // Средний
            3: sortedByDistance.slice(2, 3)     // Самый дальний
        };
    }

    assignPlayerPositions(positions, playerDefs) {
        if (!positions[1]?.length || !positions[2]?.length || !positions[3]?.length) {
            console.warn('Недостаточно тайлов для игроков');
            return [];
        }

        const assignments = [];
        const usedTiles = new Set();
        const medic = playerDefs.find(d => d.role === 'medic');
        const sniper = playerDefs.find(d => d.role === 'sniper');
        const assault = playerDefs.find(d => d.role === 'assault');

        // Медик: только позиции 2-3, высокий приоритет укрытий, LOS к союзнику
        const medicPositions = [...positions[2], ...positions[3]];
        const medicTile = this.getMedicTile(medicPositions, usedTiles, positions);
        if (medicTile && medic) {
            assignments.push({ tile: medicTile, def: medic });
            usedTiles.add(medicTile);
        }

        // Снайпер: только позиции 2-3, высокий приоритет укрытий
        const sniperPositions = [...positions[2], ...positions[3]].filter(t => !usedTiles.has(t));
        const sniperTile = this.getSniperTile(sniperPositions, usedTiles);
        if (sniperTile && sniper) {
            assignments.push({ tile: sniperTile, def: sniper });
            usedTiles.add(sniperTile);
        }

        // Штурмовик: только позиции 1-2, пониженная вероятность рядом со снайпером
        const assaultPositions = [...positions[1], ...positions[2]].filter(t => !usedTiles.has(t));
        const assaultTile = this.getAssaultTile(assaultPositions, usedTiles, assignments);
        if (assaultTile && assault) {
            assignments.push({ tile: assaultTile, def: assault });
            usedTiles.add(assaultTile);
        }

        return assignments;
    }

    getMedicTile(availableTiles, usedTiles, allPositions) {
        const available = availableTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) return null;

        // Сначала ищем тайлы с укрытием
        const tilesWithCover = this.sortByCoverPriority(available);
        
        // Из них выбираем те, что имеют LOS к другим позициям союзников
        const tilesWithLOS = tilesWithCover.filter(tile => {
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
            return false;
        });

        if (tilesWithLOS.length > 0) {
            return tilesWithLOS[0]; // Лучший тайл с укрытием и LOS
        }
        
        // Если нет с LOS, берем лучший с укрытием
        if (tilesWithCover.length > 0) {
            return tilesWithCover[0];
        }
        
        return this.getRandomFromArray(available);
    }

    getSniperTile(availableTiles, usedTiles) {
        const available = availableTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) return null;

        const tilesWithCover = this.sortByCoverPriority(available);
        return tilesWithCover.length > 0 ? tilesWithCover[0] : this.getRandomFromArray(available);
    }

    getAssaultTile(availableTiles, usedTiles, existingAssignments) {
        let available = availableTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) return null;

        const sniperAssignment = existingAssignments.find(a => a?.def?.role === 'sniper');
        const medicAssignment = existingAssignments.find(a => a?.def?.role === 'medic');
        
        // Понижаем вероятность рядом со снайпером
        if (sniperAssignment && available.length > 1) {
            const farFromSniper = available.filter(tile => {
                const distance = Math.abs(tile.gridX - sniperAssignment.tile.gridX) + 
                               Math.abs(tile.gridY - sniperAssignment.tile.gridY);
                return distance > 2;
            });
            
            // Предпочитаем ближе к медику
            if (medicAssignment && farFromSniper.length > 0) {
                const nearMedic = farFromSniper.filter(tile => {
                    const distance = Math.abs(tile.gridX - medicAssignment.tile.gridX) + 
                                   Math.abs(tile.gridY - medicAssignment.tile.gridY);
                    return distance <= 2;
                });
                
                if (nearMedic.length > 0) {
                    return this.getRandomFromArray(nearMedic);
                }
            }
            
            if (farFromSniper.length > 0) {
                return this.getRandomFromArray(farFromSniper);
            }
        }
        
        return this.getRandomFromArray(available);
    }

    hasLineOfSight(tile1, tile2) {
        // Проверка прямой видимости между двумя тайлами
        const dx = Math.abs(tile1.gridX - tile2.gridX);
        const dy = Math.abs(tile1.gridY - tile2.gridY);
        const distance = dx + dy;
        
        // Если расстояние больше 5, LOS нет
        if (distance > 5) return false;
        
        // Проверяем, нет ли препятствий между тайлами
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

        // 1. Размещаем мага: позиции 2-3
        const magePositions = [...(positions[2] || []), ...(positions[3] || [])];
        const mageTile = this.getRandomTileFromPosition(magePositions, usedTiles);
        if (mageTile) {
            assignments.push({ tile: mageTile, def: enemyDefs.mage });
            usedTiles.add(mageTile);
        }

        // 2. Размещаем снайпера: позиции 2-4, приоритет укрытий
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

        // 3. Размещаем алингов: позиции 1-3
        const alingAssignments = this.assignAlingsPosition(positions, enemyDefs.alings, usedTiles, assignments, playerAssignments);
        assignments.push(...alingAssignments);
        alingAssignments.forEach(a => {
            if (a) usedTiles.add(a.tile);
        });

        // 4. Размещаем толстяка: любая позиция
        const bruteTile = this.assignBrutePosition(positions, usedTiles, assignments, playerAssignments);
        if (bruteTile) {
            assignments.push({ tile: bruteTile, def: enemyDefs.brute });
            usedTiles.add(bruteTile);
        }

        // 5. Проверяем, что маг находится в радиусе хотя бы 2 других врагов
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
            
            // Если меньше 2 врагов в радиусе, меняем позицию мага
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
                        // Меняем позицию мага
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

    assignAlingsPosition(positions, alings, usedTiles, existingAssignments, playerAssignments) {
        const alingAssignments = [];
        const playerSniper = playerAssignments?.find(a => a?.def?.role === 'sniper');
        
        // Хотя бы 1 алинг на позиции 2-3 (позади остальных)
        const rearPosition = this.getRandomFromArray([2, 3]);
        const availableRearTiles = positions[rearPosition]?.filter(t => !usedTiles.has(t)) || [];
        
        if (availableRearTiles.length > 0) {
            const rearTile = this.getRandomFromArray(availableRearTiles);
            alingAssignments.push({ tile: rearTile, def: alings[0] });
            usedTiles.add(rearTile);
        } else {
            // Если нет тайлов на 2-3, ищем на позиции 1
            const fallbackTiles = positions[1]?.filter(t => !usedTiles.has(t)) || [];
            if (fallbackTiles.length > 0) {
                const fallbackTile = this.getRandomFromArray(fallbackTiles);
                alingAssignments.push({ tile: fallbackTile, def: alings[0] });
                usedTiles.add(fallbackTile);
            }
        }
        
        // Остальные алинги: позиции 1-3, пониженная вероятность рядом со снайпером игрока
        for (let i = alingAssignments.length; i < alings.length; i++) {
            let availableTiles = [];
            
            for (const pos of [1, 2, 3]) {
                if (positions[pos]) {
                    const posTiles = positions[pos].filter(t => !usedTiles.has(t));
                    availableTiles.push(...posTiles);
                }
            }
            
            if (availableTiles.length === 0) continue;
            
            // Фильтруем тайлы, чтобы не создавать группы больше 2 алингов
            availableTiles = this.filterTilesToAvoidLargeGroups(availableTiles, alingAssignments);
            
            if (availableTiles.length === 0) {
                // Если после фильтрации не осталось тайлов, используем все доступные
                availableTiles = [];
                for (const pos of [1, 2, 3]) {
                    if (positions[pos]) {
                        const posTiles = positions[pos].filter(t => !usedTiles.has(t));
                        availableTiles.push(...posTiles);
                    }
                }
            }
            
            // Понижаем вероятность рядом со снайпером игрока
            if (playerSniper?.tile && availableTiles.length > 1) {
                const tilesByDistance = availableTiles.map(tile => ({
                    tile,
                    distance: Math.abs(tile.gridX - playerSniper.tile.gridX) + 
                             Math.abs(tile.gridY - playerSniper.tile.gridY)
                }));
                
                // Сортируем: дальние от снайпера в приоритете
                tilesByDistance.sort((a, b) => b.distance - a.distance);
                
                // Берем случайный из дальней половины
                const halfIndex = Math.ceil(tilesByDistance.length / 2);
                const preferredTiles = tilesByDistance.slice(0, halfIndex).map(t => t.tile);
                
                const selectedTile = this.getRandomFromArray(preferredTiles);
                alingAssignments.push({ tile: selectedTile, def: alings[i] });
                usedTiles.add(selectedTile);
            } else if (availableTiles.length > 0) {
                const tile = this.getRandomFromArray(availableTiles);
                alingAssignments.push({ tile, def: alings[i] });
                usedTiles.add(tile);
            }
        }
        
        return alingAssignments;
    }

    filterTilesToAvoidLargeGroups(availableTiles, existingAlings) {
        if (existingAlings.length === 0) return availableTiles;
        
        return availableTiles.filter(tile => {
            // Считаем, сколько алингов уже находится рядом с этим тайлом
            let nearbyAlings = 0;
            
            for (const aling of existingAlings) {
                const distance = Math.abs(tile.gridX - aling.tile.gridX) + 
                               Math.abs(tile.gridY - aling.tile.gridY);
                if (distance <= 1) { // Рядом считаем на расстоянии 1 тайла
                    nearbyAlings++;
                }
            }
            
            // Разрешаем спавн только если рядом меньше 2 алингов
            return nearbyAlings < 2;
        });
    }

    assignBrutePosition(positions, usedTiles, existingAssignments, playerAssignments) {
        const mageAssignment = existingAssignments.find(a => a?.def?.role === 'support');
        const playerSniper = playerAssignments?.find(a => a?.def?.role === 'sniper');
        
        let availableTiles = [];
        for (const pos of [1, 2, 3, 4]) {
            if (positions[pos]) {
                availableTiles.push(...positions[pos].filter(t => !usedTiles.has(t)));
            }
        }
        
        if (availableTiles.length === 0) return null;
        
        // Понижаем вероятность рядом со снайпером игрока
        if (playerSniper?.tile && availableTiles.length > 1) {
            const farFromSniper = availableTiles.filter(tile => {
                const distance = Math.abs(tile.gridX - playerSniper.tile.gridX) + 
                               Math.abs(tile.gridY - playerSniper.tile.gridY);
                return distance > 2;
            });
            
            if (farFromSniper.length > 0) {
                availableTiles = farFromSniper;
            }
        }
        
        // Средняя вероятность (50%) появиться рядом с магом
        if (mageAssignment?.tile && Math.random() < 0.5) {
            const nearMageTiles = availableTiles.filter(tile => {
                const distance = Math.abs(tile.gridX - mageAssignment.tile.gridX) + 
                               Math.abs(tile.gridY - mageAssignment.tile.gridY);
                return distance <= 2;
            });
            
            if (nearMageTiles.length > 0) {
                return this.getRandomFromArray(nearMageTiles);
            }
        }
        
        return this.getRandomFromArray(availableTiles);
    }

    getRandomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    getRandomTileFromPosition(positionTiles, usedTiles) {
        const available = positionTiles.filter(tile => !usedTiles.has(tile));
        if (available.length === 0) {
            console.warn('Нет доступных тайлов для позиции');
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
    }
}