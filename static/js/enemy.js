import { calculateStatsForLevel } from './utils.js';
import { balanceConfig } from './balance.js';

const enemyConcepts = [
    { name: 'Goblin', image: 'path/to/goblin.webp' },
    { name: 'Slime', image: 'path/to/slime.webp' },
    { name: 'Orc', image: 'path/to/orc.webp' },
    { name: 'Skeleton Knight', image: 'path/to/skeleton.webp' },
    { name: 'Gargoyle', image: 'path/to/gargoyle.webp' },
    { name: 'Lich', image: 'path/to/lich.webp' },
    { name: 'Dire Wolf', image: 'path/to/direwolf.webp' },
    { name: 'Rogue Mage', image: 'path/to/mage.webp' },
    { name: 'Bandit', image: 'path/to/bandit.webp' },
    { name: 'Wraith', image: 'path/to/wraith.webp' },
    { name: 'Imp', image: 'path/to/imp.webp' },
    { name: 'Serpent', image: 'path/to/serpent.webp' },
    { name: 'Ogre', image: 'path/to/ogre.webp' },
    { name: 'Treant', image: 'path/to/treant.webp' },
    { name: 'Golem', image: 'path/to/golem.webp' },
    { name: 'Harpy', image: 'path/to/harpy.webp' },
    { name: 'Minotaur', image: 'path/to/minotaur.webp' },
    { name: 'Phoenix', image: 'path/to/phoenix.webp' },
    { name: 'Dragon', image: 'path/to/dragon.webp' }
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
