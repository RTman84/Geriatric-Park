
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Elder, PowerType } from '../types';
import { ELDER_AVATARS, POWER_ADVANTAGE, ELDER_TYPE_STYLING } from '../constants';
import { generateBattleDialogue } from '../services/geminiService';
import { audioManager } from '../services/audioManager';
import { PlayIcon, ArrowsRightLeftIcon, CpuChipIcon } from '@heroicons/react/24/solid';

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
}

interface BattleScreenProps {
  playerTeam: Elder[];
  opponentElder: Elder;
  onWin: (updatedTeam: Elder[]) => void;
  onLose: (updatedTeam: Elder[]) => void;
  onSkip?: () => void;
  isFriendBattle?: boolean;
  sfxEnabled?: boolean;
}

const BattleScreen: React.FC<BattleScreenProps> = ({ playerTeam, opponentElder, onWin, onLose, onSkip, isFriendBattle, sfxEnabled }) => {
  const [teamState, setTeamState] = useState<Elder[]>(JSON.parse(JSON.stringify(playerTeam)));
  const [activeIndex, setActiveIndex] = useState(0);
  const [oppHp, setOppHp] = useState(opponentElder.hp);
  const [log, setLog] = useState<string[]>(["The argument begins!"]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [round, setRound] = useState(1);
  const [shaking, setShaking] = useState<'player' | 'opponent' | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [battleFinished, setBattleFinished] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);
  const [isAuto, setIsAuto] = useState(false);
  
  const activeElder = teamState[activeIndex];
  const textIdCounter = useRef(0);

  const getEffectiveCombatStats = (elder: Elder) => {
    let s = elder.strength;
    let w = elder.wit;
    let a = elder.agility;
    let t = elder.tenacity;

    if (elder.equipment.head) w += elder.equipment.head.boost;
    if (elder.equipment.body) t += elder.equipment.body.boost;
    if (elder.equipment.accessory) {
      s += Math.ceil(elder.equipment.accessory.boost / 2);
      a += Math.floor(elder.equipment.accessory.boost / 2);
    }
    return { strength: s, wit: w, agility: a, tenacity: t };
  };

  const addFloatingText = (text: string, side: 'player' | 'opponent') => {
    const id = ++textIdCounter.current;
    const x = side === 'opponent' ? 50 : 50;
    const y = side === 'opponent' ? 20 : 60;
    setFloatingTexts(prev => [...prev, { id, text, x, y }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(t => t.id !== id));
    }, 1000);
  };

  const addLog = (msg: string) => setLog(prev => [msg, ...prev].slice(0, 5));

  const calculateDamage = (attacker: Elder, defender: Elder) => {
    const aStats = getEffectiveCombatStats(attacker);
    const dStats = getEffectiveCombatStats(defender);

    let base = Math.floor(Math.random() * (aStats.wit + aStats.strength) / 2) + attacker.level;
    base = Math.max(1, base - Math.floor(dStats.tenacity / 10));

    let isAdvantage = false;
    if (POWER_ADVANTAGE[attacker.powerType] === defender.powerType) {
      base = Math.floor(base * 1.5);
      isAdvantage = true;
    }
    return { damage: Math.max(2, base), isAdvantage };
  };

  const handleTurn = async () => {
    if (isAnimating || battleFinished || showSwitchMenu) return;
    setIsAnimating(true);
    if (sfxEnabled) audioManager.playSFX('click');

    // Player Turn
    const pAttack = calculateDamage(activeElder, opponentElder);
    if (pAttack.isAdvantage) addLog(`${activeElder.name} found a logical flaw!`);
    setShaking('opponent');
    addFloatingText(`-${pAttack.damage}`, 'opponent');
    if (sfxEnabled) audioManager.playSFX('hit');
    const newOppHp = Math.max(0, oppHp - pAttack.damage);
    setOppHp(newOppHp);

    if (newOppHp <= 0) {
      addLog(`${opponentElder.name} had to go sit down!`);
      setBattleFinished(true);
      setTimeout(() => onWin(teamState), 1500);
      return;
    }

    await new Promise(r => setTimeout(r, 800));
    setShaking(null);

    // Opponent Turn
    const oAttack = calculateDamage(opponentElder, activeElder);
    setShaking('player');
    addFloatingText(`-${oAttack.damage}`, 'player');
    if (sfxEnabled) audioManager.playSFX('hit');
    const nextTeamState = teamState.map((e, i) => 
      i === activeIndex ? { ...e, hp: Math.max(0, e.hp - oAttack.damage) } : e
    );
    setTeamState(nextTeamState);

    if (nextTeamState[activeIndex].hp <= 0) {
      addLog(`${activeElder.name} is taking a nap...`);
      const nextAvailable = nextTeamState.findIndex(e => e.hp > 0);
      if (nextAvailable === -1) {
        addLog("Your whole team is exhausted!");
        setBattleFinished(true);
        setTimeout(() => onLose(nextTeamState), 1500);
      } else {
        addLog(`${nextTeamState[nextAvailable].name} steps up!`);
        if (sfxEnabled) audioManager.playSFX('victory');
        setActiveIndex(nextAvailable);
      }
    }

    await new Promise(r => setTimeout(r, 800));
    setShaking(null);
    setRound(r => r + 1);
    setIsAnimating(false);
  };

  useEffect(() => {
    if (isAuto && !isAnimating && !battleFinished && !showSwitchMenu) {
      const timer = setTimeout(handleTurn, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuto, isAnimating, battleFinished, showSwitchMenu]);

  useEffect(() => {
    if (round === 1) {
      generateBattleDialogue(activeElder.name, activeElder.type, "Battle Start")
        .then(quote => addLog(`${activeElder.name}: "${quote}"`));
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-start min-h-full w-full p-4 bg-slate-900 overflow-y-auto custom-scrollbar">
      <div className="relative w-full max-w-lg flex flex-col pt-4 pb-24 gap-8">
        <div className="flex justify-between items-center z-10 px-2 sticky top-0 bg-slate-900/80 backdrop-blur py-2 rounded-xl">
          <div className="flex gap-2">
            <div className="bg-white/10 backdrop-blur px-4 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/5">
              {isFriendBattle ? "EXHIBITION" : `ROUND ${round}`}
            </div>
            <button 
              onClick={() => { if(sfxEnabled) audioManager.playSFX('click'); setIsAuto(!isAuto); }}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 transition-all ${isAuto ? 'bg-amber-400 text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-white/10 text-white border border-white/5'}`}
            >
              <CpuChipIcon className="w-3 h-3" /> {isAuto ? 'AUTO ON' : 'AUTO OFF'}
            </button>
          </div>
          {onSkip && !battleFinished && (
            <button onClick={onSkip} className="bg-white/10 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-white/5">
              Skip
            </button>
          )}
        </div>

        <div className="absolute inset-0 pointer-events-none z-50">
          {floatingTexts.map(t => (
            <div key={t.id} className="absolute text-4xl font-black text-red-500 animate-bounce" style={{ left: `${t.x}%`, top: `${t.y}%`, textShadow: '4px 4px 0 black' }}>{t.text}</div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className={`transition-transform duration-75 ${shaking === 'opponent' ? 'animate-[shake_0.2s_infinite]' : ''}`}>
            <div className="text-[120px] sm:text-[140px] drop-shadow-[0_20px_50px_rgba(255,255,255,0.1)] relative">
              {ELDER_AVATARS[opponentElder.type][0]}
            </div>
          </div>
          <div className="w-full max-w-xs bg-black/60 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{opponentElder.name}</span>
              <span className="text-[10px] font-black text-red-400 tracking-widest">{oppHp} HP</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${(oppHp / opponentElder.maxHp) * 100}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-black/50 backdrop-blur-md p-5 rounded-[2.5rem] border border-white/5 mx-2 min-h-[120px] flex flex-col justify-end gap-1 shadow-inner">
          {log.slice().reverse().map((m, i) => (
            <div key={i} className={`text-[9px] font-bold uppercase transition-all duration-300 tracking-tight leading-tight ${i === log.length - 1 ? 'text-yellow-400 text-[11px]' : 'opacity-20'}`}>
              {m}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-full max-w-xs bg-black/60 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10 shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{activeElder.name}</span>
              <span className="text-[10px] font-black text-blue-400 tracking-widest">{activeElder.hp} HP</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(activeElder.hp / activeElder.maxHp) * 100}%` }}></div>
            </div>
          </div>
          <div className={`transition-transform duration-75 scale-x-[-1] ${shaking === 'player' ? 'animate-[shake_0.2s_infinite]' : ''}`}>
            <div className="text-[120px] sm:text-[140px] drop-shadow-[0_20px_50px_rgba(59,130,246,0.2)] relative">
              {ELDER_AVATARS[activeElder.type][0]}
            </div>
          </div>
        </div>

        <div className="sticky bottom-4 left-0 right-0 flex gap-3 px-2 z-50">
          <button 
            onClick={handleTurn} 
            disabled={isAnimating || battleFinished || isAuto}
            className={`flex-1 font-black py-6 rounded-3xl shadow-2xl active:scale-95 transition-all text-sm uppercase tracking-widest border-b-8 ${isAuto ? 'bg-slate-800 text-slate-500 border-slate-900 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-900'}`}
          >
            {isAnimating ? 'Debating...' : 'Cast Doubt'}
          </button>
          <button 
            onClick={() => { if(sfxEnabled) audioManager.playSFX('click'); setShowSwitchMenu(true); }}
            disabled={isAnimating || battleFinished}
            className="w-24 bg-slate-700 hover:bg-slate-600 text-white rounded-3xl flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl border-b-8 border-slate-900"
          >
            <ArrowsRightLeftIcon className="w-6 h-6 mb-1" />
            <span className="text-[7px] font-black uppercase">Switch</span>
          </button>
        </div>

        {showSwitchMenu && (
          <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-6">
            <div className="bg-slate-900 w-full max-w-sm rounded-[3rem] p-8 flex flex-col border border-white/10 shadow-2xl overflow-hidden max-h-[80vh]">
              <h3 className="text-white font-black text-center uppercase tracking-tighter text-xl mb-6 italic">Tag Team</h3>
              <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar p-1">
                {teamState.map((elder, idx) => (
                  <button
                    key={elder.id}
                    disabled={elder.hp <= 0 || idx === activeIndex}
                    onClick={() => { 
                      if(sfxEnabled) audioManager.playSFX('victory');
                      setActiveIndex(idx); 
                      setShowSwitchMenu(false); 
                      addLog(`${elder.name} tags in!`); 
                    }}
                    className={`p-5 rounded-[2rem] border-4 flex flex-col items-center gap-3 transition-all ${idx === activeIndex ? 'border-indigo-500 bg-indigo-500/20' : 'border-white/5 bg-white/5'} ${elder.hp <= 0 ? 'opacity-30 grayscale' : 'active:scale-95'}`}
                  >
                    <span className="text-4xl">{ELDER_AVATARS[elder.type][0]}</span>
                    <span className="text-[9px] text-white font-black uppercase truncate w-full text-center tracking-tighter">{elder.name}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => { if(sfxEnabled) audioManager.playSFX('click'); setShowSwitchMenu(false); }} className="mt-6 bg-white/10 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-transform">Close</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
};

export default BattleScreen;
