export const balanceConfig = {
    baseStats: {
        hp: 40,
        atk: 10,
        def: 5,
    },
    growthFactors: {
        hp: 1.15,
        atk: 1.12,
        def: 1.10,
    },
    archetypes: {
        standard: { name: 'Standard', hp_mult: 1.0, atk_mult: 1.0, def_mult: 1.0 },
        tank: { name: 'Tank', hp_mult: 1.8, atk_mult: 0.7, def_mult: 1.5 },
        glass_cannon: { name: 'Glass Cannon', hp_mult: 0.6, atk_mult: 1.6, def_mult: 0.7 },
        swift: { name: 'Swift', hp_mult: 0.8, atk_mult: 1.3, def_mult: 0.9 },
        boss: { name: 'Boss', hp_mult: 3.0, atk_mult: 1.5, def_mult: 1.8 },
    },
    itemBasePower: 10,
    itemGrowthFactor: 1.20,
};
