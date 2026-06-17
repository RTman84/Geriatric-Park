
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, Rectangle, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Elder, MapItem, Friend, Parcel, Structure } from '../types';
import { ELDER_AVATARS, WORLD_PATHS } from '../constants';
import { 
  PlusCircleIcon, 
  MinusCircleIcon, 
  ArrowPathIcon,
  EnvelopeIcon,
  MapPinIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/solid';

// Fix for default marker icons in Leaflet with React
import 'leaflet/dist/leaflet.css';

interface GameMapProps {
  isDark: boolean;
  currentLocation: { lat: number; lng: number };
  nearbyElders: Elder[];
  nearbyFriends: Friend[];
  nearbyItems: MapItem[];
  nearbyStructures: Structure[];
  heldStructureIds: string[];
  ownedParcels: Parcel[];
  roamingElders?: Elder[];
  unreadMailCount?: number;
  onElderClick: (elder: Elder) => void;
  onItemClick: (item: MapItem) => void;
  onEventClick: (evt: any) => void;
  onPlayerClick: () => void;
  onMailClick?: () => void;
  onBuyParcel: () => void;
}

const RecenterButton: React.FC<{ 
  center: [number, number], 
  zoom: number, 
  isFollowing: boolean, 
  onDragStart: () => void,
  onZoomEnd: (zoom: number) => void 
}> = ({ center, zoom, isFollowing, onDragStart, onZoomEnd }) => {
  const map = useMapEvents({
    dragstart: onDragStart,
    zoomend: () => {
      onZoomEnd(map.getZoom());
    }
  });
  
  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  useEffect(() => {
    if (isFollowing) {
      map.setView(center, zoom, { animate: true });
    } else {
      // If not following, still allow the zoom buttons to work on the current map center
      map.setZoom(zoom, { animate: true });
    }
  }, [center, zoom, map, isFollowing]);
  return null;
};

const GameMap: React.FC<GameMapProps> = ({ 
  isDark,
  currentLocation, 
  nearbyElders, 
  nearbyFriends,
  nearbyItems,
  nearbyStructures,
  heldStructureIds,
  ownedParcels,
  roamingElders = [],
  unreadMailCount = 0,
  onElderClick,
  onItemClick,
  onEventClick,
  onPlayerClick,
  onMailClick,
  onBuyParcel
}) => {
  const [zoom, setZoom] = useState(18);
  const [isFollowing, setIsFollowing] = useState(true);

  const createCustomIcon = (emoji: string, size: number = 40, color: string = 'white', isRoaming: boolean = false) => {
    const glow = isRoaming ? 'box-shadow: 0 0 15px #4f46e5, 0 0 5px #4f46e5;' : 'box-shadow: 0 4px 10px rgba(0,0,0,0.3);';
    return L.divIcon({
      html: `<div style="font-size: ${size}px; background: ${color}; border-radius: 50%; width: ${size + 12}px; height: ${size + 12}px; display: flex; align-items: center; justify-content: center; border: 3px solid white; ${glow}">${emoji}</div>`,
      className: 'custom-div-icon',
      iconSize: [size + 12, size + 12],
      iconAnchor: [(size + 12) / 2, (size + 12) / 2],
    });
  };

  const playerIcon = createCustomIcon('🧑‍🦽', 50, '#4f46e5', true);

  const getParcelColor = (type: string) => {
    switch (type) {
      case 'Rare': return '#3b82f6';
      case 'Epic': return '#a855f7';
      case 'Legendary': return '#eab308';
      default: return '#10b981';
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapContainer 
        center={[currentLocation.lat, currentLocation.lng]} 
        zoom={zoom} 
        zoomControl={false}
        className="w-full h-full"
        style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
      >
        <TileLayer
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <RecenterButton 
          center={[currentLocation.lat, currentLocation.lng]} 
          zoom={zoom} 
          isFollowing={isFollowing} 
          onDragStart={() => setIsFollowing(false)}
          onZoomEnd={(z) => setZoom(z)}
        />

        {/* World Paths (Roads) */}
        {WORLD_PATHS.map(path => (
          <Polyline 
            key={path.id} 
            positions={path.points.map(p => [p.lat, p.lng] as [number, number])} 
            pathOptions={{ color: isDark ? '#334155' : '#64748b', weight: 3, opacity: 0.6, dashArray: '5, 10' }} 
          />
        ))}

        {/* Parcels Grid Overlay (Simulated) */}
        {ownedParcels.map(p => (
          <Rectangle 
            key={p.id}
            bounds={[
              [p.lat, p.lng],
              [p.lat + 0.0001, p.lng + 0.0001]
            ]}
            pathOptions={{ 
              color: getParcelColor(p.type), 
              fillColor: getParcelColor(p.type), 
              fillOpacity: 0.4,
              weight: 1
            }}
          >
            <Popup>
              <div className="text-xs font-bold uppercase">
                {p.type} Parcel Owned
              </div>
            </Popup>
          </Rectangle>
        ))}

        {/* Player Marker */}
        <Marker position={[currentLocation.lat, currentLocation.lng]} icon={playerIcon} eventHandlers={{ click: onPlayerClick }} />

        {/* Elders */}
        {nearbyElders.map(elder => (
          <Marker 
            key={elder.id} 
            position={[elder.lat, elder.lng]} 
            icon={createCustomIcon(ELDER_AVATARS[elder.type][0], 44, isDark ? '#1e293b' : 'white', true)}
            eventHandlers={{ click: () => onElderClick(elder) }}
          />
        ))}

        {/* Roaming Team Members */}
        {roamingElders.map(elder => (
          <Marker 
            key={elder.id} 
            position={[elder.lat, elder.lng]} 
            icon={createCustomIcon(ELDER_AVATARS[elder.type][0], 44, '#4f46e5', true)}
            eventHandlers={{ click: () => onElderClick(elder) }}
          />
        ))}

        {/* Items */}
        {nearbyItems.map(item => (
          <Marker 
            key={item.id} 
            position={[item.lat, item.lng]} 
            icon={createCustomIcon(item.icon, 32, '#fbbf24')}
            zIndexOffset={500}
            eventHandlers={{ click: () => onItemClick(item) }}
          />
        ))}

        {/* Static Structures */}
        {nearbyStructures.map(st => {
          const isHeld = heldStructureIds.includes(st.id);
          return (
            <Marker 
              key={st.id} 
              position={[st.lat, st.lng]} 
              icon={createCustomIcon(st.icon, 60, isHeld ? '#4f46e5' : (isDark ? '#334155' : 'white'))}
              eventHandlers={{ click: () => onEventClick(st) }}
            >
              <Popup>
                <div className="p-2 text-center">
                  <h3 className="font-black uppercase text-sm">{st.name}</h3>
                  {isHeld && <div className="text-[10px] font-black text-indigo-500 uppercase mb-1">✓ Held by You</div>}
                  <p className="text-[10px] opacity-60">{st.description}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="absolute top-6 left-6 flex flex-col gap-3 z-[1000]">
        <div className={`px-4 py-2 rounded-2xl border shadow-xl backdrop-blur-md flex items-center gap-2 ${isDark ? 'bg-slate-900/80 border-slate-700 text-white' : 'bg-white/90 border-slate-100 text-slate-800'}`}>
          <MapPinIcon className="w-4 h-4 text-indigo-500" />
          <span className="text-[10px] font-black uppercase tracking-tighter">
            {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </span>
        </div>
        {unreadMailCount > 0 && (
          <button 
            onClick={onMailClick} 
            className="w-16 h-16 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white relative animate-bounce border-4 border-white"
          >
            <EnvelopeIcon className="w-8 h-8" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">
              {unreadMailCount}
            </div>
          </button>
        )}
      </div>

      <div className="absolute bottom-24 right-6 flex flex-col gap-3 z-[1000]">
        <button 
          onClick={onBuyParcel}
          className="w-16 h-16 bg-emerald-600 text-white rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-white active:scale-95 transition-transform group"
          title="Buy Parcel"
        >
          <MapPinIcon className="w-6 h-6" />
          <span className="text-[8px] font-black uppercase mt-0.5">Buy</span>
        </button>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-[1000]">
        <button onClick={() => setIsFollowing(true)} className={`p-4 rounded-[1.5rem] shadow-xl border transition-all ${isFollowing ? 'bg-indigo-600 border-indigo-500 text-white' : isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white/95 border-slate-100 text-indigo-600'}`}>
          <ArrowPathIcon className={`w-8 h-8 ${isFollowing ? 'animate-spin-slow' : ''}`} />
        </button>
        <button onClick={() => setZoom(z => Math.min(z + 1, 20))} className={`p-4 rounded-[1.5rem] shadow-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white/95 border-slate-100 text-indigo-600'}`}><PlusCircleIcon className="w-8 h-8" /></button>
        <button onClick={() => setZoom(z => Math.max(z - 1, 10))} className={`p-4 rounded-[1.5rem] shadow-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white/95 border-slate-100 text-indigo-600'}`}><MinusCircleIcon className="w-8 h-8" /></button>
      </div>
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default GameMap;
