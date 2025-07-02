export const balanceConfig = {
    baseStats: {
        hp: 40,
        atk: 10,
        def: 5,
    },
    // Parameters used to scale enemy stats with floor level. We combine
    // a polynomial exponent with a gentle exponential factor so that the
    // tower can keep growing without huge difficulty spikes.
    levelCurve: {
        hpExp: 0.8,
        atkExp: 0.75,
        defExp: 0.7,
        hpGrowth: 1.028,
        atkGrowth: 1.027,
        defGrowth: 1.025,
    },
    archetypes: {
        standard: { name: 'Standard', hp_mult: 1.0, atk_mult: 1.0, def_mult: 1.0 },
        tank: { name: 'Tank', hp_mult: 1.8, atk_mult: 0.7, def_mult: 1.5 },
        glass_cannon: { name: 'Glass Cannon', hp_mult: 0.6, atk_mult: 1.6, def_mult: 0.7 },
        swift: { name: 'Swift', hp_mult: 0.8, atk_mult: 1.3, def_mult: 0.9 },
        healer: { name: 'Healer', hp_mult: 1.0, atk_mult: 0.8, def_mult: 1.2 },
        support: { name: 'Support', hp_mult: 1.2, atk_mult: 0.8, def_mult: 1.0 },
        boss: { name: 'Boss', hp_mult: 3.0, atk_mult: 1.5, def_mult: 1.8 },
    },
    itemBasePower: 10,
    itemGrowthFactor: 1.20,
};
