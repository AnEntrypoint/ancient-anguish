import React, { useState, useEffect, useRef } from 'react';
import { c, DIRS } from './constants.js';
import { ITEMS, freshWorld, freshEnemies, INITIAL_STATE } from './data.js';
import { parseANSI, PixelEmoji } from './ansi.jsx';
import { useCombat } from './useCombat.js';
import { buildExecuteCommand } from './commands.js';

export default function App() {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [sysState, setSysState] = useState('booting');
  const [flashRed, setFlashRed] = useState(false);
  const [gameState, setGameState] = useState({ ...INITIAL_STATE, world: freshWorld(), enemies: freshEnemies() });
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const stateRef = useRef(null);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const triggerFlash = () => { setFlashRed(true); setTimeout(() => setFlashRed(false), 150); };
  const printLine = (t) => setHistory(p => [...p, t]);
  const handleCombatTurn = useCombat(printLine, triggerFlash, setGameState);

  const executeCommand = buildExecuteCommand({ stateRef, sysState, setSysState, printLine, triggerFlash, setGameState, setHistory, handleCombatTurn });

  useEffect(() => {
    if (sysState !== 'playing') return;
    const tick = setInterval(() => {
      const state = { ...stateRef.current };
      const room = state.world[state.room];
      let changed = false;
      if (state.hp <= 0) return;
      if (state.room === 'guild' && (state.hp < state.maxHp || state.mp < state.maxMp)) {
        state.hp = Math.min(state.maxHp, state.hp + Math.floor(state.stats.con / 3));
        state.mp = Math.min(state.maxMp, state.mp + Math.floor(state.stats.int / 3));
        if (Math.random() > 0.7) printLine(c('34', "You feel rested in the safety of the guild."));
        changed = true;
      }
      if (room.enemies?.length > 0) {
        let fled = false;
        room.enemies.forEach(eId => {
          if (fled) return;
          const enemy = state.enemies[eId];
          if (Math.random() >= 0.20) return;
          if (Math.random() < state.stats.dex * 0.015) {
            printLine(`\n${c('93','[DODGE]')} You evade the ${enemy.name}'s attack!`);
          } else {
            const dmg = Math.max(1, enemy.dmg + Math.floor(Math.random()*3) - 1);
            state.hp -= dmg;
            printLine(`\n${c('91','[COMBAT]')} The ${enemy.name} hits you for ${c('91',dmg)} damage!`);
            triggerFlash(); changed = true;
            if (state.hp <= 0) { printLine(c('91',"\n*** YOU DIED. TYPE 'RESTART' ***")); fled = true; }
            else if (state.wimpy > 0 && state.hp <= state.wimpy) {
              printLine(c('93',`\n*** WIMPY: HP below ${state.wimpy}! Fleeing! ***`));
              const exits = Object.keys(room.exits);
              if (exits.length > 0) { const dir = exits[Math.floor(Math.random()*exits.length)]; state.room = room.exits[dir]; fled = true; printLine(c('90',`You flee ${DIRS[dir]}...`)); setTimeout(() => executeCommand('l',true,state), 100); }
              else printLine(c('91',"Nowhere to flee!"));
            }
          }
        });
      }
      if (changed) setGameState(state);
    }, 4000);
    return () => clearInterval(tick);
  }, [sysState]);

  useEffect(() => {
    const boot = async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const l of [c('90','ANCIENT MUD OS INIT...'), c('90','LOADING GUILD MODULES... [OK]'), c('32','CONNECTION ESTABLISHED.')]) { printLine(l); await sleep(150); }
      printLine(c('96',"\n==========================================================")); printLine(c('97'," Welcome to the REAL-TIME Realm. Choose your path.")); printLine(c('96',"=========================================================="));
      printLine(c('36',"Select your class:"));
      [`  [${c('93','F')}] Fighter : High Strength and Constitution.`, `  [${c('93','M')}] Mage    : High Intelligence, relies on spells.`, `  [${c('93','R')}] Rogue   : High Dexterity, crits and dodges.`, `  [${c('93','C')}] Cleric  : Balanced, tough, resilient.`].forEach(printLine);
      printLine(c('90',"\nType F, M, R, or C to begin.")); setSysState('chargen');
    }; boot();
  }, []);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), [history]);

  const handleKey = (e) => {
    if (sysState === 'booting') return e.preventDefault();
    if (e.key === 'Enter') {
      if (input.trim()) { setCmdHistory([...cmdHistory, input]); setHistIdx(-1); executeCommand(input); }
      else printLine(c('90','> '));
      setInput('');
    } else if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
      e.preventDefault(); const nIdx = histIdx < cmdHistory.length-1 ? histIdx+1 : histIdx;
      setHistIdx(nIdx); setInput(cmdHistory[cmdHistory.length-1-nIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) { const nIdx = histIdx-1; setHistIdx(nIdx); setInput(cmdHistory[cmdHistory.length-1-nIdx]); }
      else { setHistIdx(-1); setInput(''); }
    }
  };

  const mkBar = (v, m) => '█'.repeat(Math.round((Math.max(0,Math.min(v,m))/m)*15)) + '░'.repeat(15-Math.round((Math.max(0,Math.min(v,m))/m)*15));
  const ex = gameState.world[gameState.room].exits;

  return (
    <div className={`w-screen h-screen bg-black text-white flex flex-col selection:bg-green-900 font-sans overflow-hidden transition-colors duration-150 ${flashRed?'bg-red-900/30':''}`} onClick={() => inputRef.current?.focus()}>
      <svg width="0" height="0" className="absolute pointer-events-none">
        <filter id="pixelate" x="-20%" y="-20%" width="140%" height="140%" primitiveUnits="userSpaceOnUse">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.75" result="blur" />
          <feImage x="0" y="0" width="2.5" height="2.5" preserveAspectRatio="xMinYMin meet" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyLjUiIGhlaWdodD0iMi41Ij48cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==" result="mask" />
          <feTile in="mask" result="tiled_mask" />
          <feComposite in="blur" in2="tiled_mask" operator="in" result="sampled" />
          <feMorphology in="sampled" operator="dilate" radius="1.5" result="pixelated" />
          <feComponentTransfer in="pixelated">
            <feFuncR type="discrete" tableValues="0 0.33 0.66 1" /><feFuncG type="discrete" tableValues="0 0.33 0.66 1" /><feFuncB type="discrete" tableValues="0 0.33 0.66 1" /><feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>
      </svg>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=VT323&display=swap'); .vt{font-family:'VT323',monospace;font-size:1.35rem;line-height:1.3} .hid-scroll::-webkit-scrollbar{display:none} .hid-scroll{-ms-overflow-style:none;scrollbar-width:none} .hud-glow{box-shadow:0 -5px 30px rgba(0,255,100,0.05)}`}</style>
      <div className="flex-1 bg-[#050505] p-4 md:p-8 flex flex-col relative overflow-hidden">
        <div className="flex-1 overflow-y-auto hid-scroll vt break-words whitespace-pre-wrap pb-8">
          {history.map((l,i) => <div key={i} className="min-h-[1.5em]">{parseANSI(l)}</div>)}
          {sysState !== 'booting' && gameState.hp > 0 && (
            <div className="flex items-center mt-2">
              <span className="text-green-400 mr-2 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">{sysState==='chargen'?'?':'>'}</span>
              <input ref={inputRef} type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} autoFocus className="flex-1 bg-transparent outline-none text-[#f8f8f2] vt drop-shadow-[0_0_5px_rgba(248,248,242,0.5)] caret-green-400" />
            </div>
          )}
          {gameState.hp <= 0 && <div className="mt-2 text-red-500 vt drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">SYSTEM HALTED. TYPE 'RESTART'<input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} className="absolute opacity-0" autoFocus /></div>}
          <div ref={bottomRef} className="h-4" />
        </div>
      </div>
      {sysState === 'playing' && (
        <div className="shrink-0 border-t border-green-900/50 bg-[#020202] hud-glow p-4 vt flex flex-col md:flex-row justify-between items-center z-20 text-[1.2rem]">
          <div className="flex flex-col w-full md:w-1/3 gap-1">
            <div className="flex justify-between w-full max-w-[300px]"><span className="text-red-400 font-bold tracking-widest">HP</span><span className="text-red-500 drop-shadow-[0_0_4px_rgba(239,68,68,0.6)]">[{mkBar(gameState.hp,gameState.maxHp)}]</span><span className="text-red-400 w-12 text-right font-bold">{gameState.hp}/{gameState.maxHp}</span></div>
            <div className="flex justify-between w-full max-w-[300px]"><span className="text-blue-400 font-bold tracking-widest">MP</span><span className="text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]">[{mkBar(gameState.mp,gameState.maxMp)}]</span><span className="text-blue-400 w-12 text-right font-bold">{gameState.mp}/{gameState.maxMp}</span></div>
            <div className="flex justify-between w-full max-w-[300px] mt-1 text-[1.1rem]"><span className="text-gray-400">Wimpy: <span className="text-yellow-400">{gameState.wimpy}</span></span><span className="text-gray-400">Class: <span className="text-cyan-400">{gameState.cls}</span></span></div>
          </div>
          <div className="flex flex-col items-center w-full md:w-1/3 my-4 md:my-0">
            <div className="text-cyan-300 tracking-widest uppercase mb-1 drop-shadow-[0_0_8px_rgba(103,232,249,0.8)] font-bold text-xl">[ {gameState.world[gameState.room].name.replace(/\x1b\[[0-9;]*m/g,'')} ]</div>
            <div className="flex gap-6 text-lg">
              <span className="text-yellow-500"><PixelEmoji emoji="💰" /> {gameState.gold}g</span>
              <span className="text-gray-300"><PixelEmoji emoji="⚔️" /> {gameState.eq ? ITEMS[gameState.eq].name.replace(/\x1b\[[0-9;]*m/g,'') : 'Unarmed'}</span>
            </div>
          </div>
          <div className="flex flex-col items-center w-full md:w-1/3 text-gray-600 font-bold leading-none text-2xl">
            <div className={ex.n?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.n?'N':'-'}</div>
            <div className="flex gap-4 my-1"><span className={ex.w?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.w?'W':'-'}</span><span className="text-green-500">✛</span><span className={ex.e?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.e?'E':'-'}</span></div>
            <div className={ex.s?'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]':''}>{ex.s?'S':'-'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
