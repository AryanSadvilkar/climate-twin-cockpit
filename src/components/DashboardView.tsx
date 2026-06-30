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
import MapView, { MapLevel } from "./MapView";
import { useTelemetry } from "../context/TelemetryContext";

const getLiveMosdacMetric = (layer: string, offset: number, rain: number = 100) => {
  const baseMetrics: Record<string, { label: string; val: string; status: string }> = {
    temp: { label: "INSAT-3DR LST", val: `${(27.8 + offset).toFixed(1)}°C`, status: "THERMAL IMAGER ENERGETIC" },
    precip: { label: "INSAT-3D RHEM", val: `${Math.round(842 * (1 + offset * 0.05))}mm`, status: "HYDRO-RETRIEVAL CONCURRENT" },
    wind: { label: "MOSDAC SCATSAT", val: `${Math.round(24 + offset * 2)} km/h`, status: "CYCLONIC CYCLES TRACKED" },
    pressure: { label: "MET-GRID SYNOP", val: `${Math.round(1008 - offset * 1.5)} hPa`, status: "BAROMETRIC ANOMALY DETECTED" },
    humidity: { label: "SATELLITE VWC", val: `${Math.max(10, Math.min(100, Math.round(72 + offset * 3)))}%`, status: "SUBSURFACE MOISTURE GRADIENT" },
    solar: { label: "INSAT-3D IMAGER SR", val: `${Math.round(680 - offset * 15)} W/m²`, status: "INSOLATION ENERGY READOUT" }
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
  { id: "humidity", name: "Relative Humidity", icon: Droplet, unit: "%" },
  { id: "precip", name: "Precipitation", icon: CloudRain, unit: "mm" },
  { id: "wind", name: "Wind Speed", icon: Wind, unit: "km/h" },
  { id: "solar", name: "Solar Radiation", icon: Sun, unit: "W/m²" },
  { id: "pressure", name: "Surface Pressure", icon: Gauge, unit: "hPa" }
];

const TIMELINE_STEPS = ["Today", "+24h", "+72h", "+7d"];

interface DashboardViewProps {
  activeLayer: WeatherLayer;
  setActiveLayer: (layer: WeatherLayer) => void;
  simulation: SimulationParams;
  setSimulation: (sim: SimulationParams) => void;
  isPresentationMode?: boolean;
}

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
    if (layer === 'pressure') {
      const val = telemetry.hourly.surface_pressure?.[currentIdx];
      return val ? `${Math.round(val)} hPa` : `${Math.round(1008 - simulation.tempOffset * 1.5)} hPa`;
    }
    if (layer === 'solar') {
      const val = telemetry.hourly.shortwave_radiation?.[currentIdx];
      return val ? `${Math.round(val)} W/m²` : `${Math.round(680 - simulation.tempOffset * 15)} W/m²`;
    }
    return null;
  };

  const [isMissionControlLocal, setIsMissionControlLocal] = useState(false);
  const isMissionControl = isPresentationMode || isMissionControlLocal;
  const setIsMissionControl = setIsMissionControlLocal;

  useEffect(() => {
    const handleMissionToggle = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
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
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);

  // Sparkline data
  const [sparklineValues, setSparklineValues] = useState<number[]>([15, 28, 12, 35, 20, 26, 38]);
  const [driftValue, setDriftValue] = useState(0);

  // Sidebar toggle
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [showSurfaceAnalysis, setShowSurfaceAnalysis] = useState(true);

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

      {/* OVERHAULED WORKSPACE BLOCK */}
      <div
        className="flex w-full overflow-hidden relative flex-1"
        style={{ height: "100%" }}
      >
        
        {/* BACKGROUND GEOSPATIAL MAP VIEW CONTAINER */}
        <div className="absolute inset-0 z-0 bg-transparent w-full h-full">
          <MapView
            ref={mapRef} mode="dashboard" activeLayerId={activeLayer} setActiveLayerId={setActiveLayer}
            simulation={simulation} activeTimeIndex={timelineIndex} setActiveTimeIndex={setTimelineIndex}
            level={level} onLevelChange={setLevel} isLeftPanelOpen={isLeftPanelOpen}
          />
        </div>

        {/* SIDEBAR LEFT: FLOATING ABOVE MAP */}
        {!isMissionControl && (
          <>
            <aside 
              className="left-sidebar absolute left-4 top-4 bottom-4 w-[260px] bg-bg-surface border border-border-default p-4 flex flex-col justify-between overflow-y-auto hide-scrollbar z-20 rounded-2xl shadow-xl transition-transform duration-300 ease-in-out pointer-events-auto backdrop-blur-md"
              style={{ 
                transform: isLeftPanelOpen ? 'translateX(0)' : 'translateX(calc(-100% - 16px))' 
              }}
            >
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

                {/* SLIDER CONTROLLER SIMULATOR CARD */}
                <div className="bg-bg-elevated/35 border border-border-default p-4 rounded-xl flex flex-col gap-4 mt-2">
                  <div className="flex items-center justify-between border-b border-border-default pb-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5"><Settings className="w-3.5 h-3.5 text-accent-blue" />WHAT-IF SIMULATOR</span>
                  </div>
                  <div className="space-y-3 font-mono">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[9px] text-text-secondary">
                        <span>TEMP BIAS</span>
                        <span className="font-bold text-text-primary">{params.tempOffset >= 0 ? `+${params.tempOffset.toFixed(1)}` : params.tempOffset.toFixed(1)}°C</span>
                      </div>
                      <input type="range" min="-5" max="5" step="0.5" value={params.tempOffset} onChange={(e) => setParams(prev => ({ ...prev, tempOffset: parseFloat(e.target.value) }))} className="w-full cursor-pointer accent-accent-blue" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[9px] text-text-secondary">
                        <span>RAIN VOLUME</span>
                        <span className="font-bold text-text-primary">{params.rainIntensity}%</span>
                      </div>
                      <input type="range" min="0" max="250" step="10" value={params.rainIntensity} onChange={(e) => setParams(prev => ({ ...prev, rainIntensity: parseInt(e.target.value) }))} className="w-full cursor-pointer accent-accent-blue" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex gap-2">
                      <button onClick={handleRecalculate} disabled={isRecalculating} className={`flex-1 text-[9px] uppercase tracking-wider py-2 font-black rounded-lg transition-all duration-200 shadow-md ${isRecalculating ? "bg-bg-elevated text-text-muted border border-border-default" : "bg-accent-blue hover:bg-blue-600 text-white cursor-pointer"}`}>
                        {isRecalculating ? "RUNNING..." : "Recalculate"}
                      </button>
                      <button onClick={handleReset} className="flex-1 py-2 bg-bg-elevated/40 border border-border-default text-text-primary text-[9px] font-bold rounded-lg uppercase tracking-wider hover:bg-bg-elevated/80 transition-all cursor-pointer">
                        Reset
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setSimulation(params);
                        window.dispatchEvent(new CustomEvent('trigger-report-tab'));
                      }} 
                      className="w-full py-2 bg-bg-elevated/40 border border-border-default text-text-primary text-[9px] font-bold rounded-lg uppercase tracking-wider hover:bg-bg-elevated/80 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>Synthesize Briefing</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[8px] text-text-secondary mt-6 flex flex-col gap-0.5 border-t border-border-default pt-3.5 uppercase">
                <span>SYSTEM STATUS: COMPLIANT</span>
                <span>SECURE INGRESS: ON</span>
              </div>
            </aside>
            <button
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="absolute top-1/2 -translate-y-1/2 z-30 w-8 h-24 bg-bg-surface/90 border border-l-0 border-border-default rounded-r-2xl flex items-center justify-center cursor-pointer shadow-lg backdrop-blur-md text-text-primary hover:text-white hover:bg-accent-blue transition-all duration-300 ease-in-out pointer-events-auto text-[20px] font-black leading-none border-l-0"
              style={{
                left: isLeftPanelOpen ? '276px' : '0px'
              }}
            >
              {isLeftPanelOpen ? "‹" : "›"}
            </button>
          </>
        )}

        {/* ISRO MISSION INTEL NODE PANEL */}
        {isMissionControl && level !== 'district' && (
          <div className="absolute top-16 left-4 z-40 bg-bg-surface border border-border-default shadow-md font-mono text-[9px] w-56 space-y-2 select-none rounded-xl p-3.5 backdrop-blur-md">
            <div className="flex justify-between border-b border-border-default pb-1 text-text-muted font-bold uppercase tracking-wider">
              <span>Telemetry Index</span>
              <span className="text-accent-green">● LIVE</span>
            </div>
            <div className="space-y-1 text-text-secondary">
              <div className="flex justify-between border-b border-border-default/40 pb-1">
                <span className="font-semibold">NEXT PASS:</span>
                <span className="text-accent-orange font-black">04h 18m 22s</span>
              </div>
              <div className="flex justify-between border-b border-border-default/40 pb-1">
                <span className="font-semibold">PAYLOAD:</span>
                <span className="text-text-primary font-black">INSAT-VHRR IMAGER</span>
              </div>
              <div className="flex justify-between border-b border-border-default/40 pb-1">
                <span className="font-semibold">IMAGE SWATH:</span>
                <span className="text-text-primary font-black">6°N to 38°N ACCURATE</span>
              </div>
              <div className="flex justify-between border-b border-border-default/40 pb-1">
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

        {/* SIDEBAR RIGHT: FLOATING, COLLAPSIBLE TO SIDE — hidden when district detail panel is open */}
        {!isMissionControl && level !== 'district' && (
          <>
            <aside 
              className="right-panel absolute right-4 top-4 bottom-4 w-[280px] bg-bg-surface border border-border-default p-4 flex flex-col justify-between overflow-y-auto hide-scrollbar z-20 rounded-2xl shadow-xl transition-transform duration-300 ease-in-out pointer-events-auto backdrop-blur-md"
              style={{ 
                transform: isRightPanelOpen ? 'translateX(0)' : 'translateX(calc(100% + 16px))' 
              }}
            >
              <div className="flex flex-col gap-4">
                {showSurfaceAnalysis && (
                  <div className="bg-bg-elevated/35 border border-border-default p-4 rounded-xl border-l-4 border-l-accent-blue flex flex-col gap-3.5">
                    <div className="flex justify-between items-center border-b border-border-default pb-2">
                      <h3 className="text-[10px] font-bold tracking-widest uppercase">Surface Analysis</h3>
                      <button onClick={() => setShowSurfaceAnalysis(false)} className="text-text-secondary hover:text-accent-blue transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                )}

                {/* MOSDAC LIVE LAYER FEED METRIC CARD */}
                <div className="bg-bg-elevated/35 border border-border-default p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-border-default pb-2">
                    <span className="text-[9.5px] font-bold tracking-widest uppercase flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-accent-cyan" />
                      {activeLayer === 'solar' ? 'SOLAR RADIATION' : `${activeLayer.toUpperCase()} FEED`}
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
                      <span className={`font-black text-xs ${activeLayer === 'solar' ? 'text-accent-orange animate-pulse text-sm font-extrabold' : 'text-text-primary'}`}>
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

              <>
                <div className="text-[8px] text-text-secondary mt-auto flex flex-col gap-0.5 border-t border-border-default pt-3 uppercase">
                  <span>MODEL: CLIMATOTWIN v6.81</span>
                  <span>INGRESS BOUND: PORT 3000 COMPLIANT</span>
                </div>
              </>
            </aside>
            <button
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className="absolute top-1/2 -translate-y-1/2 z-30 w-8 h-24 bg-bg-surface/90 border border-r-0 border-border-default rounded-l-2xl flex items-center justify-center cursor-pointer shadow-lg backdrop-blur-md text-text-primary hover:text-white hover:bg-accent-blue transition-all duration-300 ease-in-out pointer-events-auto text-[20px] font-black leading-none border-r-0"
              style={{
                right: isRightPanelOpen ? '296px' : '0px'
              }}
            >
              {isRightPanelOpen ? "›" : "‹"}
            </button>
          </>
        )}

        {/* PROGRESSION ENGINE: FLOATING COLLAPSIBLE PILL ISLAND */}
        <div className={`absolute bottom-6 z-40 transition-all duration-500 ease-in-out ${level === 'district' ? 'left-1/4' : 'left-1/2'} -translate-x-1/2`}>
          {!isTimelineExpanded ? (
            /* Collapsed State capsule pill */
            <div 
              onClick={() => setIsTimelineExpanded(true)}
              className="panel-card cursor-pointer flex items-center gap-3.5 px-5 py-2.5 bg-bg-surface border border-border-default rounded-full shadow-lg select-none backdrop-blur-md hover:border-accent-blue/60 hover:shadow-xl transition-all duration-200 pointer-events-auto"
            >
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="w-7 h-7 rounded-full bg-accent-blue text-white flex items-center justify-center shadow-md cursor-pointer hover:scale-105 duration-150 relative shrink-0"
              >
                {isPlaying && <span className="absolute inset-0 rounded-full bg-accent-blue/40 animate-ping" />}
                {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white ml-0.5" />}
              </button>
              <span className="text-[11px] font-black tracking-widest text-text-primary uppercase leading-none">PROGRESSION ENGINE</span>
              <span className="w-[1px] h-3.5 bg-border-default" />
              <span className="text-[10px] font-mono font-bold text-accent-cyan leading-none">{TIMELINE_STEPS[timelineIndex].toUpperCase()}</span>
            </div>
          ) : (
            /* Expanded State container */
            <div 
              className="w-[520px] max-w-[90vw] p-4 flex flex-col gap-3 rounded-2xl bg-bg-surface border border-border-default shadow-2xl backdrop-blur-md transition-all duration-300 pointer-events-auto"
            >
              <div className="flex justify-between items-center select-none border-b border-border-default/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-widest text-text-primary uppercase">PROGRESSION ENGINE</span>
                  <span className="text-[8px] text-text-secondary uppercase px-1.5 py-0.5 bg-bg-deep rounded font-mono">GFS AUTO CYCLES</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTimelineExpanded(false);
                  }}
                  className="text-text-secondary hover:text-text-primary text-[9px] font-black tracking-widest uppercase font-mono px-2 py-0.5 border border-border-default rounded-md hover:bg-bg-elevated/40 transition-all cursor-pointer"
                >
                  ↓ COLLAPSE
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 font-mono text-text-primary pt-1">
                <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 rounded-full bg-accent-blue text-white flex items-center justify-center transition-all cursor-pointer shadow-md focus:outline-none shrink-0 hover:scale-105 duration-150">
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
                </button>

                <div className="flex-1 flex items-center gap-4 px-2">
                  <div className="relative flex-1 h-1 bg-bg-elevated rounded-full">
                    <div className="absolute inset-y-0 left-0 bg-accent-blue rounded-full transition-all" style={{ width: `${(timelineIndex / (TIMELINE_STEPS.length - 1)) * 100}%` }} />
                    <div className="absolute inset-x-0 -top-1 h-full">
                      {TIMELINE_STEPS.map((step, idx) => (
                        <button key={step} onClick={() => { setTimelineIndex(idx); setIsPlaying(false); }} 
                          className={`absolute top-0 w-3 h-3 -translate-x-1/2 rounded-full border-2 border-bg-surface cursor-pointer ${idx === timelineIndex ? "bg-accent-blue scale-110" : "bg-text-muted"}`}
                          style={{ left: `${(idx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2.5 text-[8.5px] uppercase tracking-wide">
                    {TIMELINE_STEPS.map((step, idx) => (
                      <button key={step} onClick={() => { setTimelineIndex(idx); setIsPlaying(false); }} className={`cursor-pointer font-bold ${idx === timelineIndex ? "text-accent-cyan font-black" : "text-text-secondary"}`}>{step}</button>
                    ))}
                  </div>
                </div>

                <div className="text-[9.5px] font-bold text-text-primary shrink-0 uppercase w-14 text-right">
                  <span className="text-accent-cyan">{TIMELINE_STEPS[timelineIndex].toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FLOATING MISSION METADATA LOG */}
        {isMissionControl && level !== 'district' && (
          <div className="absolute bottom-4 right-4 z-50 bg-bg-surface border border-border-default p-4 rounded-xl max-w-[260px] font-mono text-text-primary shadow-2xl pointer-events-none backdrop-blur-md">
            <div className="text-[9px] font-black tracking-widest text-accent-blue uppercase mb-2">SYSTEM CONSOLE INPUT</div>
            <div className="text-[8.5px] space-y-1 text-text-secondary uppercase font-semibold">
              <div>&gt; CONNECTED TO MET-NET INGRESS</div>
              <div>&gt; SHIFT ANOMALY DELTA: {params.tempOffset.toFixed(1)}°C</div>
              <div>&gt; ACTIVE GEOMETRIC GRID LEVEL: LIVE MAP</div>
              <div className="text-accent-green font-bold">&gt; GFS CYCLES RENDERING WITHOUT DRIFT</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
