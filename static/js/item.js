import { balanceConfig } from './balance.js';

export function calculateItemPower(itemLevel) {
    const { itemBasePower, itemGrowthFactor } = balanceConfig;
    return Math.round(itemBasePower * Math.pow(itemGrowthFactor, itemLevel - 1));
}
