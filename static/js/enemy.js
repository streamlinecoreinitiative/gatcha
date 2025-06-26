import { calculateStatsForLevel } from './utils.js';
import { balanceConfig } from './balance.js';

const enemyConcepts = [
    { name: 'Goblin', image: 'path/to/goblin.png' },
    { name: 'Slime', image: 'path/to/slime.png' },
    { name: 'Orc', image: 'path/to/orc.png' },
    { name: 'Skeleton Knight', image: 'path/to/skeleton.png' },
    { name: 'Gargoyle', image: 'path/to/gargoyle.png' },
    { name: 'Lich', image: 'path/to/lich.png' },
    { name: 'Dire Wolf', image: 'path/to/direwolf.png' },
    { name: 'Rogue Mage', image: 'path/to/mage.png' },
    { name: 'Bandit', image: 'path/to/bandit.png' },
    { name: 'Wraith', image: 'path/to/wraith.png' },
    { name: 'Imp', image: 'path/to/imp.png' },
    { name: 'Serpent', image: 'path/to/serpent.png' },
    { name: 'Ogre', image: 'path/to/ogre.png' },
    { name: 'Treant', image: 'path/to/treant.png' },
    { name: 'Golem', image: 'path/to/golem.png' },
    { name: 'Harpy', image: 'path/to/harpy.png' },
    { name: 'Minotaur', image: 'path/to/minotaur.png' },
    { name: 'Phoenix', image: 'path/to/phoenix.png' },
    { name: 'Dragon', image: 'path/to/dragon.png' }
];

export function generateEnemy(level, archetypeKey, concept) {
    const baseStats = calculateStatsForLevel(level);
    const archetype = balanceConfig.archetypes[archetypeKey];
    if (!archetype) {
        throw new Error(`Invalid archetype key: ${archetypeKey}`);
    }
    const finalStats = {
        hp: Math.round(baseStats.hp * archetype.hp_mult),
        atk: Math.round(baseStats.atk * archetype.atk_mult),
        def: Math.round(baseStats.def * archetype.def_mult),
    };
    finalStats.hp = Math.round(finalStats.hp * (1 + (Math.random() - 0.5) * 0.1));
    return {
        name: `${concept.name} (${archetype.name})`,
        level,
        image: concept.image,
        stats: finalStats,
    };
}

export { enemyConcepts };
