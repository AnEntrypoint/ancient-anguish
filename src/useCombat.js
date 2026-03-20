import { c, DIRS } from './constants.js';
import { ITEMS } from './data.js';

export const useCombat = (printLine, triggerFlash, setGameState) => {
  const handleCombatTurn = (state, room, aEnemy, eIdx, pDmg, msg, lifesteal = 0) => {
    const eData = state.enemies[aEnemy];
    const critChance = (state.stats.dex * 0.01) + 0.05;
    const isCrit = Math.random() < critChance && lifesteal === 0;
    let finalDmg = Math.max(1, pDmg + (Math.floor(Math.random() * 3) - 1));
    if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);

    eData.hp -= finalDmg;
    printLine(`${msg} ${isCrit ? c('93', '*CRIT*') : ''} (${c('33', finalDmg)} dmg)`);

    if (lifesteal > 0) {
      const heal = Math.floor(finalDmg * lifesteal);
      state.hp = Math.min(state.maxHp, state.hp + heal);
      printLine(c('32', `You siphon ${heal} HP!`));
    }

    if (eData.hp <= 0) {
      printLine(c('92', `\n*** Slain ${eData.name}! (+${eData.xp}XP, +${eData.gold}G) ***`));
      state.xp += eData.xp; state.gold += eData.gold;
      room.enemies.splice(eIdx, 1);
      if (Math.random() > 0.5) { room.items.push('potion'); printLine(c('36', `The enemy dropped a potion!`)); }
      while (state.xp >= state.level * 30) {
        state.xp -= state.level * 30; state.level++;
        state.stats.str += 1; state.stats.dex += 1; state.stats.int += 1; state.stats.con += 1;
        state.maxHp = 20 + (state.stats.con * 2) + (state.level * 5);
        state.maxMp = 5 + (state.stats.int * 2) + (state.level * 3);
        state.hp = state.maxHp; state.mp = state.maxMp;
        printLine(c('93', `\n>>> LEVEL UP! You are now Level ${state.level} <<<`));
        printLine(c('32', "All stats increased! Vitals fully restored."));
      }
      if (aEnemy === 'mecha-dragon') printLine(c('95', "\n*** BEAST DEFEATED! YOU WIN! ***"));
    } else {
      const eDmg = Math.max(1, eData.dmg + Math.floor(Math.random() * 3) - 1);
      state.hp -= eDmg;
      triggerFlash();
      printLine(`The ${eData.name} counters for ${c('31', eDmg)} dmg!`);
      if (state.hp <= 0) {
        printLine(c('91', "\n*** YOU DIED. TYPE 'RESTART' ***"));
      } else if (state.wimpy > 0 && state.hp <= state.wimpy) {
        printLine(c('93', `\n*** WIMPY: You panic and flee! ***`));
        const exits = Object.keys(room.exits);
        if (exits.length > 0) state.room = room.exits[exits[Math.floor(Math.random() * exits.length)]];
      }
    }
  };

  return handleCombatTurn;
};
