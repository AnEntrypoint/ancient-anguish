import { c, DIRS } from './constants.js';
import { ITEMS, freshWorld, freshEnemies, INITIAL_STATE } from './data.js';

export const buildExecuteCommand = ({ stateRef, sysState, setSysState, printLine, triggerFlash, setGameState, setHistory, handleCombatTurn }) => {
  const executeCommand = (cmdStr, silent = false, forcedState = null) => {
    if (!silent) printLine(c('90', `\n> ${cmdStr}`));
    const args = cmdStr.trim().toLowerCase().split(/\s+/);
    const cmd = args[0];
    let target = args.slice(1).join(' ');
    if (!cmd) return;

    let state = forcedState || { ...stateRef.current };

    if (sysState === 'chargen') {
      const classes = {
        f: { cls:'Fighter', stats:{str:16,dex:12,int:8,con:15}, initInv:['iron_sword'], initEq:'iron_sword' },
        m: { cls:'Mage',    stats:{str:8,dex:10,int:18,con:10}, initInv:['dagger','potion'], initEq:'dagger' },
        r: { cls:'Rogue',   stats:{str:10,dex:18,int:10,con:12}, initInv:['dagger'], initEq:'dagger' },
        c: { cls:'Cleric',  stats:{str:12,dex:10,int:14,con:16}, initInv:['mace'], initEq:'mace' }
      };
      const pick = classes[cmd];
      if (!pick) { printLine("Invalid class. Type F, M, R, or C."); return; }
      state = { ...state, ...pick, inv: pick.initInv, eq: pick.initEq, cls: pick.cls, stats: pick.stats };
      state.maxHp = 20 + (pick.stats.con * 2); state.hp = state.maxHp;
      state.maxMp = 5 + (pick.stats.int * 2); state.mp = state.maxMp;
      printLine(c('92', `\nYou are now a ${pick.cls}. Entering the realm...`));
      setSysState('playing');
      setGameState(state);
      setTimeout(() => executeCommand('l', true, state), 500);
      return;
    }

    if (state.hp <= 0 && cmd !== 'restart') { printLine(c('91', "You are dead. Type 'restart'.")); return; }
    const room = state.world[state.room];
    const findEntity = (idList, dict, t) => idList.find(id => id.includes(t) || dict[id].name.toLowerCase().includes(t));
    const findInvIdx = (t) => state.inv.findIndex(id => id.includes(t) || ITEMS[id].name.toLowerCase().includes(t));

    switch (cmd) {
      case 'help':
        printLine(`CMDS: ${c('93','look, go [dir], take, drop, equip, use, examine')}`);
        printLine(`COMBAT: ${c('91','attack, cast [spell], flee, wimpy [num], consider [enemy]')}`);
        printLine(`INFO: ${c('36','score, inv (i)')}`);
        printLine(`MAGIC: ${c('35','cast heal')} (5MP), ${c('31','cast fireball')} (8MP), ${c('94','cast drain')} (6MP)`);
        break;
      case 'sc': case 'score':
        printLine(c('96', `\n--- Character Sheet: ${state.cls} ---`));
        printLine(`Level: ${state.level}  |  XP: ${state.xp}/${state.level*30}  |  Gold: ${c('93', state.gold+'g')}`);
        printLine(`HP: ${state.hp}/${state.maxHp}  |  MP: ${state.mp}/${state.maxMp}`);
        printLine(`STR: ${c('91',state.stats.str)}  |  DEX: ${c('32',state.stats.dex)}  |  INT: ${c('34',state.stats.int)}  |  CON: ${c('33',state.stats.con)}`);
        printLine(`Wimpy: ${state.wimpy > 0 ? c('93',state.wimpy) : 'Brave (0)'}`);
        break;
      case 'l': case 'look':
        printLine(`\n${c('97', `[=== ${room.name.replace(/\x1b\[[0-9;]*m/g,'')} ===]`)}\n${room.desc}`);
        printLine(`Exits: ${c('36', Object.keys(room.exits).map(k => DIRS[k]).join(', ') || 'None')}`);
        if (room.items?.length) printLine(`Items: ${room.items.map(id => ITEMS[id].name).join(', ')}`);
        if (room.enemies?.length) printLine(c('31', `Enemies: ${room.enemies.map(id => state.enemies[id].name).join(', ')}`));
        break;
      case 'n': case 's': case 'e': case 'w': case 'north': case 'south': case 'east': case 'west': case 'go': {
        const dir = cmd === 'go' ? DIRS[target[0]] : DIRS[cmd[0]];
        const shortDir = Object.keys(DIRS).find(k => DIRS[k] === dir && k.length === 1);
        if (room.enemies?.length && Math.random() > (state.stats.dex * 0.02)) { triggerFlash(); printLine(c('31', "Enemies block your path!")); return; }
        if (room.exits[shortDir]) { state.room = room.exits[shortDir]; setGameState(state); executeCommand('l', true, state); }
        else printLine("You can't go that way.");
        break;
      }
      case 'wimpy': {
        const wVal = parseInt(target);
        if (!isNaN(wVal) && wVal >= 0) { state.wimpy = wVal; printLine(`Wimpy set to ${c('93', wVal)} HP.`); setGameState(state); }
        else printLine(`Current wimpy: ${state.wimpy}. Usage: 'wimpy <number>'`);
        break;
      }
      case 'con': case 'consider': {
        if (!target && room.enemies?.length === 1) target = room.enemies[0];
        const ce = findEntity(room.enemies||[], state.enemies, target);
        if (!ce) { printLine("Consider who?"); break; }
        const e = state.enemies[ce];
        const pp = state.maxHp + (state.stats.str * 2), ep = e.maxHp + (e.dmg * 5);
        printLine(`You consider the ${e.name}...`);
        if (ep < pp * 0.5) printLine(c('32', "You would crush them like a bug."));
        else if (ep < pp) printLine(c('92', "It looks like an easy fight."));
        else if (ep < pp * 1.3) printLine(c('93', "It will be a fair fight."));
        else if (ep < pp * 2) printLine(c('31', "This is a dangerous foe."));
        else printLine(c('91', "You would be utterly annihilated."));
        break;
      }
      case 'flee': {
        if (!room.enemies?.length) { printLine("You are not in combat."); break; }
        const fe = Object.keys(room.exits);
        if (!fe.length) { printLine("There is nowhere to flee!"); break; }
        if (Math.random() > 0.3) { state.room = room.exits[fe[Math.floor(Math.random()*fe.length)]]; printLine(c('93',"You flee!")); setGameState(state); executeCommand('l',true,state); }
        else printLine(c('31', "You try to flee, but your path is blocked!"));
        break;
      }
      case 'take': case 'get': {
        const tkId = findEntity(room.items, ITEMS, target);
        if (tkId) { state.inv.push(tkId); room.items.splice(room.items.indexOf(tkId),1); printLine(`Taken ${ITEMS[tkId].name}.`); setGameState(state); }
        else printLine("Not here."); break;
      }
      case 'drop': {
        const dpIdx = findInvIdx(target);
        if (dpIdx > -1) { const id = state.inv[dpIdx]; if(state.eq===id) state.eq=null; state.inv.splice(dpIdx,1); room.items.push(id); printLine(`Dropped ${ITEMS[id].name}.`); setGameState(state); }
        else printLine("You don't have that."); break;
      }
      case 'equip': case 'wield': {
        const eqIdx = findInvIdx(target);
        if (eqIdx > -1 && ITEMS[state.inv[eqIdx]].type === 'weapon') { state.eq = state.inv[eqIdx]; printLine(`Equipped ${ITEMS[state.eq].name}.`); setGameState(state); }
        else printLine("Cannot equip that."); break;
      }
      case 'use': {
        const usIdx = findInvIdx(target);
        if (usIdx > -1) {
          const item = ITEMS[state.inv[usIdx]];
          if (item.type === 'consumable') { state.hp = Math.min(state.maxHp, state.hp + item.heal); state.inv.splice(usIdx,1); printLine(c('32',`Used ${item.name}! Recovered ${item.heal} HP.`)); setGameState(state); }
          else printLine("Can't use that.");
        } else printLine("You don't have that."); break;
      }
      case 'i': case 'inv':
        printLine(`Inv: ${state.inv.map((id,idx) => id===state.eq && state.inv.indexOf(id)===idx ? ITEMS[id].name+c('90','(eq)') : ITEMS[id].name).join(', ') || 'Empty'}`);
        break;
      case 'x': case 'examine': {
        const exId = findEntity([...state.inv,...(room.items||[])], ITEMS, target);
        if (exId) { printLine(`${ITEMS[exId].name}: ${ITEMS[exId].desc} ` + (ITEMS[exId].dmg ? `[${c('31',ITEMS[exId].dmg+' DMG')}]` : `[${c('32',ITEMS[exId].heal+' HP')}]`)); break; }
        const eId = findEntity(room.enemies||[], state.enemies, target);
        if (eId) { const e = state.enemies[eId]; printLine(`${e.name}: ${e.desc} [HP: ${e.hp}/${e.maxHp} | DMG: ${e.dmg}]`); break; }
        printLine("Not found."); break;
      }
      case 'list':
        if (state.room !== 'shop') { printLine("You are not in a shop."); break; }
        printLine(c('36', "--- MERCHANT WARES ---"));
        ['potion','iron_sword'].forEach(id => printLine(`${ITEMS[id].name} - ${c('93',ITEMS[id].cost+'g')} : ${ITEMS[id].desc}`));
        break;
      case 'buy': {
        if (state.room !== 'shop') { printLine("You are not in a shop."); break; }
        const buyId = ['potion','iron_sword'].find(id => id.includes(target) || ITEMS[id].name.toLowerCase().includes(target));
        if (buyId && state.gold >= ITEMS[buyId].cost) { state.gold -= ITEMS[buyId].cost; state.inv.push(buyId); printLine(c('32',`Bought ${ITEMS[buyId].name} for ${ITEMS[buyId].cost}g.`)); setGameState(state); }
        else if (buyId) printLine(c('31',"Not enough gold.")); else printLine("No such item."); break;
      }
      case 'cast': {
        const [spell, ...rest] = target.split(' ');
        const sTgt = rest.join(' ');
        if (spell === 'heal') {
          if (state.mp < 5) { printLine(c('31',"Need 5 MP.")); break; }
          const healAmt = 10 + Math.floor(state.stats.int * 0.8);
          state.mp -= 5; state.hp = Math.min(state.maxHp, state.hp + healAmt);
          printLine(c('32',`Cast Heal! +${healAmt} HP.`)); setGameState(state);
        } else if (spell === 'fireball' || spell === 'drain') {
          const cost = spell==='fireball' ? 8 : 6;
          if (state.mp < cost) { printLine(c('31',`Need ${cost} MP.`)); break; }
          let fe = findEntity(room.enemies||[], state.enemies, sTgt||'');
          if (!fe) { if (room.enemies?.length===1) fe = room.enemies[0]; else { printLine("Target not found."); break; } }
          state.mp -= cost;
          const mDmg = spell==='fireball' ? 8+Math.floor(state.stats.int*1.2) : 5+Math.floor(state.stats.int*0.8);
          handleCombatTurn(state, room, fe, room.enemies.indexOf(fe), mDmg, c(spell==='fireball'?'91':'94',`You cast ${spell.toUpperCase()}!`), spell==='drain'?0.5:0);
          setGameState(state);
        } else printLine("Unknown spell.");
        break;
      }
      case 'attack': case 'kill': {
        if (!target && room.enemies?.length===1) target = room.enemies[0];
        const ae = findEntity(room.enemies||[], state.enemies, target);
        if (ae) { const pDmg = Math.floor(state.stats.str*0.5)+(state.eq ? ITEMS[state.eq].dmg : 0); handleCombatTurn(state, room, ae, room.enemies.indexOf(ae), pDmg, 'You strike forcefully!'); setGameState(state); }
        else printLine("Attack what?"); break;
      }
      case 'restart':
        setSysState('booting'); setHistory([]);
        setGameState({ ...INITIAL_STATE, world: freshWorld(), enemies: freshEnemies() });
        printLine(c('32',"--- REBOOTED ---"));
        setTimeout(() => setSysState('chargen'), 500);
        break;
      case 'clear': setHistory([]); break;
      default: printLine(`Unknown command: ${c('91', cmd)}`);
    }
  };
  return executeCommand;
};
