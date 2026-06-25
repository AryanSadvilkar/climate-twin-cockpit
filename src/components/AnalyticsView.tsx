import { useState } from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  MapPin, 
  ShieldAlert, 
  Percent,
  CheckCircle2,
  Sun,
  Droplets,
  Activity,
  Award,
  Database,
  ChevronRight,
  CloudRain
} from "lucide-react";
import { SimulationParams } from "../types";
import { STATE_CLIMATE_DATA } from "./MapView";

// Normalizing helper to safely match state names from different dataset formats
const cleanName = (name: string) => {
  if (!name) return "";
  return name.replace(/\s+/g, "").toLowerCase()
             .replace("&", "and")
             .replace("and", "");
};

const isStateMatch = (stateA: string, stateB: string) => {
  return cleanName(stateA) === cleanName(stateB);
};

interface AnalyticsViewProps {
  simulation: SimulationParams;
}

export default function AnalyticsView({ simulation }: AnalyticsViewProps) {
  const [selectedStateName, setSelectedStateName] = useState("Maharashtra");

  // Get active selected state data, fallback to Maharashtra
  const activeState = STATE_CLIMATE_DATA.find(s => isStateMatch(s.state, selectedStateName)) || 
                      STATE_CLIMATE_DATA.find(s => isStateMatch(s.state, "Maharashtra")) || 
                      STATE_CLIMATE_DATA[0];

  // Seeded variation for temporal data
  const getDailyValue = (baseValue: number, stateName: string, dayIndex: number, range: [number, number], isTemp: boolean): number => {
    let hash = 0;
    for (let i = 0; i < stateName.length; i++) {
      hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Deterministic variation cycle
    const variance = Math.sin(hash + dayIndex * 24.5) * 0.12; 
    let output = baseValue * (1 + variance);
    
    // Apply offsets
    if (isTemp) {
      output += simulation.tempOffset;
    } else {
      output *= (simulation.rainIntensity / 100);
    }

    return Number(Math.max(range[0], Math.min(range[1], output)).toFixed(1));
  };

  // Generate 7-day forecast dataset
  const days = ["Today", "+1d", "+2d", "+3d", "+4d", "+5d", "+6d"];
  const forecastData = days.map((dayLabel, idx) => {
    const temp = getDailyValue(activeState.temp, activeState.state, idx, [5, 48], true);
    const rain = getDailyValue(activeState.rain / 4, activeState.state, idx, [0, 180], false); // Divide rainfall for daily values
    return {
      day: dayLabel,
      temp,
      rain,
      tempMin: Math.max(5, temp - 2.5),
      tempMax: Math.min(48, temp + 2.5),
      rainMin: Math.max(0, rain - 12),
      rainMax: rain + 12
    };
  });

  // Calculate bottom section's reactive indicators based on simulation offsets
  const tempSeverity = simulation.tempOffset;
  const rainSeverity = simulation.rainIntensity - 100;

  const heatStressScore = Math.max(0, Math.min(100, Math.round(55 + tempSeverity * 8)));
  const floodRiskScore = Math.max(0, Math.min(100, Math.round(42 + (rainSeverity / 100) * 35)));
  const droughtSeverity = Math.max(0, Math.min(100, Math.round(48 - (rainSeverity / 100) * 25)));
  const soilMoistureIndex = Math.max(0, Math.min(100, Math.round(68 - tempSeverity * 4 + (rainSeverity / 100) * 15)));

  const getRiskColor = (score: number, invert = false) => {
    let severe = score >= 75;
    let moderate = score >= 50;
    if (invert) {
      severe = score <= 25;
      moderate = score <= 50;
    }

    if (severe) return "text-accent-red bg-accent-red/10 border-accent-red/20";
    if (moderate) return "text-accent-orange bg-accent-orange/10 border-accent-orange/20";
    return "text-accent-green bg-accent-green/10 border-accent-green/20";
  };

  const getRiskLabel = (score: number, invert = false) => {
    let severe = score >= 75;
    let moderate = score >= 50;
    if (invert) {
      severe = score <= 25;
      moderate = score <= 50;
    }
    if (severe) return "CRITICAL STATE";
    if (moderate) return "MODERATE RISKS";
    return "OPTIMAL STATUS";
  };

  // SVG Chart sizing & scales
  const chartW = 600;
  const chartH = 250;
  const paddingX = 40;
  const paddingY = 30;

  // X projection helper
  const getX = (index: number) => {
    return paddingX + (index / (days.length - 1)) * (chartW - 2 * paddingX);
  };

  // Y projection helpers
  const tempRange = [10, 48];
  const rainRange = [0, 200];

  const getTempY = (val: number) => {
    const ratio = (val - tempRange[0]) / (tempRange[1] - tempRange[0]);
    return chartH - paddingY - ratio * (chartH - 2 * paddingY);
  };

  const getRainY = (val: number) => {
    const ratio = (val - rainRange[0]) / (rainRange[1] - rainRange[0]);
    return chartH - paddingY - ratio * (chartH - 2 * paddingY);
  };

  // Generate SVG path for Temp Line
  const tempPointsD = forecastData.map((d, i) => `${getX(i)},${getTempY(d.temp)}`).join(" L ");
  const tempLinePath = `M ${tempPointsD}`;

  // Generate SVG polygon string for Temp confidence band
  const tempUpperPoints = forecastData.map((d, i) => `${getX(i)},${getTempY(d.tempMax)}`);
  const tempLowerPoints = [...forecastData].reverse().map((d, i) => `${getX(6 - i)},${getTempY(d.tempMin)}`);
  const tempBandPath = `M ${tempUpperPoints.join(" L ")} L ${tempLowerPoints.join(" L ")} Z`;

  // Generate SVG path for Rain Line
  const rainPointsD = forecastData.map((d, i) => `${getX(i)},${getRainY(d.rain)}`).join(" L ");
  const rainLinePath = `M ${rainPointsD}`;

  // Generate SVG polygon string for Rain confidence band
  const rainUpperPoints = forecastData.map((d, i) => `${getX(i)},${getRainY(d.rainMax)}`);
  const rainLowerPoints = [...forecastData].reverse().map((d, i) => `${getX(6 - i)},${getRainY(d.rainMin)}`);
  const rainBandPath = `M ${rainUpperPoints.join(" L ")} L ${rainLowerPoints.join(" L ")} Z`;

  return (
    <div className="w-full h-full p-6 text-text-primary overflow-y-auto hide-scrollbar select-none bg-bg-void animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Header Telemetry Brief */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-default pb-4">
          <div>
            <h2 className="text-sm font-display font-black text-text-primary flex items-center gap-2 tracking-wide uppercase">
              <TrendingUp className="w-4.5 h-4.5 text-accent-cyan" />
              AI FORECAST ENSEBLES & REGIONAL REPORTING
            </h2>
            <p className="text-[10px] text-text-secondary mt-1 tracking-wide font-sans">
              Advanced ensemble predictions, downscaled GFS metrics, and temporal telemetry variables updated in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-accent-cyan bg-bg-surface border border-border-default px-2.5 py-1 rounded-xl font-bold">
              ACTIVE ENSEMBLE: GFS-382
            </span>
            <span className="text-[9px] font-mono text-accent-green bg-bg-surface border border-border-default px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              SIM MATRIX ON
            </span>
          </div>
        </div>

        {/* TOP ROW — 4 KPI CARDS (PROBLEM 4 SPECIFICATION) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-28 hover:border-border-bright/30 transition-all shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                All-India Rainfall Anomaly
              </span>
              <CloudRain className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-mono text-text-primary font-black">+12%</span>
              <span className="text-[8px] font-mono font-bold text-accent-cyan bg-bg-elevated border border-border-default rounded-full px-2 py-0.5">
                ABOVE NORMAL
              </span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-28 hover:border-border-bright/30 transition-all shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                Active Heat Alerts
              </span>
              <AlertTriangle className="w-4 h-4 text-accent-red animate-pulse" />
            </div>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-mono text-text-primary font-black">4 States</span>
              <span className="text-[8px] font-mono font-bold text-accent-red bg-bg-elevated border border-border-default rounded-full px-2 py-0.5">
                CRITICAL LIMIT
              </span>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-28 hover:border-border-bright/30 transition-all shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                Monsoon Coverage
              </span>
              <Percent className="w-4 h-4 text-accent-green" />
            </div>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-mono text-text-primary font-black">68% of India</span>
              <span className="text-[8px] font-mono font-bold text-accent-green bg-bg-elevated border border-border-default rounded-full px-2 py-0.5">
                PROGRESSING
              </span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-28 hover:border-border-bright/30 transition-all shadow-xl">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                Model Confidence
              </span>
              <CheckCircle2 className="w-4 h-4 text-accent-purple" />
            </div>
            <div className="flex justify-between items-end mt-2">
              <span className="text-xl font-mono text-text-primary font-black">91.4%</span>
              <span className="text-[8px] font-mono font-bold text-accent-purple bg-bg-elevated border border-border-default rounded-full px-2 py-0.5">
                HIGH TIER
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE SECTION — 2 COLUMNS (AI Forecast + Telemetry) */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* COL 1: AI FORECAST ENSEMBLE (60% width -> lg:col-span-3) */}
          <div className="lg:col-span-3 bg-bg-surface rounded-2xl border border-border-default p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-border-default">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-display font-black text-text-primary uppercase tracking-wider">
                  AI FORECAST ENSEMBLE (7-DAY MUNICIPAL)
                </span>
                <p className="text-[8.5px] text-text-secondary font-mono">Solid: Temp (°C) | Dashed: Daily Rain (mm) with ±1 std dev bands</p>
              </div>

              {/* State Selector Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-text-secondary font-bold uppercase tracking-wider">STATE:</span>
                <select
                  value={selectedStateName}
                  onChange={(e) => setSelectedStateName(e.target.value)}
                  className="state-selector text-[10px] uppercase font-mono font-black cursor-pointer shadow-sm outline-none focus:ring-1 focus:ring-accent-blue"
                >
                  {STATE_CLIMATE_DATA.map(s => (
                    <option key={s.state} value={s.state}>{s.state}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* SVG Forecast Graph Area */}
            <div className="relative flex-1 min-h-[260px] flex flex-col justify-between py-2">
              <svg className="w-full h-full min-h-[230px]" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                {/* Horizontal reference lines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
                  const y = paddingY + ratio * (chartH - 2 * paddingY);
                  return (
                    <g key={i}>
                    <line x1={paddingX} y1={y} x2={chartW - paddingX} y2={y} stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4 4" />
                    </g>
                  );
                })}

                {/* Shaded bands (Confidence ±1 std dev) */}
                <path d={tempBandPath} fill="rgba(59, 130, 246, 0.04)" />
                <path d={rainBandPath} fill="rgba(6, 182, 212, 0.06)" />

                {/* Shaded boundaries borders */}
                <path d={forecastData.map((d, i) => `${getX(i)},${getTempY(d.tempMax)}`).join(" L ")} fill="none" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1" strokeDasharray="2 2" />
                <path d={forecastData.map((d, i) => `${getX(i)},${getTempY(d.tempMin)}`).join(" L ")} fill="none" stroke="rgba(59, 130, 246, 0.08)" strokeWidth="1" strokeDasharray="2 2" />

                <path d={forecastData.map((d, i) => `${getX(i)},${getRainY(d.rainMax)}`).join(" L ")} fill="none" stroke="rgba(6, 182, 212, 0.12)" strokeWidth="1" strokeDasharray="2 2" />
                <path d={forecastData.map((d, i) => `${getX(i)},${getRainY(d.rainMin)}`).join(" L ")} fill="none" stroke="rgba(6, 182, 212, 0.12)" strokeWidth="1" strokeDasharray="2 2" />

                {/* Forecast Lines */}
                <path d={tempLinePath} fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round" />
                <path d={rainLinePath} fill="none" stroke="var(--accent-cyan)" strokeWidth="2.0" strokeDasharray="5 4" strokeLinecap="round" />

                {/* Points & markings */}
                {forecastData.map((d, i) => (
                  <g key={i}>
                    {/* Temp dots */}
                    <circle cx={getX(i)} cy={getTempY(d.temp)} r="3.5" fill="var(--accent-blue)" stroke="var(--bg-surface)" strokeWidth="1.5" />
                    {/* Rain dots */}
                    <circle cx={getX(i)} cy={getRainY(d.rain)} r="3" fill="var(--accent-cyan)" stroke="var(--bg-surface)" strokeWidth="1.2" />
                  </g>
                ))}

                {/* Y Left Axis labels (Temp) */}
                <text x={paddingX - 8} y={getTempY(45) + 3} fontSize="7.5px" fontFamily="monospace" fill="var(--accent-blue)" textAnchor="end">45°C</text>
                <text x={paddingX - 8} y={getTempY(30) + 3} fontSize="7.5px" fontFamily="monospace" fill="var(--accent-blue)" textAnchor="end">30°C</text>
                <text x={paddingX - 8} y={getTempY(15) + 3} fontSize="7.5px" fontFamily="monospace" fill="var(--accent-blue)" textAnchor="end">15°C</text>

                {/* Y Right Axis labels (Precipitation) */}
                <text x={chartW - paddingX + 8} y={getRainY(160) + 3} fontSize="7.5px" fontFamily="monospace" fill="var(--accent-cyan)" textAnchor="start">160mm</text>
                <text x={chartW - paddingX + 8} y={getRainY(100) + 3} fontSize="7.5px" fontFamily="monospace" fill="var(--accent-cyan)" textAnchor="start">100mm</text>
                <text x={chartW - paddingX + 8} y={getRainY(30) + 3} fontSize="7.5px" fontFamily="monospace" fill="var(--accent-cyan)" textAnchor="start">30mm</text>

                {/* X Axis Date Labels */}
                {days.map((day, i) => (
                  <text key={i} x={getX(i)} y={chartH - 8} fontSize="8px" fontFamily="monospace" fill="var(--text-secondary)" fontWeight="bold" textAnchor="middle">
                    {day.toUpperCase()}
                  </text>
                ))}
              </svg>

              {/* Dynamic Legend badge overlays */}
              <div className="flex justify-center gap-6 text-[9px] font-mono mt-3 text-text-secondary border-t border-border-default pt-3 uppercase">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 bg-accent-blue inline-block" />
                  <span>Temperature Scale (Left)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-0.5 border-t border-dashed border-accent-cyan inline-block" />
                  <span>Precipiting Scale (Right)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-2 bg-border-default inline-block rounded" />
                  <span>Std Variance Range</span>
                </div>
              </div>
            </div>
          </div>

          {/* COL 2: REGIONAL TELEMETRY (40% width -> lg:col-span-2) */}
          <div className="lg:col-span-2 bg-bg-surface rounded-2xl border border-border-default p-6 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-border-default pb-2.5">
              <span className="text-[10px] font-display font-black text-text-primary uppercase tracking-wider">
                REGIONAL TELEMETRY INDEX
              </span>
              <Database className="w-4 h-4 text-text-secondary" />
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[290px] pr-1 hide-scrollbar">
              {STATE_CLIMATE_DATA.slice(0, 10).map((s) => {
                const isSelected = isStateMatch(s.state, selectedStateName);
                const tempVal = Number((s.temp + (isSelected ? simulation.tempOffset : 0)).toFixed(1));
                const rainVal = Math.round(s.rain * (isSelected ? (simulation.rainIntensity / 100) : 1));

                return (
                  <button
                    key={s.state}
                    onClick={() => setSelectedStateName(s.state)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? "bg-bg-elevated/60 border-accent-blue/40 text-text-primary font-black shadow-lg" 
                        : "bg-bg-void/40 border-transparent text-text-secondary hover:bg-bg-elevated/40 hover:border-border-default"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-accent-blue" : "text-text-secondary"}`} />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold leading-tight">{s.state}</span>
                        <span className="text-[8px] font-mono text-text-muted mt-0.5">P: {s.pressure}hPa | W: {s.wind}kmh</span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-2 text-[9.5px] font-mono leading-none">
                      <div className="flex flex-col items-end">
                        <span className="text-accent-blue font-extrabold">{tempVal}°C</span>
                        <span className="text-accent-cyan text-[8.5px] mt-0.5">{rainVal}mm</span>
                      </div>
                      <ChevronRight className={`w-3 h-3 ${isSelected ? 'text-accent-blue' : 'text-text-muted'}`} />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-bg-void/60 p-3 rounded-xl border border-border-default text-[10px] font-mono space-y-1.5 text-text-secondary mt-2">
              <div className="flex justify-between">
                <span>Core Area Selected:</span>
                <span className="text-text-primary font-bold">{activeState.state}</span>
              </div>
              <div className="flex justify-between">
                <span>Dynamic Temperature:</span>
                <span className="text-accent-blue font-bold">{(activeState.temp + simulation.tempOffset).toFixed(1)}°C</span>
              </div>
              <div className="flex justify-between">
                <span>Modulated Precipitation:</span>
                <span className="text-accent-cyan font-bold">{Math.round(activeState.rain * (simulation.rainIntensity / 100))}mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION — ENVIRONMENTAL RISK MATRICES (PROBLEM 4 SPECIFICATION) */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3 bg-accent-blue rounded" />
            <span className="text-[10px] font-display font-black text-text-primary uppercase tracking-widest leading-none">
              Predictive Environmental Risk Matrices
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1 */}
            <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-32 border-t-4 border-t-accent-red hover:border-border-bright/35 transition-all shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                  Heat Stress Index
                </span>
                <Sun className="w-4 h-4 text-accent-red" />
              </div>
              <div>
                <p className="text-xl font-mono text-text-primary font-black tracking-tight">{heatStressScore}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(heatStressScore)}`}>
                  {getRiskLabel(heatStressScore)}
                </span>
              </div>
            </div>

            {/* CARD 2 */}
            <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-32 border-t-4 border-t-accent-blue hover:border-border-bright/35 transition-all shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                  Flood Risk Score
                </span>
                <Droplets className="w-4 h-4 text-accent-blue" />
              </div>
              <div>
                <p className="text-xl font-mono text-text-primary font-black tracking-tight">{floodRiskScore}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(floodRiskScore)}`}>
                  {getRiskLabel(floodRiskScore)}
                </span>
              </div>
            </div>

            {/* CARD 3 */}
            <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-32 border-t-4 border-t-accent-cyan hover:border-border-bright/35 transition-all shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                  Drought Severity
                </span>
                <Activity className="w-4 h-4 text-accent-cyan" />
              </div>
              <div>
                <p className="text-xl font-mono text-text-primary font-black tracking-tight">{droughtSeverity}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(droughtSeverity)}`}>
                  {getRiskLabel(droughtSeverity)}
                </span>
              </div>
            </div>

            {/* CARD 4 */}
            <div className="bg-bg-surface p-5 rounded-2xl border border-border-default flex flex-col justify-between h-32 border-t-4 border-t-accent-orange hover:border-border-bright/35 transition-all shadow-xl">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-display font-black text-text-secondary uppercase tracking-wider">
                  Soil Moisture Index
                </span>
                <Award className="w-4 h-4 text-accent-orange" />
              </div>
              <div>
                <p className="text-xl font-mono text-text-primary font-black tracking-tight">{soilMoistureIndex}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(soilMoistureIndex, true)}`}>
                  {getRiskLabel(soilMoistureIndex, true)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Hazard Protocol Warnings alert list */}
        <div className="p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-bg-surface border border-accent-red/20 border-l-4 border-l-accent-red shadow-xl">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-accent-red shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-sans font-black text-accent-red uppercase tracking-widest block leading-none">
                ACTIVE CLIMATE WARNING SYSTEMS DIAGNOSTICS DETECTED
              </span>
              <p className="text-[9.5px] text-text-secondary leading-relaxed font-bold mt-2 max-w-4xl font-mono uppercase">
                Simulated {simulation.tempOffset > 2 ? "Extreme Heat Stress Anomaly" : "Baseline Temperature Index"} and{" "}
                {simulation.rainIntensity > 130 ? "Supercharged Monsoon Flooding Accumulations" : "Inundation Stress Model Standard Tiers"} exceed absolute standard boundaries. Standard municipal drainage protocols require immediate verification inside coastal states.
              </p>
            </div>
          </div>

          <div className="text-[9px] font-mono text-accent-red bg-bg-elevated/80 border border-accent-red/25 px-3 py-1.5 rounded-xl font-black shrink-0 uppercase tracking-widest leading-none">
            IMD CLASS RED ALERTS
          </div>
        </div>

      </div>
    </div>
  );
}
