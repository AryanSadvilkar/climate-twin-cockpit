import React from 'react';
import { Thermometer, CloudRain, Activity, Award } from 'lucide-react';

interface InsightCardsProps {
  tempOffset: number;
  rainfallOffset: number;
  humidityOffset: number;
  timelineState: string;
}

export const InsightCards: React.FC<InsightCardsProps> = ({
  tempOffset,
  rainfallOffset
}) => {
  const baseTemp = 27.8;
  const currentTemp = (baseTemp + tempOffset).toFixed(1);
  
  const baseRainfall = 842;
  const currentRainfall = Math.max(0, baseRainfall * (1 + rainfallOffset / 100)).toFixed(0);
  
  const baseConfidence = 94.8;
  const currentConfidence = (baseConfidence - (Math.abs(tempOffset) * 0.8) - (Math.abs(rainfallOffset) * 0.05)).toFixed(1);

  // Dynamic alert status matching bright green-beige-orange theme
  const getAlertStatus = () => {
    if (tempOffset >= 3) return { level: 'SEVERE', desc: 'Vidarbha Heatwave Active', color: 'text-red-500 border-red-500/20 bg-red-500/5' };
    if (rainfallOffset <= -30) return { level: 'CRITICAL', desc: 'Marathwada Drought Risk', color: 'text-amber-600 border-amber-600/20 bg-amber-600/5' };
    if (rainfallOffset >= 30) return { level: 'WARNING', desc: 'Konkan Flood Threat', color: 'text-brand-blue border-brand-blue/20 bg-brand-blue/5' };
    return { level: 'NOMINAL', desc: 'Nominal Climate Range', color: 'text-brand-green border-brand-green/20 bg-brand-green/5' };
  };

  const alert = getAlertStatus();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      {/* Card 1: Avg Temp */}
      <div className="glass-card p-3 flex items-center gap-3 border border-brand-green/10">
        <div className="p-2.5 rounded-xl bg-brand-yellow/10 border border-brand-yellow/20 text-brand-yellow shadow-sm">
          <Thermometer className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-forest-text/40 tracking-wider block">MEAN TEMP</span>
          <p className="font-mono text-base font-bold text-forest-text leading-none mt-1">
            {currentTemp}°C
          </p>
          <span className="text-[9px] font-mono text-forest-text/30 mt-0.5 block">
            {tempOffset > 0 ? `+${tempOffset}°C anomaly` : tempOffset < 0 ? `${tempOffset}°C cooling` : 'Baseline state'}
          </span>
        </div>
      </div>

      {/* Card 2: Rainfall Trend */}
      <div className="glass-card p-3 flex items-center gap-3 border border-brand-green/10">
        <div className="p-2.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue shadow-sm">
          <CloudRain className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-forest-text/40 tracking-wider block">PRECIPITATION</span>
          <p className="font-mono text-base font-bold text-forest-text leading-none mt-1">
            {currentRainfall} mm
          </p>
          <span className="text-[9px] font-mono text-forest-text/30 mt-0.5 block">
            {rainfallOffset > 0 ? `+${rainfallOffset}% anomaly` : rainfallOffset < 0 ? `${rainfallOffset}% deficit` : 'Seasonal mean'}
          </span>
        </div>
      </div>

      {/* Card 3: AI Engine Confidence */}
      <div className="glass-card p-3 flex items-center gap-3 border border-brand-green/10">
        <div className="p-2.5 rounded-xl bg-brand-green/10 border border-brand-green/20 text-brand-green shadow-sm">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-forest-text/40 tracking-wider block">AI CONFIDENCE</span>
          <p className="font-mono text-base font-bold text-forest-text leading-none mt-1">
            {currentConfidence}%
          </p>
          <span className="text-[9px] font-mono text-forest-text/30 mt-0.5 block">
            Resolution accuracy
          </span>
        </div>
      </div>

      {/* Card 4: Extreme Risk Flag */}
      <div className={`glass-card p-3 flex items-center gap-3 border border-brand-green/10 border-l-2 ${alert.level === 'SEVERE' ? 'border-l-red-500' : alert.level === 'CRITICAL' ? 'border-l-amber-500' : alert.level === 'WARNING' ? 'border-l-brand-blue' : 'border-l-brand-green'}`}>
        <div className={`p-2.5 rounded-xl ${alert.color}`}>
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-forest-text/40 tracking-wider block">CLIMATE ALERTS</span>
          <p className="font-mono text-[11px] font-bold text-forest-text leading-tight mt-1 truncate max-w-[140px]">
            {alert.desc}
          </p>
          <span className="text-[9px] font-mono text-forest-text/30 mt-0.5 block uppercase tracking-wider font-semibold">
            STATUS: {alert.level}
          </span>
        </div>
      </div>
    </div>
  );
};
