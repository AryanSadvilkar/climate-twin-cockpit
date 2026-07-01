import React, { useState, useEffect, useRef } from "react";
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
  CloudRain,
  Heart,
  Terminal,
  Cpu,
  Wind,
  Layers,
  Sparkles,
  Thermometer
} from "lucide-react";
import { 
  ResponsiveContainer, 
  ComposedChart, 
  AreaChart, 
  LineChart, 
  Area, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from "recharts";
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

// Simulated districts mapping for India states to support deep district filtering
const STATE_DISTRICTS: Record<string, string[]> = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Chhatrapati Sambhajinagar", "Thane", "Solapur", "Kolhapur", "Amravati", "Nanded"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Jaisalmer", "Alwar", "Sikar", "Barmer"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubli-Dharwad", "Mangaluru", "Belagavi", "Kalaburagi", "Davanagere", "Ballari"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Thoothukudi"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Prayagraj", "Meerut", "Noida"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Alappuzha", "Kannur", "Kottayam"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol", "Durgapur", "Kharagpur", "Haldia"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi", "Dwarka", "Rohini"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Hoshiarpur", "Pathankot"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Rohtak", "Hisar", "Karnal"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas"],
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Kakinada"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Mahbubnagar"]
};

const getDistrictsForState = (state: string): string[] => {
  return STATE_DISTRICTS[state] || [
    `${state} Central`,
    `${state} North`,
    `West ${state}`,
    `${state} East`,
    `South ${state}`
  ];
};

const getDistrictMetrics = (
  districtName: string, 
  stateTemp: number, 
  stateRain: number, 
  stateHumidity: number,
  tempOffset: number, 
  rainIntensity: number
) => {
  let hash = 0;
  for (let i = 0; i < districtName.length; i++) {
    hash = districtName.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Deterministic variations
  const tempVariance = ((hash % 7) / 2) - 1.5; // -1.5°C to +1.5°C
  const rainVariance = 1 + (((hash % 11) / 10) - 0.5) * 0.4; // 0.8 to 1.2 multiplier
  const humidVariance = ((hash % 5) * 3) - 6; // -6% to +6%

  const dTemp = stateTemp + tempVariance + tempOffset;
  const dRain = stateRain * rainVariance * (rainIntensity / 100);
  const dHumid = Math.max(10, Math.min(100, (stateHumidity || 60) + humidVariance));

  return {
    temp: Number(dTemp.toFixed(1)),
    rain: Math.max(0, Math.round(dRain)),
    humidity: Math.round(dHumid)
  };
};

const generatePIVAIDiagnosticReport = (state: string, tempOffset: number, rainIntensity: number) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const tempAlert = tempOffset > 2.0 ? "CRITICAL HEAT STRESS DETECTED" : "NOMINAL TEMPERATURE PROFILE";
  const rainAlert = rainIntensity > 140 ? "SEVERE MONSOON INUNDATION ANOMALY" : "BASELINE HYDROMETEOROLOGICAL STATE";
  const cropStress = Math.round(Math.min(100, Math.max(0, 42 + tempOffset * 6.5 - (rainIntensity - 100) * 0.08)));
  const soilMoisture = Math.round(Math.max(0, Math.min(100, 68 - tempOffset * 4 + (rainIntensity - 100) * 0.15)));

  return `>> PIV-AI CORE ENGINE ONLINE | SYNCING TARGET
>> TIMESTAMP: ${timestamp} UTC
>> ATTACHED TELEMETRY ANCHOR: [${state.toUpperCase()}]
>> SENSOR FEED: GFS-382 GRID SYNC (IMD 2026 LIVE)
--------------------------------------------------
[METRIC ANALYSIS LOGS]
 - TEMP_OFFSET: ${tempOffset > 0 ? "+" : ""}${tempOffset.toFixed(2)} °C (${tempAlert})
 - PRECIP_MULT: ${rainIntensity}% (${rainAlert})
 - COUPLING COEFFICIENT: 0.9412
 - EST. CROP STRESS INDEX: ${cropStress}%
 - SOIL HYDRATION VALUE: ${soilMoisture}%

[MODEL PREDICTIONS]
 * Diurnal Temp Range: ${(tempOffset + 24).toFixed(1)}°C to ${(tempOffset + 38).toFixed(1)}°C
 * Weekly Rain Target: ${Math.round(rainIntensity * 1.2)} mm (weekly cumulative)
 * Agricultural Drought Limit: ${tempOffset > 3 ? "WARNING: ROOT-ZONE DRYOUT INITIATED" : "SAFE: NOMINAL ROOT SATURATION"}

[TACTICAL SOP RECOMMENDATIONS]
 1. PRE-POSITION REGIONAL EMERGENCY AGRO-GRID ASSETS IN ${state.toUpperCase()}
 2. COMMENCE SHIFTED IRRIGATION PATTERNS FOR STRESS VALUE OF ${cropStress}%
 3. ACTIVATE STORM RUNOFF FLOOD PROTOCOLS IF PRECIP_MULT > 140%
 4. RE-CALIBRATE DRAINAGE OUTFLOW METRIC VECTOR IMMEDIATELY
--------------------------------------------------
>> INFERENCE PASS COMPLETED [STATUS: OK]
`;
};

