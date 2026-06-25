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
}

export type MapLevel = 'india' | 'state' | 'district';

export default function DashboardView({
  activeLayer,
  setActiveLayer,
  simulation,
  setSimulation
}: DashboardViewProps) {
  const mapRef = useRef<any>(null);

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
    <div className="flex flex-col h-full w-full overflow-hidden bg-bg-void text-text-primary select-none">
      
      {/* PROBLEM 6 — KPI TOP STRIP */}
      <header className="h-[52px] w-full bg-bg-surface border-b border-border-default flex items-center justify-between px-6 select-none shrink-0">
        <div className="flex items-center gap-5 h-full text-[11px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5 h-full">
            <span className="font-display font-medium text-text-muted">🌡 MEAN TEMP:</span>
            <span className="text-accent-cyan font-mono font-bold">27.8°C</span>
          </div>
          
          <div className="w-[1px] h-3 bg-border-default" />

          <div className="flex items-center gap-1.5 h-full">
            <span className="font-display font-medium text-text-muted">🌧 PRECIPITATION:</span>
            <span className="text-accent-cyan font-mono font-bold">842mm</span>
          </div>

          <div className="w-[1px] h-3 bg-border-default" />

          <div className="flex items-center gap-1.5 h-full">
            <span className="font-display font-medium text-text-muted">⚡ ALERTS:</span>
            <span className={`font-mono font-bold ${simulation.tempOffset > 2 ? "text-accent-red animate-pulse" : "text-accent-green"}`}>
              {simulation.tempOffset > 2 ? "EXTREME HEAT" : "NOMINAL"}
            </span>
          </div>

          <div className="w-[1px] h-3 bg-border-default" />

          <div className="flex items-center gap-1.5 h-full">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green inline-block animate-pulse" />
            <span className="text-text-primary font-mono font-black">TODAY</span>
          </div>
        </div>

        <div className="flex items-center gap-2 h-full text-[11px]">
          <span className="font-display font-medium text-text-muted">✦ AI CONFIDENCE:</span>
          <span className="text-accent-cyan font-mono font-bold bg-bg-elevated border border-border-bright/30 px-2 py-0.5 rounded-md text-[10px]">
            92%
          </span>
        </div>
      </header>

      {/* DASHBOARD WORKSPACE (Sidebar Left + Map centerpiece + Panel Right) */}
      <div 
        className={`dashboard-layout ${level !== 'india' ? 'map-fullscreen' : ''} w-full overflow-hidden relative`}
        style={{ height: "calc(100vh - 56px - 52px - 64px)" }}
      >
        
        {/* PROBLEM 5 — LEFT SIDEBAR LAYER SELECTOR (width 260px) */}
        <aside className="left-sidebar w-[260px] shrink-0 bg-bg-surface border-r border-border-default p-4 flex flex-col justify-between overflow-y-auto hide-scrollbar z-10">
          <div className="flex flex-col gap-4">
            
            {/* GIS weather telemetry header */}
            <div className="flex flex-col gap-0.5 border-b border-border-default pb-2">
              <span className="text-[10px] font-display font-black text-text-primary uppercase tracking-widest leading-none">
                ATMOSPHERIC LAYER
              </span>
              <p className="text-[8.5px] font-mono text-text-secondary leading-none mt-1">
                Select GIS weather telemetry
              </p>
            </div>

            {/* Selector list */}
            <div className="flex flex-col gap-1">
              {LAYERS_LIST.map((item) => {
                const isActive = activeLayer === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveLayer(item.id as WeatherLayer)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? "bg-accent-blue/10 border-accent-blue/40 text-text-primary font-black" 
                        : "bg-bg-elevated/30 border-transparent text-text-secondary hover:bg-bg-elevated/40 hover:text-text-primary"
                    }`}
                    style={isActive ? { borderLeft: "3px solid var(--accent-blue)" } : undefined}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-accent-blue" : "text-text-secondary"}`} />
                      <span className="text-[11px] font-bold tracking-wide uppercase">{item.name}</span>
                    </div>
                    <span className="text-[8px] font-mono font-bold bg-bg-deep border border-border-default text-accent-cyan px-1.5 py-0.5 rounded leading-none">
                      {item.unit}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* WHAT-IF SIMULATOR */}
          <div className="bg-bg-elevated/35 whatif-card border border-border-default p-3.5 rounded-xl flex flex-col gap-3 mt-4 what-if-section">
            <button
              onClick={() => setIsSimulationOpen(prev => !prev)}
              className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                <span className="text-[10px] font-display font-black text-text-primary tracking-widest uppercase">
                  WHAT-IF SIMULATOR
                </span>
              </div>
              {isSimulationOpen ? <ChevronUp className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronDown className="w-3.5 h-3.5 text-text-secondary" />}
            </button>

            {isSimulationOpen && (
              <div className="space-y-4 mt-1">
                {/* Temp shift slider */}
                <div>
                  <div className="flex justify-between text-[8px] font-mono text-text-secondary mb-1">
                    <span>TEMP SHIFT</span>
                    <span className="text-accent-blue font-bold">
                      {params.tempOffset > 0 ? "+" : ""}{params.tempOffset.toFixed(1)}°C
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-5"
                    max="5"
                    step="0.1"
                    value={params.tempOffset}
                    onChange={(e) => setParams(prev => ({ ...prev, tempOffset: parseFloat(e.target.value) }))}
                    className="w-full cursor-pointer accent-accent-blue"
                  />
                </div>

                {/* Rain scale slider */}
                <div>
                  <div className="flex justify-between text-[8px] font-mono text-text-secondary mb-1">
                    <span>RAIN SCALE</span>
                    <span className="text-accent-blue font-bold">{params.rainIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    step="1"
                    value={params.rainIntensity}
                    onChange={(e) => setParams(prev => ({ ...prev, rainIntensity: parseInt(e.target.value) }))}
                    className="w-full cursor-pointer accent-accent-blue"
                  />
                </div>

                {/* Recalculate CTA */}
                {isRecalculating ? (
                  <div className="w-full py-2 px-1 bg-bg-void/80 rounded-lg border border-accent-blue/10">
                    <div className="text-[8px] font-mono text-accent-blue animate-pulse text-center font-extrabold uppercase truncate px-1">
                      {recalcTexts[recalcStep]}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleRecalculate}
                    className="w-full py-2 bg-accent-blue hover:bg-opacity-95 text-white text-[10px] font-display font-bold rounded-lg hover:shadow-lg active:scale-95 duration-150 flex items-center justify-center gap-1.5 cursor-pointer leading-none uppercase tracking-wider"
                  >
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: "6s" }} />
                    <span>Recalculate Grids</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* CENTER PANE: FULL SCALE INDIA CLIMATE MAP */}
        <section className="map-center flex-1 relative h-full bg-bg-void overflow-hidden">
          <MapView
            ref={mapRef}
            mode="dashboard"
            activeLayerId={activeLayer}
            setActiveLayerId={setActiveLayer}
            simulation={simulation}
            activeTimeIndex={timelineIndex}
            setActiveTimeIndex={setTimelineIndex}
            level={level}
            onLevelChange={setLevel}
          />
        </section>

        {/* PROBLEM 2 — RIGHT PANEL (width 280px) */}
        <aside className="right-panel w-[280px] shrink-0 bg-bg-surface border-l border-border-default p-4 flex flex-col justify-between overflow-y-auto hide-scrollbar z-10">
          <div className="flex flex-col gap-4">
            
            {/* SURFACE ANALYSIS CARD with sparkline */}
            <div className="bg-bg-elevated/35 surface-analysis-card border border-border-default p-4 rounded-xl border-l-4 border-l-accent-blue flex flex-col gap-3.5">
              <h3 className="text-[10px] font-display font-black text-text-primary tracking-widest uppercase border-b border-border-default pb-2">
                Surface Analysis
              </h3>

              <div className="grid grid-cols-2 gap-3 pb-1">
                <div>
                  <p className="text-[8.5px] text-text-secondary uppercase mb-1">
                    LST (Land)
                  </p>
                  <p className="text-[12px] font-mono font-bold text-text-primary">
                    {computedLST}°C
                  </p>
                </div>
                <div>
                  <p className="text-[8.5px] text-text-secondary uppercase mb-1">
                    SST (Sea)
                  </p>
                  <p className="text-[12px] font-mono font-bold text-accent-cyan">
                    {computedSST}°C
                  </p>
                </div>
              </div>

              {/* Sparkline graphics matching tokens */}
              <div className="h-10 w-full flex items-end">
                <svg className="w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 45">
                  <path 
                    d={`M0 45 ` + sparklineValues.map((val, i) => `L ${(i / (sparklineValues.length - 1)) * 100} ${45 - val}`).join(" ") + ` L 100 45 Z`}
                    fill="rgba(59, 130, 246, 0.08)" 
                    stroke="var(--accent-blue)" 
                    strokeWidth="2.0"
                  />
                  <path 
                    d={sparklineValues.map((val, i) => `L ${(i / (sparklineValues.length - 1)) * 100} ${45 - (val * 0.7 + 6)}`).join(" ").replace("L", "M")}
                    fill="none" 
                    stroke="var(--accent-cyan)" 
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </svg>
              </div>
            </div>

            {/* RADAR SYNCHRONOUS DATA CHANNELS */}
            <div className="bg-bg-elevated/35 radar-card border border-border-default p-4 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-border-default pb-2">
                <span className="text-[9.5px] font-display font-black text-text-primary tracking-widest uppercase flex items-center gap-1.5">
                  <Radar className="w-3.5 h-3.5 text-accent-cyan" />
                  RADAR CHANNEL
                </span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green"></span>
                </span>
              </div>

              <div className="flex flex-col gap-2.5 text-[9px] font-mono text-text-secondary">
                <div className="flex justify-between">
                  <span>IMD-RADAR-4</span>
                  <span className="text-accent-green font-bold">ACTIVE OK</span>
                </div>
                <div className="flex justify-between">
                  <span>SATELLITE-7B</span>
                  <span className="text-accent-green font-bold">ACTIVE OK</span>
                </div>
                <div className="flex justify-between text-accent-blue border-t border-border-default pt-1.5">
                  <span>SYSTEM HEARTBEAT</span>
                  <span>SYNCED</span>
                </div>
              </div>
            </div>

            {/* SIMULATOR SLIDERS DUPLICATE GROUP */}
            <div className="bg-bg-elevated/35 metric-card border border-border-default p-3.5 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-border-default pb-2">
                <span className="text-[9.5px] font-display font-black text-text-primary tracking-widest uppercase">
                  What-If Parameter Mod
                </span>
              </div>
              <div className="space-y-3 pt-1 text-[9px] font-mono leading-none">
                <div className="flex justify-between text-[8px]">
                  <span className="text-text-secondary">TEMP OFFSET:</span>
                  <span className="text-accent-orange font-bold">{simulation.tempOffset > 0 ? "+" : ""}{simulation.tempOffset.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span className="text-text-secondary">RAIN SCALE:</span>
                  <span className="text-accent-cyan font-bold">{simulation.rainIntensity}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* SYSTEM METADATA BOTTOM FOOTER */}
          <div className="text-[8px] font-mono text-text-secondary mt-auto flex flex-col gap-0.5 border-t border-border-default pt-3 leading-tight uppercase">
            <span>MODEL: CLIMATOTWIN v6.81</span>
            <span>INGRESS BOUND: PORT 3000 COMPLIANT</span>
          </div>

        </aside>

      </div>

      {/* PROBLEM 7 — TEMPORAL SLIDER (bottom bar) */}
      <footer className="h-16 bg-bg-surface border-t border-border-default px-6 flex items-center justify-between z-20 shrink-0 font-mono text-text-primary select-none">
        
        {/* Play control */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-accent-blue hover:bg-opacity-90 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer shadow-md focus:outline-none"
            title={isPlaying ? "Pause model progression loop" : "Play continuous model progression loop"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white ml-0.5" />}
          </button>
          
          <div className="hidden lg:flex flex-col text-left leading-none">
            <span className="text-[10px] text-accent-cyan font-extrabold uppercase">Progression Engine</span>
            <span className="text-[7.5px] text-text-secondary uppercase mt-0.5">GFS auto cycles</span>
          </div>
        </div>

        {/* Timeline dots system */}
        <div className="flex-1 max-w-2xl px-6 flex items-center gap-4.5">
          <div className="relative flex-1 h-1 bg-bg-elevated rounded-full">
            <div 
              className="absolute inset-y-0 left-0 bg-accent-blue rounded-full transition-all"
              style={{ width: `${(timelineIndex / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />
            {/* Interactive dot triggers */}
            <div className="absolute inset-x-0 -top-1.5 flex justify-between">
              {TIMELINE_STEPS.map((step, idx) => {
                const isActive = idx === timelineIndex;
                return (
                  <button
                    key={step}
                    onClick={() => {
                      setTimelineIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`w-3.5 h-3.5 rounded-full border-2 border-bg-surface cursor-pointer hover:scale-110 duration-100 transition-all ${
                      isActive ? "bg-accent-blue ring-2 ring-accent-blue/30 scale-110" : "bg-text-muted"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Labels array to trigger timeline scale shifts in click */}
          <div className="flex gap-4 text-[9px] uppercase tracking-wide">
            {TIMELINE_STEPS.map((step, idx) => {
              const isActive = idx === timelineIndex;
              return (
                <button
                  key={step}
                  onClick={() => {
                    setTimelineIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={`cursor-pointer transition-all leading-none font-bold ${
                    isActive ? "text-accent-cyan font-black" : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {step}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current timeline frame output */}
        <div className="text-[10px] font-bold text-text-primary shrink-0 font-mono uppercase">
          TIME FRAME: <span className="text-accent-cyan">{TIMELINE_STEPS[timelineIndex].toUpperCase()}</span>
        </div>

      </footer>

    </div>
  );
}
