import { c } from './constants.js';

export const WORLD = {
  square:    { name: c('97',"⛲ Oakhaven Town Square"), desc: "The bustling center of a ruined town. A worn cobblestone path branches out in all directions.", exits: { n:'gate', s:'forest', e:'shop', w:'guild' }, items: [], enemies: [] },
  guild:     { name: c('34',"🏛️ Adventurer's Guild"), desc: "Dusty tomes and old bounties line the walls. It feels safe here.", exits: { e:'square' }, items: ['potion'], enemies: [] },
  shop:      { name: c('33',"⛺ Wandering Merchant"), desc: "A cloaked figure sits by a holographic fire. Type 'list' to see wares.", exits: { w:'square' }, items: [], enemies: [] },
  forest:    { name: c('32',"🌲 Whispering Woods"), desc: "Ancient trees loom over you. The mist swirls dynamically around your boots.", exits: { n:'square' }, items: ['branch'], enemies: ['rat','goblin'] },
  gate:      { name: c('90',"⛩️ Obsidian Gate"), desc: "A towering black gate. Mechanical humming shakes the ground from the north.", exits: { s:'square', e:'armory', n:'courtyard' }, items: [], enemies: ['orc','orc'] },
  armory:    { name: c('35',"🛡️ Ruined Armory"), desc: "Weapons of a bygone era are scattered here, sparking sporadically.", exits: { w:'gate' }, items: ['plasmasword'], enemies: [] },
  courtyard: { name: c('91',"🌋 Inner Courtyard"), desc: "Scorched earth. A massive beast guards the exit, its metallic scales shifting.", exits: { s:'gate' }, items: [], enemies: ['mecha-dragon'] }
};

export const ITEMS = {
  branch:     { name: c('33','🪵 Gnarled Branch'), desc: 'Better than nothing.', type: 'weapon', dmg: 2, weight: 2 },
  dagger:     { name: c('90','🗡️ Rusty Dagger'), desc: 'Fast but weak.', type: 'weapon', dmg: 4, weight: 1 },
  mace:       { name: c('97','🔨 Iron Mace'), desc: 'Heavy and crushing.', type: 'weapon', dmg: 6, weight: 5 },
  iron_sword: { name: c('97','🗡️ Iron Sword'), desc: 'A sharp, reliable blade.', type: 'weapon', dmg: 8, cost: 50, weight: 3 },
  plasmasword:{ name: c('36','🦯 Plasma Sword'), desc: 'An elegant, humming weapon.', type: 'weapon', dmg: 16, weight: 2 },
  potion:     { name: c('92','🧪 Health Potion'), desc: 'Restores 25 HP instantly.', type: 'consumable', heal: 25, cost: 15, weight: 1 }
};

export const ENEMIES = {
  rat:           { name: c('90','🐀 Giant Rat'), desc: 'A dog-sized rodent with yellow teeth.', hp: 10, maxHp: 10, dmg: 2, xp: 8, gold: 2 },
  goblin:        { name: c('92','👺 Scrap Goblin'), desc: 'Vile and scrappy.', hp: 20, maxHp: 20, dmg: 4, xp: 18, gold: 12 },
  orc:           { name: c('31','🧌 Corrupted Orc'), desc: 'A hulking brute infused with dark machinery.', hp: 45, maxHp: 45, dmg: 8, xp: 40, gold: 35 },
  'mecha-dragon':{ name: c('91','🐉 Mecha-Dragon'), desc: 'Amalgamation of scales and steel.', hp: 120, maxHp: 120, dmg: 16, xp: 200, gold: 250 }
};

export const freshWorld = () => JSON.parse(JSON.stringify(WORLD));
export const freshEnemies = () => JSON.parse(JSON.stringify(ENEMIES));

export const INITIAL_STATE = {
  cls: '', stats: { str:10, dex:10, int:10, con:10 },
  room: 'square', inv: [], eq: null,
  hp: 30, maxHp: 30, mp: 15, maxMp: 15, xp: 0, level: 1, gold: 0,
  wimpy: 0
};
