import { balanceConfig } from './balance.js';

export function calculateStatsForLevel(level) {
    const { baseStats, growthFactors } = balanceConfig;
    const hp = Math.round(baseStats.hp * Math.pow(growthFactors.hp, level - 1));
    const atk = Math.round(baseStats.atk * Math.pow(growthFactors.atk, level - 1));
    const def = Math.round(baseStats.def * Math.pow(growthFactors.def, level - 1));
    return { hp, atk, def };
}
