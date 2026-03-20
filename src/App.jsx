import React, { useState, useEffect, useRef } from 'react';

// --- VT100 ANSI Parser & Pixelator ---
const COLORS = { 30:'#000', 31:'#ff5555', 32:'#50fa7b', 33:'#f1fa8c', 34:'#bd93f9', 35:'#ff79c6', 36:'#8be9fd', 37:'#f8f8f2', 90:'#6272a4', 91:'#ff6e6e', 92:'#69ff94', 93:'#ffffa5', 94:'#d6acff', 95:'#ff92df', 96:'#a4ffff', 97:'#fff' };

const PixelEmoji = ({ emoji, style }) => (
  <span className="relative inline-flex items-center justify-center mx-[8px] translate-y-[2px] z-10" style={{ transform: 'scale(2.2)' }}>
    <span style={{ ...style, textShadow: 'none', filter: 'url(#pixelate)', WebkitFilter: 'url(#pixelate)' }}>
      {emoji}
    </span>
  </span>
);

const parseANSI = (txt) => {
  let style = { color: '#f8f8f2' };
  return txt.split(/(\x1b\[[0-9;]*m)/).map((p, i) => {
    if (p.startsWith('\x1b[')) {
      p.replace('\x1b[','').replace('m','').split(';').forEach(c => {
        if (c==='0') style = { color: '#f8f8f2', fontWeight: 'normal', textShadow: '0 0 4px rgba(248,248,242,0.4)' };
        else if (c==='1') style.fontWeight = 'bold';
        else if (COLORS[c]) {
          style.color = COLORS[c];
          style.textShadow = `0 0 5px ${COLORS[c]}80`;
        }
      }); return null;
    }

    if (p) {
      const subParts = p.split(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g);
      return subParts.map((sp, j) => {
        if (!sp) return null;
        if (sp.match(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/)) {
          return <PixelEmoji key={`${i}-${j}`} emoji={sp} style={style} />;
        }
        return <span key={`${i}-${j}`} style={style}>{sp}</span>;
      });
    }
    return null;
  });
};
const c = (code, txt) => `\x1b[${code}m${txt}\x1b[0m`;

// --- Game Data ---
const WORLD = {
  square: { name: c('97', "⛲ Oakhaven Town Square"), desc: "The bustling center of a ruined town. A worn cobblestone path branches out in all directions.", exits: { n: 'gate', s: 'forest', e: 'shop', w: 'guild' }, items: [], enemies: [] },
  guild: { name: c('34', "🏛️ Adventurer's Guild"), desc: "Dusty tomes and old bounties line the walls. It feels safe here.", exits: { e: 'square' }, items: ['potion'], enemies: [] },
  shop: { name: c('33', "⛺ Wandering Merchant"), desc: "A cloaked figure sits by a holographic fire. Type 'list' to see wares.", exits: { w: 'square' }, items: [], enemies: [] },
  forest: { name: c('32', "🌲 Whispering Woods"), desc: "Ancient trees loom over you. The mist swirls dynamically around your boots.", exits: { n: 'square' }, items: ['branch'], enemies: ['rat', 'goblin'] },
  gate: { name: c('90', "⛩️ Obsidian Gate"), desc: "A towering black gate. Mechanical humming shakes the ground from the north.", exits: { s: 'square', e: 'armory', n: 'courtyard' }, items: [], enemies: ['orc', 'orc'] },
  armory: { name: c('35', "🛡️ Ruined Armory"), desc: "Weapons of a bygone era are scattered here, sparking sporadically.", exits: { w: 'gate' }, items: ['plasmasword'], enemies: [] },
  courtyard: { name: c('91', "🌋 Inner Courtyard"), desc: "Scorched earth. A massive beast guards the exit, its metallic scales shifting.", exits: { s: 'gate' }, items: [], enemies: ['mecha-dragon'] }
};

const ITEMS = {
  branch: { name: c('33','🪵 Gnarled Branch'), desc: 'Better than nothing.', type: 'weapon', dmg: 2, weight: 2 },
  dagger: { name: c('90','🗡️ Rusty Dagger'), desc: 'Fast but weak.', type: 'weapon', dmg: 4, weight: 1 },
  mace: { name: c('97','🔨 Iron Mace'), desc: 'Heavy and crushing.', type: 'weapon', dmg: 6, weight: 5 },
  iron_sword: { name: c('97','🗡️ Iron Sword'), desc: 'A sharp, reliable blade.', type: 'weapon', dmg: 8, cost: 50, weight: 3 },
  plasmasword: { name: c('36','🦯 Plasma Sword'), desc: 'An elegant, humming weapon.', type: 'weapon', dmg: 16, weight: 2 },
  potion: { name: c('92','🧪 Health Potion'), desc: 'Restores 25 HP instantly.', type: 'consumable', heal: 25, cost: 15, weight: 1 }
};

const ENEMIES = {
  rat: { name: c('90','🐀 Giant Rat'), desc: 'A dog-sized rodent with yellow teeth.', hp: 10, maxHp: 10, dmg: 2, xp: 8, gold: 2 },
  goblin: { name: c('92','👺 Scrap Goblin'), desc: 'Vile and scrappy.', hp: 20, maxHp: 20, dmg: 4, xp: 18, gold: 12 },
  orc: { name: c('31','🧌 Corrupted Orc'), desc: 'A hulking brute infused with dark machinery.', hp: 45, maxHp: 45, dmg: 8, xp: 40, gold: 35 },
  'mecha-dragon': { name: c('91','🐉 Mecha-Dragon'), desc: 'Amalgamation of scales and steel.', hp: 120, maxHp: 120, dmg: 16, xp: 200, gold: 250 }
};

const DIRS = { n:'north', s:'south', e:'east', w:'west', north:'north', south:'south', east:'east', west:'west' };

// --- Main App ---
export default function App() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [sysState, setSysState] = useState('booting'); // booting, chargen, playing
  const [flashRed, setFlashRed] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const stateRef = useRef(null);

  const [gameState, setGameState] = useState({
    cls: '', stats: { str: 10, dex: 10, int: 10, con: 10 },
    room: 'square', inv: [], eq: null,
    hp: 30, maxHp: 30, mp: 15, maxMp: 15, xp: 0, level: 1, gold: 0,
    wimpy: 0,
    world: JSON.parse(JSON.stringify(WORLD)), enemies: JSON.parse(JSON.stringify(ENEMIES))
  });

  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const triggerFlash = () => { setFlashRed(true); setTimeout(() => setFlashRed(false), 150); };
  const printLine = (t) => setHistory(p => [...p, t]);

  // --- Real-Time Game Engine ---
  useEffect(() => {
    if (sysState !== 'playing') return;

    const tickInterval = setInterval(() => {
      let state = { ...stateRef.current };
      const room = state.world[state.room];
      let stateChanged = false;

      if (state.hp <= 0) return;

      // 1. Passive Environment
      if (state.room === 'guild' && (state.hp < state.maxHp || state.mp < state.maxMp)) {
        state.hp = Math.min(state.maxHp, state.hp + Math.floor(state.stats.con / 3));
        state.mp = Math.min(state.maxMp, state.mp + Math.floor(state.stats.int / 3));
        if (Math.random() > 0.7) printLine(c('34', "You feel rested in the safety of the guild."));
        stateChanged = true;
      }

      // 2. Real-Time Enemy AI & Wimpy Check
      if (room.enemies?.length > 0) {
        let fled = false;

        // Enemies act
        room.enemies.forEach(eId => {
          if (fled) return;
          const enemy = state.enemies[eId];
          const roll = Math.random();

          if (roll < 0.20) {
            // Attack
            const dodgeChance = state.stats.dex * 0.015; // 15% dodge at 10 DEX
            if (Math.random() < dodgeChance) {
              printLine(`\n${c('93', '[DODGE]')} You nimbly evade the ${enemy.name}'s attack!`);
            } else {
              const dmg = Math.max(1, enemy.dmg + Math.floor(Math.random() * 3) - 1);
              state.hp -= dmg;
              printLine(`\n${c('91', '[COMBAT]')} The ${enemy.name} hits you for ${c('91', dmg)} damage!`);
              triggerFlash();
              stateChanged = true;

              if (state.hp <= 0) {
                printLine(c('91', "\n*** YOU DIED. TYPE 'RESTART' ***"));
                fled = true; // Stop processing further enemies
              } else if (state.wimpy > 0 && state.hp <= state.wimpy) {
                // WIMPY FLEE
                printLine(c('93', `\n*** WIMPY: Your health dropped below ${state.wimpy}! You panic and flee! ***`));
                const exits = Object.keys(room.exits);
                if (exits.length > 0) {
                  const randomExit = exits[Math.floor(Math.random() * exits.length)];
                  state.room = room.exits[randomExit];
                  fled = true;
                  printLine(c('90', `You flee ${DIRS[randomExit]}...`));
                  setTimeout(() => executeCommand('l', true, state), 100);
                } else {
                  printLine(c('91', "There is nowhere to flee!"));
                }
              }
            }
          }
        });
      }

      if (stateChanged) setGameState(state);
    }, 4000);

    return () => clearInterval(tickInterval);
  }, [sysState]);

  // --- Boot Sequence ---
  useEffect(() => {
    const boot = async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const lines = [ c('90','ANCIENT MUD OS INIT...'), c('90','LOADING GUILD MODULES... [OK]'), c('32','CONNECTION ESTABLISHED.') ];
      for (let l of lines) { printLine(l); await sleep(150); }
      printLine(c('96', "\n=========================================================="));
      printLine(c('97', " Welcome to the REAL-TIME Realm. Choose your path."));
      printLine(c('96', "=========================================================="));
      printLine(c('36', "Select your class:"));
      printLine(`  [${c('93','F')}] Fighter : High Strength and Constitution.`);
      printLine(`  [${c('93','M')}] Mage    : High Intelligence, relies on spells.`);
      printLine(`  [${c('93','R')}] Rogue   : High Dexterity, crits and dodges.`);
      printLine(`  [${c('93','C')}] Cleric  : Balanced, tough, resilient.`);
      printLine(c('90', "\nType F, M, R, or C to begin."));
      setSysState('chargen');
    }; boot(); // eslint-disable-next-line
  }, []);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [history]);

  // --- Combat Helper ---
  const handleCombatTurn = (state, room, aEnemy, eIdx, pDmg, msg, lifesteal=0) => {
    const eData = state.enemies[aEnemy];

    // Crit based on DEX (10 DEX = ~10% crit)
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
      // Retaliation
      const eDmg = Math.max(1, eData.dmg + Math.floor(Math.random()*3)-1);
      state.hp -= eDmg;
      triggerFlash();
      printLine(`The ${eData.name} counters for ${c('31', eDmg)} dmg!`);

      if (state.hp <= 0) {
        printLine(c('91', "\n*** YOU DIED. TYPE 'RESTART' ***"));
      } else if (state.wimpy > 0 && state.hp <= state.wimpy) {
        printLine(c('93', `\n*** WIMPY: You panic and flee! ***`));
        const exits = Object.keys(room.exits);
        if (exits.length > 0) {
          state.room = room.exits[exits[Math.floor(Math.random() * exits.length)]];
          setTimeout(() => executeCommand('l', true, state), 100);
        }
      }
    }
  };

  // --- Main Command Parser ---
  const executeCommand = (cmdStr, silent = false, forcedState = null) => {
    if (!silent) printLine(c('90', `\n> ${cmdStr}`));
    const args = cmdStr.trim().toLowerCase().split(/\s+/);
    const cmd = args[0];
    let target = args.slice(1).join(' ');
    if (!cmd) return;

    let state = forcedState || { ...stateRef.current };

    // --- CHARGEN ROUTING ---
    if (sysState === 'chargen') {
      let cls = ''; let stats = {}; let initInv = []; let initEq = null;
      if (cmd === 'f') { cls = 'Fighter'; stats = {str:16, dex:12, int:8, con:15}; initInv=['iron_sword']; initEq='iron_sword'; }
      else if (cmd === 'm') { cls = 'Mage'; stats = {str:8, dex:10, int:18, con:10}; initInv=['dagger', 'potion']; initEq='dagger'; }
      else if (cmd === 'r') { cls = 'Rogue'; stats = {str:10, dex:18, int:10, con:12}; initInv=['dagger']; initEq='dagger'; }
      else if (cmd === 'c') { cls = 'Cleric'; stats = {str:12, dex:10, int:14, con:16}; initInv=['mace']; initEq='mace'; }
      else { printLine("Invalid class. Type F, M, R, or C."); return; }

      state.cls = cls; state.stats = stats;
      state.maxHp = 20 + (stats.con * 2); state.hp = state.maxHp;
      state.maxMp = 5 + (stats.int * 2); state.mp = state.maxMp;
      state.inv = initInv; state.eq = initEq;

      printLine(c('92', `\nYou are now a ${cls}. Entering the realm...`));
      setSysState('playing');
      setGameState(state);
      setTimeout(() => executeCommand('l', true, state), 500);
      return;
    }

    if (state.hp <= 0 && cmd !== 'restart') return printLine(c('91', "You are dead. Type 'restart'."));
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
        let dir = cmd === 'go' ? DIRS[target[0]] : DIRS[cmd[0]];
        let shortDir = Object.keys(DIRS).find(key => DIRS[key] === dir && key.length === 1);

        if (room.enemies?.length && Math.random() > (state.stats.dex * 0.02)) {
           triggerFlash();
           return printLine(c('31', "Enemies block your path and strike you as you flee!"));
        }
        if (room.exits[shortDir]) { state.room = room.exits[shortDir]; setGameState(state); executeCommand('l', true, state); }
        else printLine("You can't go that way.");
        break;
      }

      case 'wimpy': {
        const wVal = parseInt(target);
        if (!isNaN(wVal) && wVal >= 0) {
          state.wimpy = wVal; printLine(`Wimpy set to ${c('93', wVal)} HP.`); setGameState(state);
        } else printLine(`Current wimpy: ${state.wimpy}. Usage: 'wimpy <number>'`);
        break;
      }

      case 'con': case 'consider': {
        if (!target && room.enemies?.length === 1) target = room.enemies[0];
        const cEnemyId = findEntity(room.enemies||[], state.enemies, target);
        if (cEnemyId) {
          const e = state.enemies[cEnemyId];
          const playerPower = state.maxHp + (state.stats.str * 2);
          const enemyPower = e.maxHp + (e.dmg * 5);
          printLine(`You consider the ${e.name}...`);
          if (enemyPower < playerPower * 0.5) printLine(c('32', "You would crush them like a bug."));
          else if (enemyPower < playerPower) printLine(c('92', "It looks like an easy fight."));
          else if (enemyPower < playerPower * 1.3) printLine(c('93', "It will be a fair fight."));
          else if (enemyPower < playerPower * 2) printLine(c('31', "This is a dangerous foe."));
          else printLine(c('91', "You would be utterly annihilated."));
        } else printLine("Consider who?");
        break;
      }

      case 'flee': {
        if (!room.enemies?.length) return printLine("You are not in combat.");
        const fleeExits = Object.keys(room.exits);
        if (fleeExits.length > 0) {
          if (Math.random() > 0.3) {
            state.room = room.exits[fleeExits[Math.floor(Math.random() * fleeExits.length)]];
            printLine(c('93', "You panic and successfully flee the room!"));
            setGameState(state); executeCommand('l', true, state);
          } else { printLine(c('31', "You try to flee, but your path is blocked!")); }
        } else printLine("There is nowhere to flee!");
        break;
      }

      case 'take': case 'get': {
        const tkId = findEntity(room.items, ITEMS, target);
        if (tkId) { state.inv.push(tkId); room.items.splice(room.items.indexOf(tkId), 1); printLine(`Taken ${ITEMS[tkId].name}.`); setGameState(state); }
        else printLine("Not here."); break;
      }

      case 'drop': {
        const dpIdx = findInvIdx(target);
        if (dpIdx > -1) {
          const id = state.inv[dpIdx]; if(state.eq === id) state.eq = null;
          state.inv.splice(dpIdx, 1); room.items.push(id); printLine(`Dropped ${ITEMS[id].name}.`); setGameState(state);
        } else printLine("You don't have that."); break;
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
          if (item.type === 'consumable') {
            state.hp = Math.min(state.maxHp, state.hp + item.heal); state.inv.splice(usIdx, 1);
            printLine(c('32', `Used ${item.name}! Recovered ${item.heal} HP.`)); setGameState(state);
          } else printLine("Can't use that.");
        } else printLine("You don't have that."); break;
      }

      case 'i': case 'inv':
        printLine(`Inv: ${state.inv.map((id, idx) => id===state.eq && state.inv.indexOf(id) === idx ? ITEMS[id].name+c('90','(eq)') : ITEMS[id].name).join(', ') || 'Empty'}`);
        break;

      case 'x': case 'examine': {
        const exId = findEntity([...state.inv, ...(room.items||[])], ITEMS, target);
        if (exId) return printLine(`${ITEMS[exId].name}: ${ITEMS[exId].desc} ` + (ITEMS[exId].dmg ? `[${c('31',ITEMS[exId].dmg+' DMG')}]` : `[${c('32',ITEMS[exId].heal+' HP')}]`));
        const eId = findEntity(room.enemies||[], state.enemies, target);
        if (eId) { const e = state.enemies[eId]; return printLine(`${e.name}: ${e.desc} [HP: ${e.hp}/${e.maxHp} | DMG: ${e.dmg}]`); }
        printLine("Not found."); break;
      }

      case 'list':
        if (state.room !== 'shop') return printLine("You are not in a shop.");
        printLine(c('36', "--- MERCHANT WARES ---"));
        ['potion', 'iron_sword'].forEach(id => printLine(`${ITEMS[id].name} - ${c('93', ITEMS[id].cost+'g')} : ${ITEMS[id].desc}`));
        break;

      case 'buy': {
        if (state.room !== 'shop') return printLine("You are not in a shop.");
        const buyId = ['potion', 'iron_sword'].find(id => id.includes(target) || ITEMS[id].name.toLowerCase().includes(target));
        if (buyId && state.gold >= ITEMS[buyId].cost) {
          state.gold -= ITEMS[buyId].cost; state.inv.push(buyId);
          printLine(c('32', `Bought ${ITEMS[buyId].name} for ${ITEMS[buyId].cost}g.`)); setGameState(state);
        } else if (buyId) printLine(c('31', "Not enough gold.")); else printLine("Wields no such item.");
        break;
      }

      case 'cast': {
        const parts = target.split(' ');
        const spell = parts[0];
        const sTgt = parts.slice(1).join(' ');
        if (spell === 'heal') {
          if (state.mp < 5) return printLine(c('31', "Need 5 MP."));
          const healAmt = 10 + Math.floor(state.stats.int * 0.8);
          state.mp -= 5; state.hp = Math.min(state.maxHp, state.hp + healAmt);
          printLine(c('32', `Cast Heal! +${healAmt} HP.`)); setGameState(state);
        } else if (spell === 'fireball' || spell === 'drain') {
          const cost = spell==='fireball' ? 8 : 6;
          if (state.mp < cost) return printLine(c('31', `Need ${cost} MP.`));
          let fEnemy = findEntity(room.enemies||[], state.enemies, sTgt || '');
          if (!fEnemy) {
              if (room.enemies?.length === 1) fEnemy = room.enemies[0];
              else return printLine("Target not found.");
          }
          state.mp -= cost;
          let mDmg = spell==='fireball' ? 8 + Math.floor(state.stats.int * 1.2) : 5 + Math.floor(state.stats.int * 0.8);
          handleCombatTurn(state, room, fEnemy, room.enemies.indexOf(fEnemy), mDmg, c(spell==='fireball'?'91':'94', `You cast ${spell.toUpperCase()}!`), spell==='drain'?0.5:0);
        } else printLine("Unknown spell."); break;
      }

      case 'attack': case 'kill': {
        if (!target && room.enemies?.length === 1) target = room.enemies[0];
        const aEnemy = findEntity(room.enemies||[], state.enemies, target);
        if (aEnemy) {
          let pDmg = Math.floor(state.stats.str * 0.5) + (state.eq ? ITEMS[state.eq].dmg : 0);
          handleCombatTurn(state, room, aEnemy, room.enemies.indexOf(aEnemy), pDmg, 'You strike forcefully!');
        } else printLine("Attack what?"); break;
      }

      case 'restart':
        setSysState('booting'); setHistory([]);
        setGameState({ cls: '', stats: { str: 10, dex: 10, int: 10, con: 10 }, room: 'square', inv: [], eq: null, hp: 30, maxHp: 30, mp: 15, maxMp: 15, xp: 0, level: 1, gold: 0, wimpy: 0, world: JSON.parse(JSON.stringify(WORLD)), enemies: JSON.parse(JSON.stringify(ENEMIES)) });
        printLine(c('32', "--- REBOOTED ---"));
        setTimeout(() => setSysState('chargen'), 500);
        break;

      case 'clear': setHistory([]); break;
      default: printLine(`Unknown command: ${c('91', cmd)}`);
    }
  };

  const handleKey = (e) => {
    if (sysState === 'booting') return e.preventDefault();
    if (e.key === 'Enter') {
      if (input.trim()) { setCmdHistory([...cmdHistory, input]); setHistIdx(-1); executeCommand(input); }
      else printLine(c('90', '> '));
      setInput('');
    } else if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
      e.preventDefault(); const nIdx = histIdx < cmdHistory.length-1 ? histIdx+1 : histIdx;
      setHistIdx(nIdx); setInput(cmdHistory[cmdHistory.length - 1 - nIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) { const nIdx = histIdx-1; setHistIdx(nIdx); setInput(cmdHistory[cmdHistory.length - 1 - nIdx]); }
      else { setHistIdx(-1); setInput(''); }
    }
  };

  const mkBar = (c, m) => '█'.repeat(Math.round((Math.max(0,Math.min(c,m))/m)*15)) + '░'.repeat(15-Math.round((Math.max(0,Math.min(c,m))/m)*15));
  const ex = gameState.world[gameState.room].exits;

  return (
    <div className={`w-screen h-screen bg-black text-white flex flex-col selection:bg-green-900 font-sans overflow-hidden transition-colors duration-150 ${flashRed ? 'bg-red-900/30' : ''}`} onClick={() => inputRef.current?.focus()}>
      {/* SVG Filter for Genuine Mosaic Pixelation */}
      <svg width="0" height="0" className="absolute pointer-events-none">
        <filter id="pixelate" x="-20%" y="-20%" width="140%" height="140%" primitiveUnits="userSpaceOnUse">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.75" result="blur" />
          <feImage x="0" y="0" width="2.5" height="2.5" preserveAspectRatio="xMinYMin meet" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyLjUiIGhlaWdodD0iMi41Ij48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==" result="mask" />
          <feTile in="mask" result="tiled_mask" />
          <feComposite in="blur" in2="tiled_mask" operator="in" result="sampled" />
          <feMorphology in="sampled" operator="dilate" radius="1.5" result="pixelated" />
          <feComponentTransfer in="pixelated">
            <feFuncR type="discrete" tableValues="0 0.33 0.66 1" />
            <feFuncG type="discrete" tableValues="0 0.33 0.66 1" />
            <feFuncB type="discrete" tableValues="0 0.33 0.66 1" />
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>
      </svg>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        .vt { font-family: 'VT323', monospace; font-size: 1.35rem; line-height: 1.3; }
        .hid-scroll::-webkit-scrollbar { display: none; } .hid-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .hud-glow { box-shadow: 0 -5px 30px rgba(0,255,100,0.05); }
      `}</style>

      {/* Main Terminal Output */}
      <div className="flex-1 bg-[#050505] p-4 md:p-8 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto hid-scroll vt break-words whitespace-pre-wrap pb-8">
          {history.map((l, i) => <div key={i} className="min-h-[1.5em]">{parseANSI(l)}</div>)}
          {sysState !== 'booting' && gameState.hp > 0 && (
            <div className="flex items-center mt-2">
              <span className="text-green-400 mr-2 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">{sysState==='chargen' ? '?' : '>'}</span>
              <input ref={inputRef} type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} autoFocus className="flex-1 bg-transparent outline-none text-[#f8f8f2] vt drop-shadow-[0_0_5px_rgba(248,248,242,0.5)] caret-green-400" />
            </div>
          )}
          {gameState.hp <= 0 && <div className="mt-2 text-red-500 vt drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">SYSTEM HALTED. TYPE 'RESTART'<input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} className="absolute opacity-0" autoFocus /></div>}
          <div ref={bottomRef} className="h-4"></div>
        </div>
      </div>

      {/* Cyberpunk Fullscreen HUD */}
      {sysState === 'playing' && (
        <div className="shrink-0 h-auto border-t border-green-900/50 bg-[#020202] hud-glow p-4 vt flex flex-col md:flex-row justify-between items-center z-20 text-[1.2rem] relative">

          {/* Left: Vitals & Core Stats */}
          <div className="flex flex-col w-full md:w-1/3 gap-1">
            <div className="flex justify-between w-full max-w-[300px]">
              <span className="text-red-400 font-bold tracking-widest text-shadow-sm">HP</span>
              <span className="text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]">[{mkBar(gameState.hp, gameState.maxHp)}]</span>
              <span className="text-red-400 w-12 text-right font-bold">{gameState.hp}/{gameState.maxHp}</span>
            </div>
            <div className="flex justify-between w-full max-w-[300px]">
              <span className="text-blue-400 font-bold tracking-widest text-shadow-sm">MP</span>
              <span className="text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]">[{mkBar(gameState.mp, gameState.maxMp)}]</span>
              <span className="text-blue-400 w-12 text-right font-bold">{gameState.mp}/{gameState.maxMp}</span>
            </div>
            <div className="flex justify-between w-full max-w-[300px] mt-1 text-[1.1rem]">
              <span className="text-gray-400">Wimpy: <span className="text-yellow-400">{gameState.wimpy}</span></span>
              <span className="text-gray-400">Class: <span className="text-cyan-400">{gameState.cls}</span></span>
            </div>
          </div>

          {/* Center: Location & Loadout */}
          <div className="flex flex-col items-center w-full md:w-1/3 my-4 md:my-0">
            <div className="text-cyan-300 tracking-widest uppercase mb-1 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)] font-bold text-xl">
              [ {gameState.world[gameState.room].name.replace(/\x1b\[[0-9;]*m/g, '')} ]
            </div>
            <div className="flex gap-6 text-lg">
              <span className="text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]">
                <PixelEmoji emoji="💰" /> {gameState.gold}g
              </span>
              <span className="text-gray-300 drop-shadow-[0_0_4px_rgba(209,213,219,0.4)]">
                <PixelEmoji emoji="⚔️" /> {gameState.eq ? ITEMS[gameState.eq].name.replace(/\x1b\[[0-9;]*m/g,'') : 'Unarmed'}
              </span>
            </div>
          </div>

          {/* Right: ASCII Compass */}
          <div className="flex flex-col items-center w-full md:w-1/3 text-gray-600 font-bold leading-none text-2xl drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]">
            <div className={ex.n?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.n?'N':'-'}</div>
            <div className="flex gap-4 my-1">
              <span className={ex.w?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.w?'W':'-'}</span>
              <span className="text-green-500">✛</span>
              <span className={ex.e?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.e?'E':'-'}</span>
            </div>
            <div className={ex.s?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.s?'S':'-'}</div>
          </div>

        </div>
      )}
    </div>
  );
}
