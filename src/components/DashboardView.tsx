import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Thermometer,
  CloudRain,
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
  Radar,
  Info
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

  // Flash Prediction
  const [flashDistricts, setFlashDistricts] = useState<string[]>([]);
  const [flashQuery, setFlashQuery] = useState('');
  const [flashSuggestions, setFlashSuggestions] = useState<string[]>([]);
  const [flashSelectedDistrict, setFlashSelectedDistrict] = useState('');
  const [flashSelectedMetric, setFlashSelectedMetric] = useState<string>('meanTemp');
  const [flashLoading, setFlashLoading] = useState(false);
  const [flashResult, setFlashResult] = useState<Record<string, string> | null>(null);
  const [flashError, setFlashError] = useState<string | null>(null);
  const [flashViewFull, setFlashViewFull] = useState(false);

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

  // Fetch district names on mount
  const MAHARASHTRA_DISTRICTS = [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur',
    'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai',
    'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani',
    'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
  ];

  useEffect(() => {
    fetch('/api/districts')
      .then(r => r.json())
      .then((data: string[]) => {
        console.log('[Flash] Districts loaded from API:', data.length, data);
        setFlashDistricts(data.length > 0 ? data : MAHARASHTRA_DISTRICTS);
      })
      .catch(err => {
        console.warn('[Flash] API fetch failed, using hardcoded list:', err);
        setFlashDistricts(MAHARASHTRA_DISTRICTS);
      });
  }, []);

  // Flash typeahead filter
  const handleFlashQuery = (val: string) => {
    setFlashQuery(val);
    setFlashSelectedDistrict('');
    setFlashResult(null);
    setFlashError(null);
    if (val.trim().length === 0) {
      setFlashSuggestions([]);
    } else {
      setFlashSuggestions(
        flashDistricts.filter(d => d.toLowerCase().includes(val.toLowerCase())).slice(0, 6)
      );
    }
  };

  const selectFlashDistrict = (name: string) => {
    console.log('[Flash] District selected:', name);
    setFlashSelectedDistrict(name);
    setFlashQuery(name);
    setFlashSuggestions([]);
    setFlashResult(null);
    setFlashError(null);
  };

  const handleFlashPredict = async () => {
    if (!flashSelectedDistrict) return;
    setFlashLoading(true);
    setFlashError(null);
    setFlashResult(null);
    setFlashViewFull(false);
    console.log('[Flash] Requesting prediction. Body: { district:', flashSelectedDistrict, '}');
    try {
      const res = await fetch('/api/predict/tomorrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ district: flashSelectedDistrict }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log('[Flash] Received raw prediction response data:', data);
      if (data.error) throw new Error(data.error);
      console.log('[Flash] Setting result state with:', data);
      setFlashResult(data);
    } catch (e: any) {
      console.error('[Flash] Prediction fetch error:', e);
      setFlashError(e.message || 'Prediction failed');
    } finally {
      console.log('[Flash] Setting loading state to false. Current selected metric:', flashSelectedMetric);
      setFlashLoading(false);
    }
  };

  const FLASH_METRICS: { key: string; label: string }[] = [
    { key: 'meanTemp', label: 'Mean Temp' },
    { key: 'maxTemp', label: 'Max Temp' },
    { key: 'minTemp', label: 'Min Temp' },
    { key: 'humidity', label: 'Humidity' },
    { key: 'rainfall', label: 'Rainfall' },
    { key: 'pressure', label: 'Pressure' },
    { key: 'solarRadiation', label: 'Solar Rad' },
  ];

  const FLASH_FULL_LABELS: { key: string; label: string }[] = [
    { key: 'district', label: 'District' },
    { key: 'date', label: 'Date' },
    { key: 'meanTemp', label: 'Mean Temp' },
    { key: 'maxTemp', label: 'Max Temp' },
    { key: 'minTemp', label: 'Min Temp' },
    { key: 'humidity', label: 'Humidity' },
    { key: 'rainfall', label: 'Rainfall' },
    { key: 'pressure', label: 'Pressure' },
    { key: 'solarRadiation', label: 'Solar Radiation' },
  ];

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

      {/* Low-key, single-line alert banner */}
      <div className="z-30 bg-bg-surface/90 border-b border-border-default px-6 py-1.5 flex items-center gap-2 text-[10.5px] text-text-secondary backdrop-blur-md shrink-0 font-sans shadow-sm">
        <Info className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
        <span className="font-semibold">Live data currently available for Maharashtra only — other states show placeholder view (in development).</span>
      </div>

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
            level={level} onLevelChange={setLevel} isLeftPanelOpen={isLeftPanelOpen} isRightPanelOpen={isRightPanelOpen}
          />
        </div>

        {/* SIDEBAR LEFT: FLOATING ABOVE MAP */}
        {!isMissionControl && (
          <>
            <aside
              className="left-sidebar absolute left-0 top-0 w-[260px] bg-bg-surface/70 border border-l-0 border-t-0 border-border-default px-4 pt-4 pb-0 flex flex-col justify-between overflow-y-auto hide-scrollbar z-20 rounded-none rounded-r-2xl shadow-xl transition-transform duration-300 ease-in-out pointer-events-auto backdrop-blur-md font-sans"
              style={{
                height: 'calc(100vh - 71.75px - 36px)',
                transform: isLeftPanelOpen ? 'translateX(0)' : 'translateX(-100%)'
              }}
            >
              <div className="flex flex-col gap-5">
                {/* ── SUB-CONTAINER 1: PARAMETER VISUALS ── */}
                <div className="border border-[#0f172a]/10 rounded-md p-3.5">
                  <div className="flex flex-col gap-0.5 pb-2 mb-2 border-b border-[#0f172a]/10">
                    <span className="text-[11px] font-mono font-bold text-text-muted uppercase tracking-[0.15em]">Parameter Visuals</span>
                    <p className="text-[10px] text-text-secondary mt-0.5 font-mono">Select GIS weather telemetry</p>
                  </div>

                  <div className="flex flex-col gap-1">
                    {LAYERS_LIST.map((item) => {
                      const isActive = activeLayer === item.id;
                      const Icon = item.icon;

                      const LAYER_COLORS: Record<string, string> = {
                        temp: "#dc2626",
                        humidity: "#2563eb",
                        precip: "#0284c7",
                        solar: "#d97706",
                        pressure: "#7c3aed",
                      };
                      const color = LAYER_COLORS[item.id] ?? "#64748b";

                      const activeStyle: React.CSSProperties = isActive ? {
                        borderColor: color,
                        borderLeftWidth: "3px",
                        color: color,
                      } : {};

                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveLayer(item.id as WeatherLayer)}
                          className={`flex flex-row items-center justify-between w-full px-2.5 py-3.5 rounded-md text-left transition-all duration-150 cursor-pointer border ${isActive
                              ? "border bg-transparent"
                              : "border-[#0f172a]/[0.08] bg-[#0f172a]/[0.01] text-text-secondary hover:border-[#0f172a]/20 hover:text-text-primary"
                            }`}
                          style={activeStyle}
                        >
                          <div className="flex items-center gap-2">
                            <Icon
                              className="w-3.5 h-3.5 shrink-0"
                              style={isActive ? { color } : {}}
                            />
                            <span
                              className="text-[11px] parameter-label font-semibold uppercase tracking-wide"
                              style={isActive ? { color } : {}}
                            >{item.name}</span>
                          </div>
                          <span
                            className="text-[10px] font-mono tabular-nums"
                            style={isActive ? { color } : { color: 'var(--text-muted)' }}
                          >{item.unit}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── SUB-CONTAINER 2: WHAT-IF SIMULATOR ── */}
                <div className="border border-[#0f172a]/10 rounded-md p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-1.5 border-b border-[#0f172a]/10 pb-3">
                      <Settings className="w-3.5 h-3.5 text-accent-blue" />
                      <span className="text-[11px] font-mono font-bold tracking-[0.15em] uppercase">What-If Simulator</span>
                    </div>

                    <div className="flex flex-col gap-4 font-sans mt-2">
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] font-sans uppercase tracking-widest text-text-secondary">TEMP BIAS</span>
                          <span className="font-roboto text-[12px] font-bold tabular-nums" style={{ color: '#d97706' }}>
                            {params.tempOffset >= 0 ? `+${params.tempOffset.toFixed(1)}` : params.tempOffset.toFixed(1)}°C
                          </span>
                        </div>
                        <input
                          type="range" min="-5" max="5" step="0.5"
                          value={params.tempOffset}
                          onChange={(e) => setParams(prev => ({ ...prev, tempOffset: parseFloat(e.target.value) }))}
                          className="sim-slider w-full cursor-pointer"
                          style={{ '--slider-color': '#d97706' } as React.CSSProperties}
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[11px] font-sans uppercase tracking-widest text-text-secondary">RAIN VOLUME</span>
                          <span className="font-mono text-[12px] font-bold tabular-nums" style={{ color: '#0284c7' }}>
                            {params.rainIntensity}%
                          </span>
                        </div>
                        <input
                          type="range" min="0" max="250" step="10"
                          value={params.rainIntensity}
                          onChange={(e) => setParams(prev => ({ ...prev, rainIntensity: parseInt(e.target.value) }))}
                          className="sim-slider w-full cursor-pointer"
                          style={{ '--slider-color': '#0284c7' } as React.CSSProperties}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-3 font-sans mt-2">
                      <div className="flex gap-2">
                        <button
                          onClick={handleRecalculate}
                          disabled={isRecalculating}
                          className={`flex-1 text-[11px] uppercase tracking-wider py-1.5 font-black rounded-md transition-all duration-200 ${isRecalculating
                              ? "bg-bg-elevated text-text-muted border border-border-default"
                              : "bg-accent-blue hover:bg-blue-700 text-white cursor-pointer"
                            }`}
                        >
                          {isRecalculating ? "RUNNING..." : "Recalculate"}
                        </button>
                        <button
                          onClick={handleReset}
                          className="flex-1 py-1.5 bg-transparent border border-[#0f172a]/15 text-text-primary text-[11px] font-bold rounded-md uppercase tracking-wider hover:bg-[#0f172a]/05 transition-all cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSimulation(params);
                          window.dispatchEvent(new CustomEvent('trigger-report-tab'));
                        }}
                        className="w-full py-1.5 bg-transparent border border-[#0f172a]/15 text-text-primary text-[11px] font-bold rounded-md uppercase tracking-wider hover:bg-[#0f172a]/05 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                      >
                        <span>Synthesize Briefing</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[8px] text-text-secondary mt-6 flex flex-col gap-0.5 border-t border-border-default pt-3.5 uppercase font-mono">
                <span>SYSTEM STATUS: COMPLIANT</span>
                <span>SECURE INGRESS: ON</span>
              </div>
            </aside>
            <button
              onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
              className="absolute -translate-y-1/2 z-30 w-8 h-24 bg-bg-surface/70 border border-l-0 border-border-default rounded-r-2xl flex items-center justify-center cursor-pointer shadow-lg backdrop-blur-md text-text-primary hover:text-white hover:bg-accent-blue transition-all duration-300 ease-in-out pointer-events-auto text-[20px] font-black leading-none border-l-0"
              style={{
                left: isLeftPanelOpen ? '260px' : '0px',
                top: 'calc((100vh - 71.75px - 36px) / 2)'
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
              className="right-panel absolute right-0 top-0 w-[280px] bg-bg-surface/70 border border-r-0 border-t-0 border-border-default px-4 pt-4 pb-0 flex flex-col justify-between overflow-y-auto hide-scrollbar z-20 rounded-none rounded-l-2xl shadow-xl transition-transform duration-300 ease-in-out pointer-events-auto backdrop-blur-md"
              style={{
                height: 'calc(100vh - 71.75px - 36px)',
                transform: isRightPanelOpen ? 'translateX(0)' : 'translateX(100%)'
              }}
            >
              {/* 4 SEPARATE BORDERED SUB-CONTAINERS */}
              <div className="flex flex-col gap-5">

                {/* ── SUB-CONTAINER 1: FLASH PREDICTION ── */}
                <div className="border border-[#0f172a]/10 rounded-md p-3.5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-accent-blue shrink-0" />
                      <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-text-primary">Flash Prediction</span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={flashQuery}
                        onChange={e => handleFlashQuery(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && flashSuggestions.length > 0) selectFlashDistrict(flashSuggestions[0]);
                          if (e.key === 'Escape') setFlashSuggestions([]);
                        }}
                        placeholder="search district..."
                        className="w-full bg-transparent border border-[#0f172a]/12 rounded-md px-2.5 py-1.5 text-[11px] font-mono text-text-primary placeholder-text-muted focus:outline-none focus:border-[#0f172a]/30 transition-colors"
                      />
                      {flashSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-[#0f172a]/15 rounded-md shadow-lg z-[200] font-mono overflow-hidden">
                          {flashSuggestions.map(d => (
                            <button
                              key={d}
                              onMouseDown={e => { e.preventDefault(); selectFlashDistrict(d); }}
                              className="w-full text-left px-2.5 py-1.5 text-[11px] font-mono text-text-secondary hover:bg-[#0f172a]/05 hover:text-text-primary transition-colors cursor-pointer block"
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {FLASH_METRICS.map(m => {
                        const isMetricActive = flashSelectedMetric === m.key;
                        return (
                          <button
                            key={m.key}
                            onClick={() => setFlashSelectedMetric(m.key)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide transition-all cursor-pointer border ${isMetricActive
                                ? 'border-accent-blue text-accent-blue bg-transparent'
                                : 'border-[#0f172a]/10 text-text-muted bg-transparent hover:border-[#0f172a]/20 hover:text-text-secondary'
                              }`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleFlashPredict}
                      disabled={!flashSelectedDistrict || flashLoading}
                      className={`w-full py-1.5 rounded-md text-[11px] font-mono font-black uppercase tracking-wider transition-all duration-200 ${!flashSelectedDistrict || flashLoading
                          ? 'bg-[#0f172a]/05 border border-[#0f172a]/10 text-text-muted cursor-not-allowed'
                          : 'bg-accent-blue hover:bg-blue-700 text-white cursor-pointer active:scale-[0.98]'
                        }`}
                    >
                      {flashLoading ? '⟳ predicting...' : '⚡ predict'}
                    </button>

                    {flashError && (
                      <div className="text-[10px] font-mono text-red-500 border border-red-400/20 rounded-md px-2 py-1.5">
                        ⚠ {flashError}
                      </div>
                    )}

                    {flashResult && !flashError && (() => {
                      const metricLabel = FLASH_METRICS.find(m => m.key === flashSelectedMetric)?.label || flashSelectedMetric;
                      const value = flashResult[flashSelectedMetric] || '—';
                      return (
                        <div className="flex flex-col gap-1.5">
                          <div className="border border-[#0f172a]/10 rounded-md px-2.5 py-2 flex flex-col gap-0.5">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">TOMORROW · {flashResult.date}</span>
                            <span className="text-[11px] font-mono font-bold text-text-primary">{flashResult.district}</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-[10px] font-mono text-text-muted uppercase">{metricLabel}:</span>
                              <span className="text-[18px] font-mono font-black text-accent-blue leading-none">{value}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setFlashViewFull(v => !v)}
                            className="text-[10px] font-mono text-text-secondary hover:text-text-primary transition-colors uppercase tracking-wider cursor-pointer text-left flex items-center gap-1"
                          >
                            <ChevronDown className={`w-3 h-3 transition-transform ${flashViewFull ? 'rotate-180' : ''}`} />
                            {flashViewFull ? 'hide full data' : 'view full data'}
                          </button>
                          {flashViewFull && (
                            <div className="border border-[#0f172a]/08 rounded-md px-2.5 py-2 flex flex-col gap-1">
                              {FLASH_FULL_LABELS.map(({ key, label }) => (
                                <div key={key} className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono text-text-muted uppercase">{label}</span>
                                  <span className="text-[10px] font-mono font-bold text-text-primary">{flashResult[key] || '—'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* ── SUB-CONTAINER 2: SURFACE ANALYSIS ── */}
                <div className="border border-[#0f172a]/10 rounded-md p-3.5">
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-text-primary">Surface Analysis</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase text-text-muted mb-0.5">LST · Land</p>
                        <p className="text-[16px] font-mono font-bold tabular-nums" style={{ color: '#d97706' }}>{computedLST}°C</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase text-text-muted mb-0.5">SST · Sea</p>
                        <p className="text-[16px] font-mono font-bold tabular-nums text-accent-cyan">{computedSST}°C</p>
                      </div>
                    </div>
                    <div className="h-8 w-full">
                      <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 32">
                        <polyline
                          points={sparklineValues.map((val, i) => `${(i / (sparklineValues.length - 1)) * 100},${32 - (val / 45) * 28}`).join(' ')}
                          fill="none"
                          stroke="var(--accent-blue)"
                          strokeWidth="1"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ── SUB-CONTAINER 3: LAYER FEED ── */}
                <div className="border border-[#0f172a]/10 rounded-md p-3.5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-text-primary">
                        {activeLayer === 'solar' ? 'Solar Rad Feed' : `${activeLayer.toUpperCase()} Feed`}
                      </span>
                      <span
                        className="inline-block w-2 h-2 rounded-[2px]"
                        style={{ backgroundColor: '#0284c7' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1 font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase text-text-muted">Sensor Source</span>
                        <span className="text-[11px] font-mono font-bold text-text-primary">
                          {activeTelemetry ? "MET-NET LIVE" : getLiveMosdacMetric(activeLayer, params.tempOffset, params.rainIntensity).label}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-mono uppercase text-text-muted">Metric Value</span>
                        <span className="text-[13px] font-mono font-black text-text-primary tabular-nums">
                          {getCurrentTelemetryVal(activeTelemetry, activeLayer) || getLiveMosdacMetric(activeLayer, params.tempOffset, params.rainIntensity).val}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-text-muted uppercase mt-0.5">
                        {activeTelemetry ? "STREAM COMPLIANT OK" : getLiveMosdacMetric(activeLayer, params.tempOffset, params.rainIntensity).status}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── SUB-CONTAINER 4: RADAR CHANNELS ── */}
                <div className="border border-[#0f172a]/10 rounded-md p-3.5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-text-primary">Radar Channels</span>
                      <span
                        className="inline-block w-2 h-2 rounded-[2px]"
                        style={{ backgroundColor: '#15803d' }}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-mono text-text-secondary">IMD-RADAR-4</span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: '#15803d' }}>ACTIVE OK</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-mono text-text-secondary">SATELLITE-7B</span>
                        <span className="text-[10px] font-mono font-bold" style={{ color: '#15803d' }}>ACTIVE OK</span>
                      </div>
                    </div>
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
              className="absolute -translate-y-1/2 z-30 w-8 h-24 bg-bg-surface/70 border border-r-0 border-border-default rounded-l-2xl flex items-center justify-center cursor-pointer shadow-lg backdrop-blur-md text-text-primary hover:text-white hover:bg-accent-blue transition-all duration-300 ease-in-out pointer-events-auto text-[20px] font-black leading-none border-r-0"
              style={{
                right: isRightPanelOpen ? '280px' : '0px',
                top: 'calc((100vh - 71.75px - 36px) / 2)'
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
                  setIsTimelineExpanded(true);
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
