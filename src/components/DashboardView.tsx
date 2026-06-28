import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Thermometer,
  CloudRain,
  Wind,
  Gauge,
  Play,
  Pause,
  RefreshCw,
  Search,
  MapPin,
  X,
  Droplet,
  Sun,
  Cloud,
  ChevronDown,
  ChevronUp,
  Settings,
  Activity,
  Heart,
  Radar
} from "lucide-react";
import { SimulationParams, WeatherLayer } from "../types";
import { CITIES_INDEX } from "../data";
import MapView from "./MapView";
import { useTelemetry } from "../context/TelemetryContext";

const calculateDroughtIndex = (temp: number, rain: number, tempOffset: number) => {
  console.log("AI-TWIN: Simulating climate anomaly using live telemetry ingress...");
  let base = (temp * 0.15) - (rain * 0.05);
  if (tempOffset > 2.0) {
    base *= (1.0 + (tempOffset - 2.0) * 0.5);
  }
  return Math.max(0.0, Math.min(1.0, base));
};

const getLiveMosdacMetric = (layer: string, offset: number, rain: number = 100) => {
  const baseMetrics: Record<string, { label: string; val: string; status: string }> = {
    temp: { label: "INSAT-3DR LST", val: `${(27.8 + offset).toFixed(1)}°C`, status: "THERMAL IMAGER ENERGETIC" },
    precip: { label: "INSAT-3D RHEM", val: `${Math.round(842 * (1 + offset * 0.05))}mm`, status: "HYDRO-RETRIEVAL CONCURRENT" },
    wind: { label: "MOSDAC SCATSAT", val: `${Math.round(24 + offset * 2)} km/h`, status: "CYCLONIC CYCLES TRACKED" },
    pressure: { label: "MET-GRID SYNOP", val: `${Math.round(1008 - offset * 1.5)} hPa`, status: "BAROMETRIC ANOMALY DETECTED" },
    humidity: { label: "SATELLITE VWC", val: `${Math.max(10, Math.min(100, Math.round(72 + offset * 3)))}%`, status: "SUBSURFACE MOISTURE GRADIENT" },
    drought: { 
      label: "NDVI STRESS", 
      val: `${calculateDroughtIndex(31.84 + offset, rain, offset).toFixed(3)} idx`, 
      status: "AGRONOMIC SCARCITY RADIAL" 
    },
    cloud: { label: "INSAT OLR", val: `${Math.max(0, Math.min(100, Math.round(65 + offset * 4)))}%`, status: "ALBEDO REFLECTANCE READ" }
  };
  return baseMetrics[layer] || { label: "MOSDAC FEED", val: "TRACKING", status: "NOMINAL MATRIX SYSTEM" };
};

// Map configurations for atmospheric layers
interface LayerItem {
  id: string;
  name: string;
  icon: any;
  unit: string;
}

const LAYERS_LIST: LayerItem[] = [
  { id: "temp", name: "Temperature", icon: Thermometer, unit: "°C" },
  { id: "precip", name: "Precipitation", icon: CloudRain, unit: "mm" },
  { id: "wind", name: "Wind Speed", icon: Wind, unit: "km/h" },
  { id: "pressure", name: "Pressure", icon: Gauge, unit: "hPa" },
  { id: "humidity", name: "Humidity", icon: Droplet, unit: "%" },
  { id: "drought", name: "Drought Index", icon: Sun, unit: "—" },
  { id: "cloud", name: "Cloud Cover", icon: Cloud, unit: "%" }
];

const TIMELINE_STEPS = ["Today", "+24h", "+72h", "+7d"];

interface DashboardViewProps {
  activeLayer: WeatherLayer;
  setActiveLayer: (layer: WeatherLayer) => void;
  simulation: SimulationParams;
  setSimulation: (sim: SimulationParams) => void;
  isPresentationMode?: boolean;
}

export type MapLevel = 'india' | 'state' | 'district';