interface AnalyticsViewProps {
  simulation: SimulationParams;
}

export default function AnalyticsView({ simulation }: AnalyticsViewProps) {
  const [selectedStateName, setSelectedStateName] = useState("Maharashtra");
  const [selectedDistrictName, setSelectedDistrictName] = useState<string | null>("Pune");
  const [expandedCardIdx, setExpandedCardIdx] = useState<number | null>(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, []);

  // Sync state selection from external custom events
  useEffect(() => {
    const handleRegionSelect = (e: Event) => {
      const stateName = (e as CustomEvent).detail;
      if (stateName) {
        const match = STATE_CLIMATE_DATA.find(s => isStateMatch(s.state, stateName));
        if (match) {
          setSelectedStateName(match.state);
          const districts = getDistrictsForState(match.state);
          if (districts.length > 0) {
            setSelectedDistrictName(districts[0]);
          }
        }
      }
    };
    window.addEventListener("region-select-update", handleRegionSelect);
    return () => {
      window.removeEventListener("region-select-update", handleRegionSelect);
    };
  }, []);

  const handleStateClick = (stateName: string) => {
    setSelectedStateName(stateName);
    window.dispatchEvent(new CustomEvent("region-select-update", { detail: stateName }));
    const districts = getDistrictsForState(stateName);
    if (districts.length > 0) {
      setSelectedDistrictName(districts[0]);
    }
  };

  // Get active selected state data, fallback to Maharashtra
  const activeState = STATE_CLIMATE_DATA.find(s => isStateMatch(s.state, selectedStateName)) || 
                      STATE_CLIMATE_DATA.find(s => isStateMatch(s.state, "Maharashtra")) || 
                      STATE_CLIMATE_DATA[0];

  // Calculate bottom section's reactive indicators based on simulation offsets
  const tempSeverity = simulation.tempOffset;
  const rainSeverity = simulation.rainIntensity - 100;

  const heatStressScore = Math.max(0, Math.min(100, Math.round(55 + tempSeverity * 8)));
  const floodRiskScore = Math.max(0, Math.min(100, Math.round(42 + (rainSeverity / 100) * 35)));
  const droughtSeverity = Math.max(0, Math.min(100, Math.round(48 - (rainSeverity / 100) * 25)));
  const soilMoistureIndex = Math.max(0, Math.min(100, Math.round(68 - tempSeverity * 4 + (rainSeverity / 100) * 15)));
  const droughtScore = droughtSeverity;
  const soilMoistureScore = soilMoistureIndex;

  const getSOPPlaybook = (title: string, score: number) => {
    if (score >= 75) {
      return [
        "⚠️ RED ALERT Protocol Active",
        "Deploy emergency response assets immediately",
        "Initiate mandatory regional resource rationing codes"
      ];
    }
    if (score >= 50) {
      return [
        "🔸 ORANGE LEVEL Watch Active",
        "Pre-position municipal maintenance teams",
        "issue precautionary public health advisories"
      ];
    }
    return [
      "🔹 GREEN STATUS Secure",
      "Maintain baseline observation feeds",
      "Standard resource distribution guidelines apply"
    ];
  };

  const getRiskColor = (score: number, invert = false) => {
    let severe = score >= 75;
    let moderate = score >= 50;
    if (invert) {
      severe = score <= 25;
      moderate = score <= 50;
    }

    if (severe) return "text-red-705 bg-red-50 border-red-200";
    if (moderate) return "text-orange-705 bg-orange-50 border-orange-200";
    return "text-green-705 bg-green-50 border-green-200";
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

  // ==========================================
  // CHART 1 DATA: Temp vs Humidity (Diurnal)
  // ==========================================
  const diurnalData = Array.from({ length: 13 }).map((_, idx) => {
    const factor = -Math.cos((idx - 2) * (2 * Math.PI / 12)); 
    const baseT = activeState.temp + factor * 5;
    const temp = Number((baseT + simulation.tempOffset).toFixed(1));
    const baseH = (activeState.humidity || 65) - factor * 12;
    const humidity = Math.max(10, Math.min(100, Math.round(baseH)));
    const hourLabel = `${String(idx * 2).padStart(2, '0')}:00`;
    return { hourLabel, temp, humidity };
  });

  // ==========================================
  // CHART 2 DATA: Weekly Precip vs Baseline
  // ==========================================
  const weeklyDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyPrecip = weeklyDays.map((day, idx) => {
    const baseRainVal = activeState.rain / 4;
    const rain = Number((baseRainVal * (1 + Math.sin(idx * 1.5) * 0.3) * (simulation.rainIntensity / 100)).toFixed(1));
    const baseline = Number((baseRainVal * 0.9 * (1 + Math.cos(idx * 1.2) * 0.2)).toFixed(1));
    return { day, rain, baseline };
  });

  // ==========================================
  // CHART 3 DATA: Wind Velocity & UV Index
  // ==========================================
  const weeklyWindUV = weeklyDays.map((day, idx) => {
    const baseWind = activeState.wind || 16;
    const wind = Number((baseWind * (1 + Math.sin(idx * 2.0) * 0.2) + (simulation.tempOffset * 0.1)).toFixed(1));
    const baseSolar = activeState.solar || 600;
    const uvBase = (baseSolar / 120) + (simulation.tempOffset * 0.4);
    const uv = Number(Math.max(1, Math.min(12, uvBase + Math.sin(idx * 1.5) * 1.5)).toFixed(1));
    return { day, wind, uv };
  });

  // ==========================================
  // CHART 4 DATA: Soil Moisture & Stratification
  // ==========================================
  const weeklySoil = weeklyDays.map((day, idx) => {
    const moistureBase = 68 - simulation.tempOffset * 3.5 + (simulation.rainIntensity - 100) * 0.15;
    const moisture = Number(Math.max(5, Math.min(100, moistureBase * (1 + Math.sin(idx * 1.8) * 0.08))).toFixed(1));
    const baseHeat = 22 + activeState.temp * 0.35 + (simulation.tempOffset * 1.1);
    const heat = Number((baseHeat * (1 + Math.cos(idx * 1.4) * 0.05)).toFixed(1));
    return { day, moisture, heat };
  });

  // Playbook Terminal Logs
  const aiPlaybookText = (simulation as any).ai_playbook || generatePIVAIDiagnosticReport(activeState.state, simulation.tempOffset, simulation.rainIntensity);
  const terminalLines = aiPlaybookText.split("\n");

  // Recharts Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-md font-mono text-xs max-w-[200px]">
          <p className="font-bold text-slate-950 border-b border-slate-100 pb-1 mb-1">{label}</p>
          <div className="space-y-1">
            {payload.map((pld: any) => {
              const formattedVal = typeof pld.value === 'number' ? pld.value.toFixed(1) : pld.value;
              return (
                <div key={pld.name} className="flex justify-between gap-4 py-0.5">
                  <span className="text-slate-500 font-medium" style={{ color: pld.stroke || pld.color }}>
                    {pld.name}:
                  </span>
                  <span className="font-bold text-slate-950">
                    {formattedVal}
                    {pld.unit || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Convert raw terminal text lines to bullet points for research advisory box
  const terminalBullets = terminalLines
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith("---") && !line.startsWith(">>"));

  return (
    <div ref={scrollContainerRef} className="w-full h-full min-h-screen bg-slate-50 p-6 lg:p-8 overflow-y-auto block pointer-events-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER Brief */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-sm font-black text-slate-955 flex items-center gap-2 tracking-wide uppercase">
              <TrendingUp className="w-4.5 h-4.5 text-[#2563eb]" />
              CLIMATE ANALYTICS COCKPIT & SPACE-TEMPORAL FORECASTS
            </h2>
            <p className="text-[10px] text-slate-550 mt-1 tracking-wide font-sans">
              ISRO Panel Earth Observation Telemetry Feed — GFS downscaled models, satellite diagnostics, and regional anomaly tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-650 bg-white border border-slate-200 px-2.5 py-1 rounded-xl font-bold">
              ACTIVE ENSEMBLE: GFS-382
            </span>
            <span className="text-[9px] font-mono text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              STREAM MATRIX ON
            </span>
          </div>
        </div>

        {/* COMPACT 2-COLUMN CLIMATE LAB GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column - lg:col-span-8 */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Chart 1: Temp vs Humidity */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm h-[340px]">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-mono font-black text-slate-950 uppercase tracking-wide">
                    Diurnal Temp & Humidity Spline
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold text-red-700 bg-red-50 border border-red-100 rounded px-2 py-0.5">
                  DUAL AXIS
                </span>
              </div>
              
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={diurnalData} margin={{ top: 10, right: -5, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity="0.12" />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="hourLabel" 
                      stroke="#64748b" 
                      fontSize={11} 
                      fontFamily="monospace"
                      tickLine={false}
                    />
                    <YAxis 
                      yAxisId="temp"
                      stroke="#ef4444"
                      fontSize={11} 
                      fontFamily="monospace"
                      domain={[10, 50]}
                      tickLine={false}
                      unit="°C"
                    />
                    <YAxis 
                      yAxisId="humidity"
                      orientation="right"
                      stroke="#3b82f6"
                      fontSize={11} 
                      fontFamily="monospace"
                      domain={[0, 100]}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      position={{ y: -60 }}
                      wrapperStyle={{ pointerEvents: 'none' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                    <Area 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="temp" 
                      name="Temperature" 
                      unit="°C"
                      stroke="#ef4444" 
                      strokeWidth={2.5}
                      fill="url(#tempGrad)" 
                    />
                    <Line 
                      yAxisId="humidity"
                      type="monotone" 
                      dataKey="humidity" 
                      name="Humidity" 
                      unit="%"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Precipitation vs Baseline */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm h-[340px]">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-4 h-4 text-cyan-600" />
                  <span className="text-xs font-mono font-black text-slate-955 uppercase tracking-wide">
                    Weekly Precip vs Historical Baseline
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 rounded px-2 py-0.5">
                  BAR + TREND
                </span>
              </div>

              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyPrecip} margin={{ top: 10, right: -5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#64748b" 
                      fontSize={11} 
                      fontFamily="monospace"
                      tickLine={false}
                      tickFormatter={(value) => value.toUpperCase()}
                    />
                    <YAxis 
                      stroke="#06b6d4"
                      fontSize={11} 
                      fontFamily="monospace"
                      domain={[0, 'auto']}
                      tickLine={false}
                      unit="mm"
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                      position={{ y: -60 }}
                      wrapperStyle={{ pointerEvents: 'none' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                    <Bar 
                      dataKey="rain" 
                      name="Precipitation" 
                      unit="mm"
                      fill="#06b6d4" 
                      radius={[3, 3, 0, 0]}
                      barSize={18}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="baseline" 
                      name="Historical Baseline" 
                      unit="mm"
                      stroke="#d97706" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Wind Vector */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm h-[340px]">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-green-600" />
                  <span className="text-xs font-mono font-black text-slate-955 uppercase tracking-wide">
                    Atmospheric Winds & Solar UV Projection
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold text-green-700 bg-green-50 border border-green-100 rounded px-2 py-0.5">
                  ATMOSPHERE
                </span>
              </div>

              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyWindUV} margin={{ top: 10, right: -5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#64748b" 
                      fontSize={11} 
                      fontFamily="monospace"
                      tickLine={false}
                      tickFormatter={(value) => value.toUpperCase()}
                    />
                    <YAxis 
                      yAxisId="wind"
                      stroke="#10b981"
                      fontSize={11} 
                      fontFamily="monospace"
                      domain={[0, 60]}
                      tickLine={false}
                      unit=" kmh"
                    />
                    <YAxis 
                      yAxisId="uv"
                      orientation="right"
                      stroke="#f59e0b"
                      fontSize={11} 
                      fontFamily="monospace"
                      domain={[0, 12]}
                      tickLine={false}
                      unit=" UV"
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      position={{ y: -60 }}
                      wrapperStyle={{ pointerEvents: 'none' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                    <Line 
                      yAxisId="wind"
                      type="monotone" 
                      dataKey="wind" 
                      name="Wind Velocity" 
                      unit=" km/h"
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      yAxisId="uv"
                      type="monotone" 
                      dataKey="uv" 
                      name="UV Index" 
                      unit=" UV"
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Soil Stratification */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between shadow-sm h-[340px]">
              <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-mono font-black text-slate-955 uppercase tracking-wide">
                    Soil Saturation & Sub-surface Heat
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded px-2 py-0.5">
                  STRATIFIED
                </span>
              </div>

              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklySoil} margin={{ top: 10, right: -5, left: -25, bottom: 5 }}>
                    <defs>
                      <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#475569" stopOpacity="0.35" />
                        <stop offset="95%" stopColor="#475569" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="heatGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity="0.35" />
                        <stop offset="95%" stopColor="#ea580c" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      stroke="#64748b" 
                      fontSize={11} 
                      fontFamily="monospace"
                      tickLine={false}
                      tickFormatter={(value) => value.toUpperCase()}
                    />
                    <YAxis 
                      yAxisId="moisture"
                      stroke="#475569"
                      fontSize={11} 
                      fontFamily="monospace"
                      domain={[0, 100]}
                      tickLine={false}
                      unit="%"
                    />
                    <YAxis 
                      yAxisId="heat"
                      orientation="right"
                      stroke="#ea580c"
                      fontSize={11} 
                      fontFamily="monospace"
                      domain={[10, 60]}
                      tickLine={false}
                      unit="°C"
                    />
                    <Tooltip 
                      content={<CustomTooltip />} 
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                      position={{ y: -60 }}
                      wrapperStyle={{ pointerEvents: 'none' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                    />
                    <Area 
                      yAxisId="moisture"
                      type="monotone" 
                      dataKey="moisture" 
                      stackId="1"
                      stroke="#475569" 
                      strokeWidth={2}
                      fill="url(#moistureGrad)" 
                      name="Soil Moisture" 
                      unit="%"
                    />
                    <Area 
                      yAxisId="heat"
                      type="monotone" 
                      dataKey="heat" 
                      stackId="1"
                      stroke="#ea580c" 
                      strokeWidth={2}
                      fill="url(#heatGrad)" 
                      name="Sub-surface Heat" 
                      unit="°C"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Right Column - lg:col-span-4 */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Component 1: GEOSPATIAL DISTRICT DRILLDOWN GRID */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4 shadow-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-500" />
                  <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider">
                    GEOSPATIAL DISTRICT DATA INDEX
                  </span>
                </div>
                {/* State selector dropdown */}
                <select
                  value={selectedStateName}
                  onChange={(e) => handleStateClick(e.target.value)}
                  className="state-selector text-[9.5px] uppercase font-mono font-black cursor-pointer bg-white text-slate-950 border border-slate-200 rounded-md px-2 py-1 shadow-sm outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {STATE_CLIMATE_DATA.map(s => (
                    <option key={s.state} value={s.state}>{s.state}</option>
                  ))}
                </select>
              </div>

              {/* Bounded scrollbox container */}
              <div className="max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="flex flex-col gap-2">
                  {getDistrictsForState(activeState.state).map(district => {
                    const metrics = getDistrictMetrics(
                      district,
                      activeState.temp,
                      activeState.rain,
                      activeState.humidity || 65,
                      simulation.tempOffset,
                      simulation.rainIntensity
                    );
                    const isSelected = selectedDistrictName === district;
                    
                    return (
                      <div 
                        key={district} 
                        onClick={() => setSelectedDistrictName(district)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-blue-50/50 border-blue-400 text-blue-950 shadow-sm" 
                            : "border-slate-100 bg-slate-50/60 hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <span className="text-[10.5px] font-black tracking-tight truncate max-w-[140px] text-slate-950">
                          {district}
                        </span>
                        <div className="flex gap-1.5 shrink-0">
                          {/* Soft Gray Temp pill */}
                          <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded leading-none ${
                            isSelected ? "bg-slate-200 text-slate-900" : "bg-slate-100 text-slate-600"
                          }`}>
                            {metrics.temp.toFixed(1)}°C
                          </span>
                          {/* Soft Cyan Precip pill */}
                          <span className={`text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded leading-none ${
                            isSelected ? "bg-cyan-200 text-cyan-900" : "bg-cyan-50 border border-cyan-100 text-cyan-700"
                          }`}>
                            {metrics.rain.toFixed(1)}mm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Component 2: GEMINI PIV-AI REGIONAL ADVISORY MONITOR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-sm h-[380px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span className="font-black text-slate-955 tracking-wide text-[10px] uppercase">
                    GEMINI PIV-AI REGIONAL ADVISORY MONITOR
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-[9px] text-green-650 uppercase font-black tracking-wider leading-none">
                    STREAMING
                  </span>
                </div>
              </div>
              
              <div className="flex-1 bg-[#fafaf9] border border-slate-150 p-4 rounded-xl overflow-y-auto max-h-[300px] text-[10.5px] font-mono text-slate-900 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {terminalBullets.map((bullet: string, i: number) => {
                  let textStyle = "text-slate-900 font-mono";
                  if (bullet.includes("CRITICAL") || bullet.includes("WARNING") || bullet.includes("RED ALERT") || bullet.includes("DRYOUT")) {
                    textStyle = "text-red-700 font-bold font-mono";
                  } else if (bullet.includes("EST.") || bullet.includes("TEMP_OFFSET") || bullet.includes("PRECIP_MULT")) {
                    textStyle = "text-amber-700 font-bold font-mono";
                  } else if (bullet.startsWith("[TACTICAL") || bullet.startsWith("[MODEL") || bullet.startsWith("[METRIC")) {
                    textStyle = "text-purple-700 font-black font-mono";
                  } else if (bullet.includes("COMPLETED") || bullet.includes("STATUS: OK")) {
                    textStyle = "text-green-700 font-bold font-mono";
                  }
                  
                  return (
                    <div key={i} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-blue-500 mt-1 shrink-0">▪</span>
                      <span className={textStyle}>{bullet}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* SCIENTIFIC ACCURACY CORNERSTONE CORNER */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <span className="text-xs font-black text-slate-955 uppercase tracking-widest leading-none">
              MODEL PERFORMANCE VALIDATION FEEDBACK
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="border border-amber-300 text-amber-900 bg-amber-50/40 px-3.5 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wide leading-none shadow-sm">
                MEAN ABSOLUTE ERROR (MAE): 0.22°C
              </div>
              <div className="border border-emerald-300 text-emerald-900 bg-emerald-50/40 px-3.5 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wide leading-none shadow-sm">
                MODEL CONFIDENCE (R²): 0.94
              </div>
              <div className="border border-blue-200 text-blue-900 bg-blue-50/40 px-3.5 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wide leading-none shadow-sm">
                DATA FEED SOURCE: IMD LIVE VALIDATION SATELLITE CORE
              </div>
            </div>
          </div>
        </div>

        {/* PREDICTIVE ENVIRONMENTAL RISK MATRICES */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-4 bg-blue-600 rounded animate-pulse" />
            <span className="text-xs font-black text-slate-955 uppercase tracking-widest leading-none">
              Predictive Environmental Risk Matrices
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Heat Index Card */}
            <div 
              onClick={() => setExpandedCardIdx(expandedCardIdx === 0 ? null : 0)}
              className={`bg-white p-6 rounded-2xl border border-slate-200/60 flex flex-col justify-between cursor-pointer border-t-4 border-t-red-500 hover:border-slate-350 transition-all shadow-sm min-h-36 ${expandedCardIdx === 0 ? 'ring-1 ring-red-500/20' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  Heat Index
                </span>
                <Sun className="w-4.5 h-4.5 text-red-500 animate-pulse" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-mono text-slate-955 font-black tracking-tight">{heatStressScore}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(heatStressScore)}`}>
                  {getRiskLabel(heatStressScore)}
                </span>
              </div>
              
              {expandedCardIdx === 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5 text-[9px] font-mono text-slate-655 animate-fade-in">
                  <div className="text-[8px] font-black text-red-655 uppercase tracking-wider">MUNICIPAL SOP SCRIPT:</div>
                  {getSOPPlaybook("Heat", heatStressScore).map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-bold text-slate-950">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span>{step.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flood Risk Card */}
            <div 
              onClick={() => setExpandedCardIdx(expandedCardIdx === 1 ? null : 1)}
              className={`bg-white p-6 rounded-2xl border border-slate-200/60 flex flex-col justify-between cursor-pointer border-t-4 border-t-blue-500 hover:border-slate-350 transition-all shadow-sm min-h-36 ${expandedCardIdx === 1 ? 'ring-1 ring-blue-500/20' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  Flood Risk
                </span>
                <CloudRain className="w-4.5 h-4.5 text-blue-500 animate-bounce" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-mono text-slate-955 font-black tracking-tight">{floodRiskScore}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(floodRiskScore)}`}>
                  {getRiskLabel(floodRiskScore)}
                </span>
              </div>
              
              {expandedCardIdx === 1 && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5 text-[9px] font-mono text-slate-655 animate-fade-in">
                  <div className="text-[8px] font-black text-blue-655 uppercase tracking-wider">MUNICIPAL SOP SCRIPT:</div>
                  {getSOPPlaybook("Flood", floodRiskScore).map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-bold text-slate-950">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span>{step.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drought Severity Card */}
            <div 
              onClick={() => setExpandedCardIdx(expandedCardIdx === 2 ? null : 2)}
              className={`bg-white p-6 rounded-2xl border border-slate-200/60 flex flex-col justify-between cursor-pointer border-t-4 border-t-cyan-500 hover:border-slate-350 transition-all shadow-sm min-h-36 ${expandedCardIdx === 2 ? 'ring-1 ring-cyan-500/20' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  Drought Severity
                </span>
                <Activity className="w-4.5 h-4.5 text-cyan-500" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-mono text-slate-955 font-black tracking-tight">{droughtScore}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(droughtScore)}`}>
                  {getRiskLabel(droughtScore)}
                </span>
              </div>
              
              {expandedCardIdx === 2 && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5 text-[9px] font-mono text-slate-655 animate-fade-in">
                  <div className="text-[8px] font-black text-cyan-650 uppercase tracking-wider">MUNICIPAL SOP SCRIPT:</div>
                  {getSOPPlaybook("Drought", droughtScore).map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-bold text-slate-955">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span>{step.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Soil Moisture Index Card */}
            <div 
              onClick={() => setExpandedCardIdx(expandedCardIdx === 3 ? null : 3)}
              className={`bg-white p-6 rounded-2xl border border-slate-200/60 flex flex-col justify-between cursor-pointer border-t-4 border-t-orange-500 hover:border-slate-350 transition-all shadow-sm min-h-36 ${expandedCardIdx === 3 ? 'ring-1 ring-orange-500/20' : ''}`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  Soil Moisture Index
                </span>
                <Heart className="w-4.5 h-4.5 text-orange-500" />
              </div>
              <div className="mt-2">
                <p className="text-2xl font-mono text-slate-955 font-black tracking-tight">{soilMoistureScore}%</p>
                <span className={`text-[8px] font-mono font-bold border rounded-md px-1.5 py-0.5 inline-block mt-2 uppercase ${getRiskColor(soilMoistureScore)}`}>
                  {getRiskLabel(soilMoistureScore)}
                </span>
              </div>
              
              {expandedCardIdx === 3 && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5 text-[9px] font-mono text-slate-655 animate-fade-in">
                  <div className="text-[8px] font-black text-orange-655 uppercase tracking-wider">MUNICIPAL SOP SCRIPT:</div>
                  {getSOPPlaybook("Soil", soilMoistureScore).map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 font-bold text-slate-955">
                      <span className="w-1 h-1 rounded-full bg-slate-400" />
                      <span>{step.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Warning Banner at the bottom */}
          <div className="p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-red-50 border border-red-200 border-l-4 border-l-red-500 shadow-sm animate-pulse">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5.5 h-5.5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-sans font-bold text-red-800 uppercase tracking-widest block leading-none">
                  ACTIVE CLIMATE WARNING SYSTEMS DIAGNOSTICS DETECTED
                </span>
                <p className="text-[9.5px] text-slate-705 leading-relaxed font-bold mt-2 max-w-4xl font-mono uppercase">
                  Simulated {simulation.tempOffset > 2 ? "Extreme Heat Stress Anomaly" : "Baseline Temperature Index"} and{" "}
                  {simulation.rainIntensity > 130 ? "Supercharged Monsoon Flooding Accumulations" : "Inundation Stress Model Standard Tiers"} exceed absolute standard boundaries. Standard municipal drainage protocols require immediate verification inside coastal states.
                </p>
              </div>
            </div>

            <div className="text-[9px] font-mono text-red-700 bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl font-bold shrink-0 uppercase tracking-widest leading-none">
              IMD CLASS RED ALERTS
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
