/** 
 * Типы всех бонусов для врагов
 */
const BUFF_TYPES = {
    SPEED: 'speed',
    ATTACK: 'attack',
    EXTRA_TURN: 'extra_turn',
};

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/**
 * Система принятия решений для поддерживающего врага (мага), который может накладывать баффы на союзников.
 */
export class SupportEnemyAI {
    constructor(unitManager, blackboard, cfg = {}) {
        this.unitManager = unitManager;
        this.blackboard = blackboard;
        this.cfg = {
            neighborRange: cfg.neighborRange ?? 3,
            maxDistance: cfg.maxDistance ?? null,
            damageNormMax: cfg.damageNormMax ?? 30,
            moveRangeNormMax: cfg.moveRangeNormMax ?? 5,
            buffSettings: {
                speed: { value: 1, duration: 2 },
                attack: { value: 10, duration: 2 },
                extra_turn: { value: 1, duration: 1 },
                ...cfg.buffSettings,
            },
        };
    }

    getRankedCandidates(buffType, supportUnit) {
        const candidates = this.unitManager
            .getEnemyUnits()
            .filter((unit) => unit !== supportUnit);

        const scored = candidates
            .filter((unit) => this._canReceive(buffType, unit))
            .map((unit) => {
                const features = this._buildFeatures(unit, supportUnit);
                return {
                    unit,
                    score: this._scoreCandidate(buffType, unit, features),
                    features,
                };
            });

        scored.sort((a, b) => b.score - a.score);
        return scored;
    }

    chooseBestBuff(supportUnit) {
        const buffTypes = [BUFF_TYPES.SPEED, BUFF_TYPES.ATTACK, BUFF_TYPES.EXTRA_TURN];

        const evaluated = buffTypes.map((buffType) => {
            const ranked = this.getRankedCandidates(buffType, supportUnit);
            const top = ranked[0];

            return {
                buffType,
                target: top?.unit ?? null,
                score: top?.score ?? -Infinity,
                ranked,
            };
        });

        evaluated.sort((a, b) => b.score - a.score);
        const best = evaluated[0];

        if (!best || !best.target || !Number.isFinite(best.score)) 
            return null;

        return best;
    }

    applyBestBuff(supportUnit) {
        const decision = this.chooseBestBuff(supportUnit);
        if (!decision) 
            return null;

        decision.target.applyBuff(this._getBuffParams(decision.buffType));
        return decision;
    }

    _getBuffParams(type) {
        const entry = this.cfg.buffSettings?.[type] ?? {};
        return {
            type,
            value: entry.value ?? 1,
            duration: entry.duration ?? 1,
        };
    }

    _canReceive(buffType, unit) {
        if (!unit?.isAlive || !this.blackboard.isEnemyUnitVisible(unit)) 
            return false;

        if (buffType === BUFF_TYPES.EXTRA_TURN) {
            return unit.extraTurnCharges <= 0;
        }

        return !unit.hasBuff(buffType);
    }

    _buildFeatures(unit, supportUnit) {
        const closestPlayer = this.blackboard.getClosestPlayer(unit);
        const maxDistance = this._getMaxDistance();

        return {
            distToPlayer: closestPlayer ? closestPlayer.distance : maxDistance,
            distToSupport: supportUnit ? this.blackboard.distanceBetweenUnits(unit, supportUnit) : maxDistance,
            alliesNearby: this.blackboard.getAlliesInRange(unit, this.cfg.neighborRange).length,
            hpRatio: unit.maxHp > 0 ? unit.hp / unit.maxHp : 0,
            moveRange: unit.moveRange,
            damagePotential: ((unit.attack ?? 0) * (unit.accuracy ?? 0)) / 100,
        };
    }

    // Нужно балансить и улучшать
    _scoreCandidate(buffType, unit, features) {
        const maxDistance = this._getMaxDistance();
        const distNorm = clamp01(features.distToPlayer / maxDistance + 0.2);
        const closeNorm = 1 - distNorm;
        const moveRangeDeficitNorm = clamp01(1 - features.moveRange / this.cfg.moveRangeNormMax);
        const hpDeficit = clamp01(1 - features.hpRatio);
        const damageNorm = clamp01(features.damagePotential / this.cfg.damageNormMax);
        const allyNorm = clamp01(features.alliesNearby / 4);
        const roleBonus = this._roleBonus(buffType, unit.role);

        // Надо проверять собирается ли куда-то идти
        if (buffType === BUFF_TYPES.SPEED) {
            return clamp01(0.5 * moveRangeDeficitNorm + 0.3 * damageNorm + 0.1 * distNorm + 0.1 * roleBonus);
        }

        // Надо проверять может ли атаковать на этом ходу
        if (buffType === BUFF_TYPES.ATTACK) {
            return clamp01(0.5 * damageNorm + 0.35 * closeNorm + 0.15 * roleBonus);
        }

        // Если будет что-то делать
        if (buffType === BUFF_TYPES.EXTRA_TURN) {
            return clamp01(
                0.5 * damageNorm +
                0.2 * closeNorm +
                0.1 * hpDeficit +
                // 0.1 * allyNorm +
                0.2 * roleBonus
            );
        }

        return 0;
    }

    _getMaxDistance() {
        return this.cfg.maxDistance ?? this.blackboard.getMaxGridDistance() ?? 20;
    }

    _roleBonus(buffType, role) {
        if (!role) 
            return 0;

        const map = {
            speed: { brute: 0.6, sniper: 0.2, swarm: 0.1 },
            attack: { brute: 0.6, sniper: 0.4, swarm: 0.2 },
            extra_turn: { sniper: 0.7, brute: 0.4, swarm: 0.1 },
        };

        return map[buffType]?.[role] ?? 0;
    }
}

export { BUFF_TYPES };
