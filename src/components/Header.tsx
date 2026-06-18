import React from 'react';
import { Sun, Moon, Globe, Thermometer, CloudRain, Activity } from 'lucide-react';

interface HeaderProps {
  systemStatus?: string;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  tempOffset: number;
  rainfallOffset: number;
  timelineState: string;
  isCollapsed: boolean;
  aiConfidence: number;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus = 'OPERATIONAL',
  theme,
  onThemeToggle,
  tempOffset,
  rainfallOffset,
  timelineState,
  isCollapsed,
  aiConfidence
}) => {
  const baseTemp = 27.8;
  const currentTemp = (baseTemp + tempOffset).toFixed(1);
  
  const baseRainfall = 842;
  const currentRainfall = Math.max(0, baseRainfall * (1 + rainfallOffset / 100)).toFixed(0);
  
  // Dynamic alert status
  const getAlertStatus = () => {
    if (tempOffset >= 3) return { level: 'SEVERE', desc: 'Vidarbha Heatwave', color: 'text-red-500 bg-red-500/5 border-red-500/15' };
    if (rainfallOffset <= -30) return { level: 'CRITICAL', desc: 'Marathwada Drought', color: 'text-amber-600 bg-amber-600/5 border-amber-600/15' };
    if (rainfallOffset >= 30) return { level: 'WARNING', desc: 'Konkan Flood Threat', color: 'text-brand-blue bg-brand-blue/5 border-brand-blue/15' };
    return { level: 'NOMINAL', desc: 'Nominal Range', color: 'text-brand-green bg-brand-green/5 border-brand-green/15' };
  };

  const alert = getAlertStatus();

  return (
    <header className={`fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-7xl px-6 py-2.5 flex items-center justify-between z-50 rounded-full border border-brand-green/10 dark:border-brand-green/15 bg-white/40 dark:bg-black/35 backdrop-blur-xl shadow-md transition-all duration-500 ease-in-out ${
      isCollapsed ? 'top-[-100px] opacity-0 pointer-events-none' : 'top-4 opacity-100'
    }`}>
      <div className="flex items-center gap-3">
        {/* Spinning Globe Logo */}
        <div className="relative flex items-center justify-center h-10 w-10 bg-brand-green/10 rounded-xl border border-brand-green/20">
          <Globe className="w-5.5 h-5.5 text-brand-green animate-spin-slow" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-mint opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-mint"></span>
          </span>
        </div>
        
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-forest-text via-brand-green to-brand-mint m-0 leading-none">
            BHOOMI-TWIN
          </h1>
          <span className="text-[10px] text-forest-text/40 font-sans font-semibold tracking-widest uppercase mt-0.5 block">
            CLIMATE DIGITAL TWIN
          </span>
        </div>
      </div>

      {/* Relocated metrics inside header */}
      <div className="hidden md:flex items-center gap-6 font-mono text-xs text-forest-text/85">
        {/* Mean Temp Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-green/5 border border-brand-green/10">
          <Thermometer className="w-4 h-4 text-brand-yellow" />
          <span>MEAN TEMP: <strong className="text-forest-text font-bold">{currentTemp}°C</strong></span>
        </div>
        
        {/* Precipitation Badge */}
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-brand-green/5 border border-brand-green/10">
          <CloudRain className="w-4 h-4 text-brand-blue" />
          <span>PRECIPITATION: <strong className="text-forest-text font-bold">{currentRainfall} mm</strong></span>
        </div>

        {/* Climate Alert Badge */}
        <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border ${alert.color}`}>
          <Activity className="w-4 h-4" />
          <span>ALERTS: <strong className="font-bold">{alert.level} ({alert.desc})</strong></span>
        </div>

        {/* Timeline State Indicator Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-mint/10 dark:bg-brand-mint/20 text-brand-mint border border-brand-mint/20">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-mint animate-pulse"></span>
          <span className="text-[10px] tracking-wider uppercase font-bold">
            {timelineState === 'current' ? 'TODAY' : `+${timelineState.toUpperCase()}`}
          </span>
        </div>
      </div>

      {/* Right side live status & theme toggle */}
      <div className="flex items-center gap-6">
        <div className="text-right">
          {systemStatus.startsWith('FOCUSED:') ? (
            <div className="flex items-center gap-1.5 justify-end">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></span>
              <span className="text-[11px] font-sans text-forest-text/50 tracking-wider">{systemStatus}</span>
            </div>
          ) : (
            <div 
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[10px] font-sans font-bold tracking-wider transition-all cursor-help ${
                aiConfidence > 85 
                  ? 'text-brand-green bg-brand-green/5 border-brand-green/15' 
                  : 'text-brand-yellow bg-brand-yellow/5 border-brand-yellow/15'
              }`}
              title="Model confidence for current prediction set."
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${aiConfidence > 85 ? 'bg-brand-green' : 'bg-brand-yellow'}`}></span>
              <span>AI CONFIDENCE: {aiConfidence}%</span>
            </div>
          )}
        </div>

        <button
          onClick={onThemeToggle}
          className="p-2.5 rounded-xl bg-brand-green/5 hover:bg-brand-green/10 border border-brand-green/10 hover:border-brand-green/20 text-forest-text/70 hover:text-forest-text transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-brand-yellow" />
          ) : (
            <Moon className="w-4 h-4 text-brand-green" />
          )}
        </button>
      </div>
    </header>
  );
};