export default function DashboardView({
  activeLayer,
  setActiveLayer,
  simulation,
  setSimulation,
  isPresentationMode = false
}: DashboardViewProps) {
  const mapRef = useRef<any>(null);
  const { activeTelemetry } = useTelemetry();

  const getCurrentTelemetryVal = (telemetry: any, layer: string) => {
    if (!telemetry) return null;
    if (layer === 'temp' && telemetry.current_weather) {
      return `${telemetry.current_weather.temperature.toFixed(1)}°C`;
    }
    if (layer === 'wind' && telemetry.current_weather) {
      return `${telemetry.current_weather.windspeed.toFixed(1)} km/h`;
    }
    if (!telemetry.hourly || !telemetry.current_weather) return null;
    const times: string[] = telemetry.hourly.time;
    const currentTimeStr = telemetry.current_weather.time;
    const currentIdx = times.findIndex((t: string) => t.startsWith(currentTimeStr.substring(0, 13)));
    if (currentIdx === -1) return null;

    if (layer === 'precip') {
      return `${telemetry.hourly.precipitation[currentIdx].toFixed(1)} mm`;
    }
    if (layer === 'humidity') {
      return `${telemetry.hourly.relative_humidity_2m[currentIdx].toFixed(1)}%`;
    }
    if (layer === 'drought') {
      const temp = telemetry.hourly.temperature_2m[currentIdx];
      const rain = telemetry.hourly.precipitation[currentIdx];
      const idxVal = calculateDroughtIndex(temp, rain, 0); // temp offset 0 for live telemetry
      return `${idxVal.toFixed(3)} idx`;
    }
    return null;
  };

  const [isMissionControlLocal, setIsMissionControlLocal] = useState(false);
  const isMissionControl = isPresentationMode || isMissionControlLocal;
  const setIsMissionControl = setIsMissionControlLocal;

  useEffect(() => {
    const handleMissionToggle = (e: KeyboardEvent) => {
      // Intercept 'M' key presses unless typing inside a form input element
      if (e.key.toLowerCase() === 'm' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        // Toggle your pre-existing, optimized state handler function
        setIsMissionControlLocal(prev => !prev); 
      }
    };
    window.addEventListener('keydown', handleMissionToggle);
    return () => window.removeEventListener('keydown', handleMissionToggle);
  }, []);

  // Map Navigation Level State
  const [level, setLevel] = useState<MapLevel>("india");

  // Simulation params
  const [params, setParams] = useState<SimulationParams>(simulation);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcStep, setRecalcStep] = useState(0);

  // Timeline
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineIndex, setTimelineIndex] = useState(0); // 'Today'

  // Sparkline data
  const [sparklineValues, setSparklineValues] = useState<number[]>([15, 28, 12, 35, 20, 26, 38]);
  const [driftValue, setDriftValue] = useState(0);

  // Sidebar toggle
  const [isSimulationOpen, setIsSimulationOpen] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Recalculation stepper sequence
  const recalcTexts = [
    "REGENERATING AIR SHEAR GRIDS...",
    "SOLVING MONSOON VECTOR FLUIDS...",
    "SYNCHRONIZING MODEL CLIMATOTWIN OK"
  ];

  // Random drift simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setDriftValue((Math.random() - 0.5) * 0.15);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Recalculating trigger
  const handleRecalculate = () => {
    setIsRecalculating(true);
    setRecalcStep(0);
  };

  const handleReset = () => {
    setParams({
      tempOffset: 0.0,
      rainIntensity: 100
    });
    setIsRecalculating(true);
    setRecalcStep(0);
  };

  useEffect(() => {
    if (!isRecalculating) return;
    if (recalcStep < recalcTexts.length) {
      const timer = setTimeout(() => {
        setRecalcStep(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsRecalculating(false);
      setSimulation(params);
      setSparklineValues(Array.from({ length: 7 }, () => Math.floor(Math.random() * 30) + 10));
    }
  }, [isRecalculating, recalcStep, params, setSimulation]);

  // Automated Timeline playback
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimelineIndex(prev => (prev + 1) % TIMELINE_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Dynamic calculated surface analysis variables based on slider offsets
  const computedLST = useMemo(() => {
    const base = 31.84 + simulation.tempOffset + driftValue;
    return base.toFixed(2);
  }, [simulation.tempOffset, driftValue]);

  const computedSST = useMemo(() => {
    const base = 27.91 + (simulation.tempOffset * 0.8) + (driftValue * 0.6);
    return base.toFixed(2);
  }, [simulation.tempOffset, driftValue]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-transparent text-text-primary select-none font-mono relative">

      {/* MISSION CONTROL HEAD ACTION STRIP */}
      {!isPresentationMode && (
        <header className="h-[52px] w-full bg-bg-surface border-b border-border-default flex items-center justify-between px-6 select-none shrink-0">
          <div className="flex items-center gap-5 text-[10.5px] uppercase tracking-wider">
            <div className="flex items-center gap-2 bg-accent-blue/10 px-3 py-1 border border-accent-blue/20 rounded">
              <span className="w-2 h-2 rounded-full bg-accent-green inline-block animate-ping" />
              <span className="text-accent-blue font-black tracking-widest">MOSDAC LIVE STREAM</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-text-muted">ACTIVE SATELLITE:</span>
              <span className="text-accent-cyan font-bold">INSAT-3DR [GEOCENTRIC OVERLAY]</span>
            </div>

            <div className="w-[1px] h-3 bg-border-default hidden md:block" />

            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">ORBIT PAYLOAD:</span>
              <span className="text-text-primary font-bold">IMAGER & SOUNDER ACTIVE</span>
            </div>
          </div>

          {/* PRESENTATION TOGGLE ACTION BUTTON */}
          <div className="flex items-center gap-4">
            <span className="text-accent-green font-bold bg-bg-elevated border border-accent-green/20 px-2 py-0.5 rounded text-[10px] hidden sm:inline-block">
              98.4% DATA LOCK
            </span>
          </div>
        </header>
      )}

      {/* OVERHAULED WORKSPACE BLOCK */}
      <div
        className="flex w-full overflow-hidden relative"
        style={{ height: isPresentationMode ? "100%" : "calc(100vh - 52px - 64px)" }}
      >

        {/* SIDEBAR LEFT: HIDDEN IN MISSION MODE TO EXPOSE MAP */}
        {!isMissionControl && (
          <aside className="left-sidebar w-[260px] shrink-0 bg-bg-surface border-r border-border-default p-4 flex flex-col justify-between overflow-y-auto hide-scrollbar z-10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5 border-b border-border-default pb-2">
                <span className="text-[10px] font-display font-black text-text-primary uppercase tracking-widest">ATMOSPHERIC LAYER</span>
                <p className="text-[8.5px] text-text-secondary mt-1">Select GIS weather telemetry</p>
              </div>

              <div className="flex flex-col gap-1">
                {LAYERS_LIST.map((item) => {
                  const isActive = activeLayer === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveLayer(item.id as WeatherLayer)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer ${isActive ? "bg-accent-blue/10 border-accent-blue/40 text-text-primary font-black" : "bg-bg-elevated/30 border-transparent text-text-secondary hover:bg-bg-elevated/40"
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold tracking-wide uppercase">{item.name}</span>
                      </div>
                      <span className="text-[8px] font-mono text-accent-cyan px-1.5 py-0.5 bg-bg-deep rounded">{item.unit}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-bg-elevated/35 border border-border-default p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 mb-2">
                <Settings className="w-3.5 h-3.5 text-accent-blue" />
                <span className="text-[10px] font-bold tracking-widest uppercase">WHAT-IF SIMULATOR</span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[9.5px] font-mono font-black text-slate-900 mb-1">
                    <span>TEMP SHIFT</span>
                    <span className="text-accent-blue font-black">{params.tempOffset > 0 ? "+" : ""}{params.tempOffset.toFixed(1)}°C</span>
                  </div>
                  <input
                    type="range" min="-5" max="5" step="0.1" value={params.tempOffset}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setParams(prev => ({ ...prev, tempOffset: val }));
                    }}
                    className="w-full cursor-pointer accent-accent-blue"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[9.5px] font-mono font-black text-slate-900 mb-1">
                    <span>RAIN SCALE</span>
                    <span className="text-accent-blue font-black">{params.rainIntensity}%</span>
                  </div>
                  <input
                    type="range" min="0" max="200" step="1" value={params.rainIntensity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setParams(prev => ({ ...prev, rainIntensity: val }));
                    }}
                    className="w-full cursor-pointer accent-accent-blue"
                  />
                </div>
                
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex gap-2">
                    <button onClick={handleRecalculate} className="flex-1 py-2 bg-accent-blue text-white text-[10px] font-bold rounded-lg uppercase tracking-wider cursor-pointer transition-all active:scale-[0.98]">
                      Recalculate Grids
                    </button>
                    <button onClick={handleReset} className="flex-1 py-2 bg-white border border-border-bright text-text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-bg-deep transition-all cursor-pointer transition-all active:scale-[0.98]">
                      Reset
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      setSimulation(params);
                      window.dispatchEvent(new CustomEvent('trigger-report-tab'));
                    }} 
                    className="w-full py-2 bg-white border border-border-bright text-text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider hover:bg-bg-deep transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <span>Synthesize Briefing</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ISRO MISSION INTEL NODE PANEL */}
        {isMissionControl && level !== 'district' && (
          <div className="absolute top-16 left-4 z-40 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-md font-mono text-[9px] w-56 space-y-2 select-none">
            <div className="flex justify-between border-b pb-1 text-slate-500 font-bold uppercase tracking-wider">
              <span>Telemetry Index</span>
              <span className="text-emerald-600">● LIVE</span>
            </div>
            <div className="space-y-1 text-slate-700">
              <div className="flex justify-between border-b border-slate-100/60 pb-1">
                <span className="font-semibold">NEXT PASS:</span>
                <span className="text-accent-orange font-black">04h 18m 22s</span>
              </div>
              <div className="flex justify-between border-b border-slate-100/60 pb-1">
                <span className="font-semibold">PAYLOAD:</span>
                <span className="text-text-primary font-black">INSAT-VHRR IMAGER</span>
              </div>
              <div className="flex justify-between border-b border-slate-100/60 pb-1">
                <span className="font-semibold">IMAGE SWATH:</span>
                <span className="text-text-primary font-black">6°N to 38°N ACCURATE</span>
              </div>
              <div className="flex justify-between border-b border-slate-100/60 pb-1">
                <span className="font-semibold">RESOLUTION:</span>
                <span className="text-accent-green font-black">4KM RADIOMETER</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-semibold">SPECTRUM:</span>
                <span className="text-accent-cyan font-black">THERMAL INFRARED</span>
              </div>
            </div>
          </div>
        )}

        {/* THE PRIMARY INTERACTIVE CLIMATE DRAW CANVAS PANEL */}
        <section className="flex-1 relative h-full bg-bg-void overflow-hidden bg-transparent">
          {/* CINEMATIC MISSION CONTROL HEADS-UP OVERLAY */}
          {isPresentationMode && (
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-50 font-mono text-white select-none">
              {/* Top Operational Status Banner */}
              <div className="w-full flex justify-between items-start bg-slate-900/95 border border-slate-800 p-4 rounded-2xl backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <div className="text-left font-mono">
                    <h2 className="text-[12px] font-black tracking-widest uppercase text-white">ISRO COMBINED OPERATIONS DESK</h2>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">TARGET COMPILER FEED: INSAT-3DR GEOSTATIONARY SATELLITE REALTIME INGRESS</p>
                  </div>
                </div>
                <div className="text-[9px] bg-slate-950 border border-slate-800 p-2 rounded-xl text-emerald-400 font-extrabold tracking-widest font-mono text-right">
                  📡 NEXT CONFIRMATION PASS: <span className="text-white font-bold">04H 22M</span>
                </div>
              </div>

              {/* Bottom Status Ticker */}
              <div className="w-full flex justify-between items-center text-[9px] text-slate-400 bg-slate-900/95 border border-slate-800 p-3 rounded-xl backdrop-blur-md shadow-2xl font-mono">
                <div className="flex gap-4 uppercase font-bold">
                  <span className="text-accent-blue font-black">[BHUVAN GIS INTERPOLATION: ON]</span>
                  <span className="text-emerald-500 font-black">[RESOURCESAT-2A CROP INDEX: LIVE]</span>
                  <span className="text-amber-400 font-black animate-pulse">[⚠️ COGNITIVE TWIN DETECT ACTIVE]</span>
                </div>
                <div className="text-slate-500 font-bold">PRESS 'M' TO EXIT OPERATIONS EXECUTIVE MODE</div>
              </div>
            </div>
          )}

          <div className="w-full h-full relative flex items-center justify-center p-4">
            <MapView
              ref={mapRef} mode="dashboard" activeLayerId={activeLayer} setActiveLayerId={setActiveLayer}
              simulation={simulation} activeTimeIndex={timelineIndex} setActiveTimeIndex={setTimelineIndex}
              level={level} onLevelChange={setLevel}
            />
          </div>
        </section>

        {/* SIDEBAR RIGHT: HIDDEN IN MISSION MODE TO EXPOSE MAP */}
        {!isMissionControl && (
          <aside className="right-panel w-[280px] shrink-0 bg-bg-surface border-l border-border-default p-4 flex flex-col justify-between overflow-y-auto hide-scrollbar z-10">
            <div className="flex flex-col gap-4">
              <div className="bg-bg-elevated/35 border border-border-default p-4 rounded-xl border-l-4 border-l-accent-blue flex flex-col gap-3.5">
                <h3 className="text-[10px] font-bold tracking-widest uppercase border-b border-border-default pb-2">Surface Analysis</h3>
                <div className="grid grid-cols-2 gap-3 pb-1">
                  <div><p className="text-[8.5px] text-text-secondary uppercase mb-1">LST (Land)</p><p className="text-[12px] font-mono font-bold">{computedLST}°C</p></div>
                  <div><p className="text-[8.5px] text-text-secondary uppercase mb-1">SST (Sea)</p><p className="text-[12px] font-mono font-bold text-accent-cyan">{computedSST}°C</p></div>
                </div>
                <div className="h-10 w-full flex items-end">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 45">
                    <path d={`M0 45 ` + sparklineValues.map((val, i) => `L ${(i / (sparklineValues.length - 1)) * 100} ${45 - val}`).join(" ") + ` L 100 45 Z`} fill="rgba(59, 130, 246, 0.08)" stroke="var(--accent-blue)" strokeWidth="2.0" />
                  </svg>
                </div>
              </div>

              {/* MOSDAC LIVE LAYER FEED METRIC CARD */}
              <div className="bg-bg-elevated/35 border border-border-default p-4 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-border-default pb-2">
                  <span className="text-[9.5px] font-bold tracking-widest uppercase flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-accent-cyan" />
                    {activeLayer === 'drought' ? 'DROUGHT INDEX' : `${activeLayer.toUpperCase()} FEED`}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                </div>
                <div className="flex flex-col gap-1 font-mono">
                  <div className="flex justify-between text-[10px] text-text-secondary">
                    <span>SENSOR SOURCE:</span>
                    <span className="text-text-primary font-bold animate-pulse text-accent-cyan">
                      {activeTelemetry ? "MET-NET LIVE TELEMETRY" : getLiveMosdacMetric(activeLayer, params.tempOffset, params.rainIntensity).label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[8.5px] text-text-secondary uppercase">METRIC VALUE:</span>
                    <span className={`font-black text-xs ${activeLayer === 'drought' ? 'text-accent-orange animate-pulse text-sm font-extrabold' : 'text-text-primary'}`}>
                      {getCurrentTelemetryVal(activeTelemetry, activeLayer) || getLiveMosdacMetric(activeLayer, params.tempOffset, params.rainIntensity).val}
                    </span>
                  </div>
                  <div className="text-[8px] text-accent-green font-bold uppercase mt-1 animate-pulse">
                    &gt; {activeTelemetry ? "STREAM COMPLIANT OK" : getLiveMosdacMetric(activeLayer, params.tempOffset, params.rainIntensity).status}
                  </div>
                </div>
              </div>

              <div className="bg-bg-elevated/35 border border-border-default p-4 rounded-xl flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-border-default pb-2">
                  <span className="text-[9.5px] font-bold tracking-widest uppercase flex items-center gap-1.5"><Radar className="w-3.5 h-3.5 text-accent-cyan" />RADAR CHANNELS</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                </div>
                <div className="flex flex-col gap-2.5 text-[9px] text-text-secondary">
                  <div className="flex justify-between"><span>IMD-RADAR-4</span><span className="text-accent-green font-bold">ACTIVE OK</span></div>
                  <div className="flex justify-between"><span>SATELLITE-7B</span><span className="text-accent-green font-bold">ACTIVE OK</span></div>
                </div>
              </div>
            </div>

            <div className="text-[8px] text-text-secondary mt-auto flex flex-col gap-0.5 border-t border-border-default pt-3 uppercase">
              <span>MODEL: CLIMATOTWIN v6.81</span>
              <span>INGRESS BOUND: PORT 3000 COMPLIANT</span>
            </div>
          </aside>
        )}

        {/* FLOATING MISSION METADATA LOG - VISIBLE IN FULLSCREEN PRESENTATION */}
        {isMissionControl && level !== 'district' && (
          <div className="absolute bottom-4 right-4 z-50 bg-white/95 backdrop-blur-md border border-border-default p-4 rounded-xl max-w-[260px] font-mono text-slate-900 shadow-2xl pointer-events-none">
            <div className="text-[9px] font-black tracking-widest text-accent-blue uppercase mb-2">SYSTEM CONSOLE INPUT</div>
            <div className="text-[8.5px] space-y-1 text-slate-600 uppercase font-semibold">
              <div>&gt; CONNECTED TO MET-NET INGRESS</div>
              <div>&gt; SHIFT ANOMALY DELTA: {params.tempOffset.toFixed(1)}°C</div>
              <div>&gt; ACTIVE GEOMETRIC GRID LEVEL: LIVE MAP</div>
              <div className="text-accent-green font-bold">&gt; GFS CYCLES RENDERING WITHOUT DRIFT</div>
            </div>
          </div>
        )}

      </div>

      {/* TEMPORAL CHRONO TIMELINE PROGRESSION FOOTER CONTROLS */}
      <footer className="h-16 bg-bg-surface border-t border-border-default px-6 flex items-center justify-between z-20 shrink-0 font-mono text-text-primary">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-full bg-accent-blue text-white flex items-center justify-center transition-all cursor-pointer shadow-md focus:outline-none">
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
          </button>
          <div className="hidden lg:flex flex-col text-left leading-none">
            <span className="text-[10px] text-accent-cyan font-extrabold uppercase">Progression Engine</span>
            <span className="text-[7.5px] text-text-secondary uppercase mt-0.5">GFS auto cycles</span>
          </div>
        </div>

        <div className="flex-1 max-w-2xl px-6 flex items-center gap-4.5">
          <div className="relative flex-1 h-1 bg-bg-elevated rounded-full">
            <div className="absolute inset-y-0 left-0 bg-accent-blue rounded-full transition-all" style={{ width: `${(timelineIndex / (TIMELINE_STEPS.length - 1)) * 100}%` }} />
            <div className="absolute inset-x-0 -top-1.5 flex justify-between">
              {TIMELINE_STEPS.map((step, idx) => (
                <button key={step} onClick={() => { setTimelineIndex(idx); setIsPlaying(false); }} className={`w-3.5 h-3.5 rounded-full border-2 border-bg-surface cursor-pointer ${idx === timelineIndex ? "bg-accent-blue scale-110" : "bg-text-muted"}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-4 text-[9px] uppercase tracking-wide">
            {TIMELINE_STEPS.map((step, idx) => (
              <button key={step} onClick={() => { setTimelineIndex(idx); setIsPlaying(false); }} className={`cursor-pointer font-bold ${idx === timelineIndex ? "text-accent-cyan font-black" : "text-text-secondary"}`}>{step}</button>
            ))}
          </div>
        </div>

        <div className="text-[10px] font-bold text-text-primary shrink-0 uppercase">
          TIME FRAME: <span className="text-accent-cyan">{TIMELINE_STEPS[timelineIndex].toUpperCase()}</span>
        </div>
      </footer>

    </div>
  );
}
