import { balanceConfig } from './balance.js';

export function calculateStatsForLevel(level) {
    const { baseStats, levelCurve } = balanceConfig;
    const hp = Math.round(
        baseStats.hp *
        Math.pow(level, levelCurve.hpExp) *
        Math.pow(levelCurve.hpGrowth, level)
    );
    const atk = Math.round(
        baseStats.atk *
        Math.pow(level, levelCurve.atkExp) *
        Math.pow(levelCurve.atkGrowth, level)
    );
    const def = Math.round(
        baseStats.def *
        Math.pow(level, levelCurve.defExp) *
        Math.pow(levelCurve.defGrowth, level)
    );
    return { hp, atk, def };
}
