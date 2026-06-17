
import React, { useState } from 'react';
import { Friend } from '../types';
import { UserPlusIcon, HeartIcon, TrophyIcon, UserMinusIcon } from '@heroicons/react/24/solid';

interface SocialPanelProps {
  friends: Friend[];
  onAddFriend: (name: string) => void;
  onRemoveFriend: (id: string) => void;
  onBattleFriend: (friend: Friend) => void;
  onAssistFriend: (friend: Friend) => void;
}

const SocialPanel: React.FC<SocialPanelProps> = ({ friends, onAddFriend, onRemoveFriend, onBattleFriend, onAssistFriend }) => {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      onAddFriend(newName);
      setNewName('');
    }
  };

  return (
    <div className="p-6 pb-28 h-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-6">Neighborhood Watch</h2>
      
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-8">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Add Park Manager</h3>
        <div className="flex gap-2">
          <input 
            type="text" 
            placeholder="Username..." 
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 ring-indigo-100"
          />
          <button 
            onClick={handleAdd}
            className="bg-indigo-600 text-white p-2 rounded-xl active:scale-95 transition-transform"
          >
            <UserPlusIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {friends.length > 0 ? friends.map(friend => (
          <div key={friend.id} className="bg-white p-5 rounded-[2.5rem] border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl">
              {friend.roamerAvatar}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-black text-slate-800 text-xs uppercase">{friend.name}</h4>
                <span className="text-[8px] font-black text-slate-400">LV.{friend.level}</span>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Active {friend.lastActive}</p>
              <div className="flex gap-2 mt-3">
                <button 
                  onClick={() => onBattleFriend(friend)}
                  className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 active:scale-95"
                >
                  <TrophyIcon className="w-3 h-3" /> Spar
                </button>
                <button 
                  onClick={() => onAssistFriend(friend)}
                  className="bg-green-100 text-green-600 px-3 py-1.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 active:scale-95"
                >
                  <HeartIcon className="w-3 h-3" /> Assist
                </button>
                <button 
                  onClick={() => onRemoveFriend(friend.id)}
                  className="ml-auto text-slate-300 hover:text-red-400"
                >
                  <UserMinusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-12 opacity-30 italic text-xs">No friends added yet. Ask for their Park Manager ID!</div>
        )}
      </div>
    </div>
  );
};

export default SocialPanel;
