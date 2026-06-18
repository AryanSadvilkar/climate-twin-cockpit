import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, HelpCircle, Sparkles } from 'lucide-react';

interface AIInsightData {
  title: string;
  explanation: string;
  duration: string;
  riskLevel: string;
}

interface InsightsPanelProps {
  tempOffset: number;
  rainfallOffset: number;
  humidityOffset: number;
  selectedDistrict: string | null;
  selectedDistrictData: any;
  allDistrictsData: Record<string, any>;
  theme: 'light' | 'dark';
  aiInsight: AIInsightData;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  tempOffset,
  rainfallOffset,
  humidityOffset,
  selectedDistrict,
  selectedDistrictData,
  allDistrictsData,
  theme,
  aiInsight
}) => {
  // 1. Prepare Radar Chart Data (Thermodynamic Climate Stressors)
  const baseCrop = 45;
  const baseFlood = 35;
  const baseHeat = 40;
  const baseWater = 50;
  const baseSoil = 30;

  // Modulate based on offsets
  const cropStress = Math.min(100, Math.max(10, baseCrop + (tempOffset * 7) - (rainfallOffset * 0.5)));
  const floodRisk = Math.min(100, Math.max(10, baseFlood + (rainfallOffset * 0.9) + (tempOffset * 1.5)));
  const heatStress = Math.min(100, Math.max(10, baseHeat + (tempOffset * 9) - (humidityOffset * 0.2)));
  const waterStress = Math.min(100, Math.max(10, baseWater + (tempOffset * 5) - (rainfallOffset * 0.8)));
  const soilDegradation = Math.min(100, Math.max(10, baseSoil + (tempOffset * 4) - (humidityOffset * 0.3)));

  const radarData = [
    { subject: 'Crop Stress', value: cropStress, fullMark: 100 },
    { subject: 'Flood Risk', value: floodRisk, fullMark: 100 },
    { subject: 'Heat Stress', value: heatStress, fullMark: 100 },
    { subject: 'Water Stress', value: waterStress, fullMark: 100 },
    { subject: 'Soil Degrad.', value: soilDegradation, fullMark: 100 }
  ];

  // 2. Prepare Top 5 Districts by Vulnerability
  const getVulnerabilityScore = (_name: string, data: any) => {
    const crop = Math.min(100, Math.max(0, data.cropStress + (tempOffset * 5) - (rainfallOffset * 0.4)));
    const flood = Math.min(100, Math.max(0, data.floodRisk + (rainfallOffset * 0.8) + (tempOffset * 2)));
    const heat = Math.min(100, Math.max(0, data.heatVulnerability + (tempOffset * 8) - (humidityOffset * 0.2)));

    return Math.round((crop + flood + heat) / 3);
  };

  const topDistricts = Object.entries(allDistrictsData)
    .map(([name, data]) => ({
      name,
      score: getVulnerabilityScore(name, data)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const angleAxisStroke = theme === 'dark' ? 'rgba(240, 253, 244, 0.7)' : 'rgba(27, 38, 30, 0.7)';
  const gridStroke = theme === 'dark' ? 'rgba(34, 197, 94, 0.18)' : 'rgba(21, 128, 61, 0.12)';
  const radiusAxisStroke = theme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(21, 128, 61, 0.15)';
  const radarFillColor = theme === 'dark' ? '#22c55e' : '#10b981';
  const radarStrokeColor = theme === 'dark' ? '#22c55e' : '#15803d';

  return (
    <div className="glass-card p-5 flex flex-col justify-between min-h-full border border-brand-green/10">
      <div>
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-green" />
            <h2 className="font-display font-bold text-base text-forest-text tracking-wide">
              INSIGHTS & VULNERABILITY
            </h2>
          </div>
          <HelpCircle className="w-4 h-4 text-forest-text/30 cursor-pointer hover:text-forest-text/60" />
        </div>

        {/* Selected District Subpanel */}
        {selectedDistrict ? (
          <div className="bg-brand-green/5 border border-brand-green/20 rounded-xl p-4 mb-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-green to-brand-mint"></div>
            <h3 className="font-display font-bold text-xs text-forest-text uppercase tracking-wider">
              Focus: {selectedDistrict}
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mt-2 text-xs font-mono">
              <div>
                <span className="text-forest-text/50 block text-[10px]">Focus Alert:</span>
                <span className="text-forest-text font-bold block mt-0.5 uppercase tracking-wide truncate">
                  {selectedDistrictData.aiForecast}
                </span>
              </div>
              <div>
                <span className="text-forest-text/50 block text-[10px]">Hydrological Index:</span>
                <span className="text-brand-green font-bold block mt-0.5 text-glow-green">
                  {Math.min(100, Math.max(0, selectedDistrictData.waterAvailability + (rainfallOffset * 0.5) - (tempOffset * 3)))}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-4 mb-5 text-center text-xs text-forest-text/40 font-mono">
            Click on any district to inspect high-resolution telemetry.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
          {/* AI Climate Insight Card */}
          <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-mint to-brand-green"></div>
            <div className="flex items-center gap-2 text-brand-green">
              <Sparkles className="w-3.5 h-3.5" />
              <h3 className="font-display font-extrabold text-[10px] uppercase tracking-wider">
                AI Climate Insight
              </h3>
            </div>
            
            <p className="text-xs font-semibold text-forest-text/90 mt-1 font-sans">
              {aiInsight.title}
            </p>
            <p className="text-[11px] text-forest-text/60 leading-relaxed font-sans mt-0.5">
              {aiInsight.explanation}
            </p>
            
            <div className="flex items-center justify-between text-[10px] font-sans border-t border-brand-green/10 pt-2 mt-2">
              <div>
                <span className="text-forest-text/40 font-medium">PROJECTED DURATION: </span>
                <span className="text-forest-text font-bold">{aiInsight.duration}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-forest-text/40 font-medium">RISK LEVEL: </span>
                <span className={`font-extrabold text-[10px] uppercase px-1.5 py-0.5 rounded ${
                  aiInsight.riskLevel.toUpperCase() === 'HIGH' 
                    ? 'text-red-500 bg-red-500/10 animate-pulse' 
                    : aiInsight.riskLevel.toUpperCase() === 'MEDIUM' 
                      ? 'text-brand-yellow bg-brand-yellow/10' 
                      : 'text-brand-green bg-brand-green/10'
                }`}>
                  {aiInsight.riskLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Radar chart of variables */}
          <div className="flex flex-col items-center">
            <h4 className="font-mono text-[9px] text-forest-text/40 tracking-widest uppercase self-start mb-2.5">
              Stress Footprint
            </h4>
            <div className="w-full h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke={gridStroke} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    stroke={angleAxisStroke} 
                    fontSize={9}
                    tickLine={false}
                  />
                  <PolarRadiusAxis 
                    angle={30} 
                    domain={[0, 100]} 
                    stroke={radiusAxisStroke}
                    fontSize={8}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar 
                    name="Climate Twins" 
                    dataKey="value" 
                    stroke={radarStrokeColor} 
                    fill={radarFillColor} 
                    fillOpacity={0.2} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart of Top Vulnerable Districts */}
          <div>
            <h4 className="font-mono text-[9px] text-forest-text/40 tracking-widest uppercase mb-2.5">
              Highest Risk Districts
            </h4>
            <div className="w-full h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topDistricts}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke={angleAxisStroke} 
                    fontSize={9} 
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: theme === 'dark' ? 'rgba(11, 15, 12, 0.95)' : 'rgba(255, 255, 255, 0.95)', 
                      border: theme === 'dark' ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(21, 128, 61, 0.15)', 
                      borderRadius: '8px', 
                      fontSize: '11px',
                      fontFamily: 'sans-serif',
                      color: theme === 'dark' ? '#f0fdf4' : '#1b261e'
                    }}
                    cursor={{ fill: theme === 'dark' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(21, 128, 61, 0.03)' }}
                  />
                  <Bar 
                    dataKey="score" 
                    fill={radarStrokeColor} 
                    radius={[0, 4, 4, 0]}
                    barSize={10}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      
      {/* Telemetry metadata */}
      <div className="border-t border-brand-green/10 pt-3 mt-3 text-[9px] font-mono text-forest-text/30 flex justify-between">
        <span>MODEL RESOLUTION: 1.2KM GRID</span>
        <span>PROBABILITY: GAUSSIAN BIAS</span>
      </div>
    </div>
  );
};
