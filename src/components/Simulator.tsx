import React from 'react';
import { Thermometer, CloudRain, Droplets, Settings, ShieldAlert, AlertTriangle, Cpu } from 'lucide-react';

interface SimulatorProps {
  tempOffset: number;
  rainfallOffset: number;
  humidityOffset: number;
  onTempChange: (val: number) => void;
  onRainfallChange: (val: number) => void;
  onHumidityChange: (val: number) => void;
  onReset: () => void;
  activeLayer: string;
  onLayerChange: (layer: string) => void;
}

export const Simulator: React.FC<SimulatorProps> = ({
  tempOffset,
  rainfallOffset,
  humidityOffset,
  onTempChange,
  onRainfallChange,
  onHumidityChange,
  onReset,
  activeLayer,
  onLayerChange
}) => {
  const layers = [
    { id: 'temp', label: 'Temperature', icon: Thermometer, color: 'text-brand-yellow border-brand-yellow/30 bg-brand-yellow/5' },
    { id: 'rainfall', label: 'Rainfall', icon: CloudRain, color: 'text-brand-blue border-brand-blue/30 bg-brand-blue/5' },
    { id: 'humidity', label: 'Humidity', icon: Droplets, color: 'text-brand-mint border-brand-mint/30 bg-brand-mint/5' },
    { id: 'flood', label: 'Flood Risk', icon: ShieldAlert, color: 'text-red-500 border-red-500/30 bg-red-500/5' },
    { id: 'crop', label: 'Crop Stress', icon: AlertTriangle, color: 'text-amber-600 border-amber-600/30 bg-amber-600/5' },
    { id: 'ai', label: 'AI Anomaly', icon: Cpu, color: 'text-purple-600 border-purple-600/30 bg-purple-600/5' }
  ];

  return (
    <div className="glass-card p-5 flex flex-col justify-between min-h-full border border-brand-green/10">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-green animate-spin-slow" />
            <h2 className="font-display font-bold text-base text-forest-text tracking-wide">
              WHAT-IF SIMULATOR
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(tempOffset !== 0 || rainfallOffset !== 0 || humidityOffset !== 0) && (
              <button
                onClick={onReset}
                className="px-2 py-0.5 text-[9px] font-mono font-bold text-brand-green hover:text-white bg-brand-green/5 hover:bg-brand-green border border-brand-green/15 hover:border-brand-green rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
              >
                Show Current
              </button>
            )}
            <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-brand-green/5 border border-brand-green/10 text-brand-green font-bold tracking-widest uppercase">
              LIVE FEED
            </span>
          </div>
        </div>

        <p className="text-xs text-forest-text/65 mb-5 font-sans leading-relaxed">
          Tweak baseline variables to simulate climate impacts. Drag sliders to update the digital twin map and risk models instantly.
        </p>

        {/* Simulation Layer Switcher */}
        <div className="mb-6">
          <h3 className="font-sans text-[10px] text-forest-text/40 tracking-widest uppercase mb-3 font-semibold">
            SIMULATION LAYER
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {layers.map((layer) => {
              const Icon = layer.icon;
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => onLayerChange(layer.id)}
                  className={`py-1.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 border text-[10px] transition-all duration-300 cursor-pointer ${
                    isActive
                      ? `${layer.color} border-current ring-1 ring-brand-green/10 font-bold scale-[1.01] shadow-sm`
                      : 'bg-brand-green/5 border-brand-green/10 text-forest-text/60 hover:text-forest-text hover:bg-brand-green/10 hover:border-brand-green/20'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                  <span className="font-sans text-[8px] tracking-wide font-medium">{layer.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders Container */}
        <div className="space-y-5">
          {/* Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-forest-text/80">
                <Thermometer className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Temperature Variance</span>
              </div>
              <span className={`font-semibold ${tempOffset > 0 ? 'text-brand-yellow text-glow-yellow' : tempOffset < 0 ? 'text-brand-blue' : 'text-forest-text/60'}`}>
                {tempOffset > 0 ? `+${tempOffset}` : tempOffset}°C
              </span>
            </div>
            <input
              type="range"
              min="-2"
              max="5"
              step="0.5"
              value={tempOffset}
              onChange={(e) => onTempChange(parseFloat(e.target.value))}
              className="w-full h-1 bg-brand-green/10 rounded-lg appearance-none cursor-pointer accent-brand-green"
            />
            <div className="flex justify-between text-[9px] font-mono text-forest-text/30">
              <span>-2°C</span>
              <span>Historical Mean</span>
              <span>+5°C</span>
            </div>
          </div>

          {/* Rainfall Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-forest-text/80">
                <CloudRain className="w-3.5 h-3.5 text-brand-blue" />
                <span>Precipitation Delta</span>
              </div>
              <span className={`font-semibold ${rainfallOffset > 0 ? 'text-brand-blue' : rainfallOffset < 0 ? 'text-brand-yellow' : 'text-forest-text/60'}`}>
                {rainfallOffset > 0 ? `+${rainfallOffset}` : rainfallOffset}%
              </span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              step="5"
              value={rainfallOffset}
              onChange={(e) => onRainfallChange(parseInt(e.target.value))}
              className="w-full h-1 bg-brand-green/10 rounded-lg appearance-none cursor-pointer accent-brand-green"
            />
            <div className="flex justify-between text-[9px] font-mono text-forest-text/30">
              <span>-50% deficit</span>
              <span>Normal</span>
              <span>+50% surplus</span>
            </div>
          </div>

          {/* Humidity Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5 text-forest-text/80">
                <Droplets className="w-3.5 h-3.5 text-brand-mint" />
                <span>Relative Humidity</span>
              </div>
              <span className={`font-semibold ${humidityOffset > 0 ? 'text-brand-mint' : humidityOffset < 0 ? 'text-forest-text/40' : 'text-forest-text/60'}`}>
                {humidityOffset > 0 ? `+${humidityOffset}` : humidityOffset}%
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="2"
              value={humidityOffset}
              onChange={(e) => onHumidityChange(parseInt(e.target.value))}
              className="w-full h-1 bg-brand-green/10 rounded-lg appearance-none cursor-pointer accent-brand-green"
            />
            <div className="flex justify-between text-[9px] font-mono text-forest-text/30">
              <span>-30%</span>
              <span>Norm</span>
              <span>+30%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
