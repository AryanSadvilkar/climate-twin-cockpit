import { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as d3 from "d3";
import { SimulationParams, WeatherLayer } from "../types";
import { useClimateData, fetchAllStatesData } from "../hooks/useClimateData";
import { useTelemetry } from "../context/TelemetryContext";
import { fetchStateTelemetry, interpolateValue } from "../utils/dataBridge";
import { fetchStateHistoricalData, trainAndForecast } from "../utils/aiForecasting";
import AgricultureView from "./AgricultureView";
import { Sun, CloudRain, CloudSun, CloudLightning } from "lucide-react";

export type MapLevel = 'india' | 'state' | 'district';

export interface StateClimate {
  state: string;
  rain: number;
  temp: number;
  solar: number;
  wind: number;
  pressure: number;
  humidity: number;
}

const INDIA_STATES_URL = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';
const INDIA_DISTRICTS_URL = '/maharashtra.geojson';

let globalStateGeoJSON: any = null;
let globalDistrictGeoJSON: any = null;

const FORECAST_DISTRICT_MAP: Record<string, string> = {
  'Ahmadnagar': 'Ahmednagar',
  'Bid': 'Beed',
  'Buldana': 'Buldhana',
  'Gondiya': 'Gondia',
  'Raigarh': 'Raigad'
};

export const getDisplayDistrictName = (rawName: string) => FORECAST_DISTRICT_MAP[rawName] || rawName;

export const STATE_DATA: Record<string, {rain:number,temp:number,solar:number,wind:number,pressure:number,humidity:number}> = {
  'Andhra Pradesh':    {rain:88, temp:36.2,solar:780,wind:18,pressure:1008,humidity:72},
  'Arunachal Pradesh':{rain:180,temp:18.4,solar:480,wind:12,pressure:1012,humidity:88},
  'Assam':            {rain:220,temp:28.1,solar:500,wind:15,pressure:1010,humidity:90},
  'Bihar':            {rain:62, temp:34.8,solar:650,wind:14,pressure:1006,humidity:68},
  'Chhattisgarh':     {rain:110,temp:35.1,solar:680,wind:16,pressure:1007,humidity:75},
  'Delhi':            {rain:18, temp:41.2,solar:880,wind:22,pressure:1002,humidity:35},
  'Goa':              {rain:290,temp:30.2,solar:450,wind:28,pressure:1009,humidity:92},
  'Gujarat':          {rain:38, temp:36.4,solar:820,wind:20,pressure:1005,humidity:55},
  'Haryana':          {rain:22, temp:38.5,solar:810,wind:19,pressure:1003,humidity:38},
  'Himachal Pradesh': {rain:35, temp:14.2,solar:550,wind:25,pressure:1015,humidity:65},
  'Jammu and Kashmir':{rain:12, temp:8.4, solar:500,wind:30,pressure:1018,humidity:55},
  'Jharkhand':        {rain:75, temp:33.4,solar:720,wind:13,pressure:1007,humidity:70},
  'Karnataka':        {rain:115,temp:32.1,solar:740,wind:22,pressure:1009,humidity:78},
  'Kerala':           {rain:312,temp:29.8,solar:400,wind:32,pressure:1010,humidity:95},
  'Madhya Pradesh':   {rain:55, temp:39.2,solar:840,wind:17,pressure:1004,humidity:48},
  'Maharashtra':      {rain:95, temp:33.5,solar:710,wind:20,pressure:1007,humidity:70},
  'Manipur':          {rain:150,temp:25.4,solar:580,wind:11,pressure:1012,humidity:85},
  'Meghalaya':        {rain:260,temp:22.8,solar:420,wind:14,pressure:1011,humidity:92},
  'Mizoram':          {rain:175,temp:24.2,solar:560,wind:12,pressure:1012,humidity:88},
  'Nagaland':         {rain:165,temp:22.4,solar:540,wind:13,pressure:1012,humidity:86},
  'Odisha':           {rain:145,temp:34.2,solar:690,wind:18,pressure:1007,humidity:76},
  'Punjab':           {rain:28, temp:32.8,solar:790,wind:16,pressure:1004,humidity:42},
  'Rajasthan':        {rain:8,  temp:42.4,solar:950,wind:24,pressure:1001,humidity:22},
  'Sikkim':           {rain:190,temp:15.2,solar:460,wind:18,pressure:1014,humidity:88},
  'Tamil Nadu':       {rain:82, temp:34.4,solar:750,wind:21,pressure:1008,humidity:74},
  'Telangana':        {rain:72, temp:37.2,solar:780,wind:18,pressure:1005,humidity:60},
  'Tripura':          {rain:155,temp:28.4,solar:590,wind:12,pressure:1011,humidity:84},
  'Uttar Pradesh':    {rain:45, temp:37.4,solar:730,wind:15,pressure:1004,humidity:45},
  'Uttarakhand':      {rain:68, temp:18.2,solar:520,wind:28,pressure:1015,humidity:70},
  'West Bengal':      {rain:155,temp:32.4,solar:680,wind:16,pressure:1008,humidity:80},
};

export const STATE_CLIMATE_DATA: StateClimate[] = Object.keys(STATE_DATA).map(key => ({
  state: key,
  ...STATE_DATA[key]
}));

const normalizeStateName = (name: string) => {
  const map: Record<string,string> = {
    'orissa': 'odisha',
    'uttaranchal': 'uttarakhand',
    'pondicherry': 'puducherry',
    'dadra & nagar haveli': 'dadra and nagar haveli',
    'jammu & kashmir': 'jammu and kashmir',
  };
  const lower = name.toLowerCase().trim();
  return map[lower] || lower;
};

// Simplify coordinates to reduce render weight
function simplify(geojson: any) {
  if (!geojson || !geojson.features) return geojson;
  const clone = JSON.parse(JSON.stringify(geojson));
  clone.features.forEach((f: any) => {
    if (!f.geometry || !f.geometry.coordinates) return;
    const simplifyCoords = (coords: any[]): any[] => {
      if (typeof coords[0] === 'number') {
        return [Math.round(coords[0] * 100) / 100, Math.round(coords[1] * 100) / 100];
      }
      return coords.map(simplifyCoords);
    };
    f.geometry.coordinates = simplifyCoords(f.geometry.coordinates);
  });
  return clone;
}

interface MapViewProps {
  mode: "dashboard" | "standalone";
  activeLayerId: WeatherLayer;
  setActiveLayerId: (layer: WeatherLayer) => void;
  simulation: SimulationParams;
  activeTimeIndex: number;
  setActiveTimeIndex: (idx: number) => void;
  onZoomChange?: (scale: number) => void;
  level: MapLevel;
  onLevelChange: (level: MapLevel) => void;
  isLeftPanelOpen?: boolean;
  isRightPanelOpen?: boolean;
}

// Dynamic Legend component styled with glassmorphism
const Legend = ({ activeLayerId, isLeftPanelOpen = true, dynamicTempRange }: { activeLayerId: WeatherLayer; isLeftPanelOpen?: boolean, dynamicTempRange?: {min: number, max: number} | null }) => {
  const config = useMemo(() => {
    switch (activeLayerId) {
      case "temp":
        if (dynamicTempRange) {
          const { min, max } = dynamicTempRange;
          const steps = 6;
          const stepSize = (max - min) / (steps - 1);
          const ticks = Array.from({length: steps}).map((_, i) => {
            const v = Math.round(min + (i * stepSize));
            if (i === 0) return `< ${v}°C`;
            if (i === steps - 1) return `> ${v}°C`;
            return `${v}°C`;
          });
          return {
            title: "TEMPERATURE",
            ticks,
            gradient: "linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444, #7f1d1d)"
          };
        }
        return {
          title: "TEMPERATURE",
          ticks: ["< 20°C", "23°C", "26°C", "29°C", "32°C", "> 35°C"],
          gradient: "linear-gradient(to right, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444, #7f1d1d)"
        };
      case "humidity":
        return {
          title: "RELATIVE HUMIDITY",
          ticks: ["0%", "40%", "70%", "100%"],
          gradient: "linear-gradient(to right, #ef4444, #eab308, #3b82f6)"
        };
      case "precip":
        return {
          title: "PRECIPITATION",
          ticks: ["0mm", "Low", "High"],
          gradient: "linear-gradient(to right, #cbd5e1, #22c55e, #1e3a8a)"
        };
      case "wind":
        return {
          title: "WIND SPEED",
          ticks: ["0 km/h", "15 km/h", "30 km/h", "50 km/h+"],
          gradient: "linear-gradient(to right, #ecfdf5, #34d399, #059669, #7c3aed)"
        };
      case "solar":
        return {
          title: "SOLAR RADIATION",
          ticks: ["100 W/m²", "400 W/m²", "700 W/m²", "1000 W/m²+"],
          gradient: "linear-gradient(to right, #fff7ed, #fed7aa, #f97316, #ea580c)"
        };
      case "pressure":
        return {
          title: "SURFACE PRESSURE",
          ticks: ["990 hPa", "1005 hPa", "1020 hPa+"],
          gradient: "linear-gradient(to right, #8b5cf6, #cbd5e1, #f43f5e)"
        };
      default:
        return null;
    }
  }, [activeLayerId, dynamicTempRange]);

  if (!config) return null;

  return (
    <div 
      className="absolute z-[1000] panel-card bg-bg-surface border border-border-default p-3 rounded-xl shadow-lg w-52 font-mono text-[9px] select-none flex flex-col gap-2 pointer-events-auto transition-all duration-300 ease-in-out"
      style={{
        bottom: '150px',
        left: isLeftPanelOpen ? '290px' : '20px'
      }}
    >
      <div className="font-sans font-bold text-text-primary uppercase tracking-wider">{config.title}</div>
      <div className="h-2 w-full rounded-full" style={{ background: config.gradient }} />
      <div className="flex justify-between text-text-secondary text-[8px] font-bold">
        {config.ticks.map(t => <span key={t}>{t}</span>)}
      </div>
    </div>
  );
};

// React state tooltip type
interface HoveredRegion {
  name: string;
  feature: any;
  x: number;
  y: number;
  temp: string;
  rain: string;
  humid: string;
  solar: string;
  alertLevel: string;
}

// Two-mode map: 'india' shows all states, 'state' shows districts of one state
type MapMode = 'india' | 'state';

const INDIA_BOUNDS: L.LatLngBoundsExpression = [[6.4, 68.1], [37.6, 97.4]];

const MapViewComponent = forwardRef<any, MapViewProps>((
  {
    activeLayerId,
    simulation,
    activeTimeIndex,
    onZoomChange,
    level: externalLevel,
    onLevelChange: externalOnLevelChange,
    isLeftPanelOpen,
    isRightPanelOpen
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  // Separate layer refs for the two modes
  const indiaLayerRef = useRef<L.GeoJSON | null>(null);
  const districtLayerRef = useRef<L.GeoJSON | null>(null);

  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(!globalStateGeoJSON);
  const [errorStatus, setErrorStatus] = useState(false);
  // Two-mode state
  const [mapMode, setMapMode] = useState<MapMode>('india');
  // React-state cursor tooltip — no imperative DOM mutations
  const [hoveredRegion, setHoveredRegion] = useState<HoveredRegion | null>(null);

  // Fallback state if parent does not control level
  const [internalLevel, setInternalLevel] = useState<MapLevel>('india');
  const level = externalLevel || internalLevel;
  const setLevel = externalOnLevelChange || setInternalLevel;

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('FORECAST');

  const statesGeoRef = useRef<any>(globalStateGeoJSON);
  const districtsGeoRef = useRef<any>(globalDistrictGeoJSON);
  const forecastDataRef = useRef<any>(null);
  const districtWeatherCache = useRef<Record<string, any>>({});

  useEffect(() => {
    fetch('http://localhost:3000/api/forecast/weekly')
      .then(res => res.json())
      .then(data => { forecastDataRef.current = data; })
      .catch(err => console.error("Forecast fetch error", err));
  }, []);

  const layerRefs = useRef<Record<string, any>>({});
  const dynamicStateRef = useRef({
    selectedDistrict,
    districtStyle: null as any,
    stateStyle: null as any
  });

  const fetchDistrictWeather = async (districtName: string, pathLayer: any) => {
    if (districtWeatherCache.current[districtName]) {
      const data = districtWeatherCache.current[districtName];
      const tempRaw = data.current.temperature_2m;
      const humidRaw = data.current.relative_humidity_2m;
      const rainRaw = data.daily.precipitation_sum[0];
      const tempNorm = Math.max(0, Math.min(1, (tempRaw - 20) / 25));
      const humidNorm = 1 - Math.max(0, Math.min(1, humidRaw / 100));
      const cropStress = Math.round(((tempNorm + humidNorm) / 2) * 100);
      const floodRisk = Math.round(Math.max(0, Math.min(1, rainRaw / 200)) * 100);

      setHoveredRegion(prev => prev?.name === districtName ? {
        ...prev,
        temp: `${Math.round(tempRaw)}°C`,
        humid: `${Math.round(humidRaw)}%`,
        rain: `${rainRaw}mm`,
        cropStress,
        floodRisk,
        isLoading: false,
        alertLevel: (tempRaw > 40 || rainRaw > 150) ? "RED" : (tempRaw > 35 || rainRaw > 100) ? "ORANGE" : "GREEN"
      } : prev);
      return;
    }

    setHoveredRegion(prev => prev?.name === districtName ? {
      ...prev,
      temp: "--",
      humid: "--",
      rain: "--",
      cropStress: 0,
      floodRisk: 0,
      isLoading: true,
      alertLevel: "LOADING"
    } : prev);

    try {
      const center = pathLayer.getBounds().getCenter();
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,surface_pressure&hourly=temperature_2m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max&timezone=Asia/Kolkata`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      
      districtWeatherCache.current[districtName] = data;

      const tempRaw = data.current.temperature_2m;
      const humidRaw = data.current.relative_humidity_2m;
      const rainRaw = data.daily.precipitation_sum[0];
      const tempNorm = Math.max(0, Math.min(1, (tempRaw - 20) / 25));
      const humidNorm = 1 - Math.max(0, Math.min(1, humidRaw / 100));
      const cropStress = Math.round(((tempNorm + humidNorm) / 2) * 100);
      const floodRisk = Math.round(Math.max(0, Math.min(1, rainRaw / 200)) * 100);

      setHoveredRegion(prev => prev?.name === districtName ? {
        ...prev,
        temp: `${Math.round(tempRaw)}°C`,
        humid: `${Math.round(humidRaw)}%`,
        rain: `${rainRaw}mm`,
        cropStress,
        floodRisk,
        isLoading: false,
        alertLevel: (tempRaw > 40 || rainRaw > 150) ? "RED" : (tempRaw > 35 || rainRaw > 100) ? "ORANGE" : "GREEN"
      } : prev);
    } catch (e) {
      console.error("Open-Meteo fetch error:", e);
      setHoveredRegion(prev => prev?.name === districtName ? {
        ...prev,
        temp: "Err",
        humid: "Err",
        rain: "Err",
        isLoading: false,
        alertLevel: "GREEN"
      } : prev);
    }
  };


  const {
    selectedCoords,
    setSelectedCoords,
    setSelectedName,
    activeTelemetry,
    setActiveTelemetry,
    allStatesTelemetry,
    setAllStatesTelemetry
  } = useTelemetry();

  useEffect(() => {
    fetchAllStatesData((stateName, data) => {
      setAllStatesTelemetry((prev: any) => ({
        ...prev,
        [stateName]: data
      }));
    });
  }, [setAllStatesTelemetry]);

  const [stateTelemetryValue, setStateTelemetryValue] = useState<number | null>(null);
  const [aiForecastPredictions, setAiForecastPredictions] = useState<number[]>([]);

  const {
    data: activeTelemetryData
  } = useClimateData(
    selectedCoords ? selectedCoords.lat : null,
    selectedCoords ? selectedCoords.lon : null
  );

  // Global ESC Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (level === 'district') {
          // First ESC: close district detail panel
          handleBackToState();
        } else if (mapMode === 'state') {
          // Second ESC (or if panel is already closed): reset map zoom and UI state to India
          handleBackToIndia();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [level, mapMode]);

  useEffect(() => {
    if (activeTelemetryData) {
      setActiveTelemetry(activeTelemetryData);
    }
  }, [activeTelemetryData, setActiveTelemetry]);

  // Backward compatible ref handlers
  useImperativeHandle(ref, () => ({
    zoomIn: () => mapInstanceRef.current?.zoomIn(),
    zoomOut: () => mapInstanceRef.current?.zoomOut(),
    resetZoom: () => handleBackToIndia()
  }));

  // Fetch coordinates on mount and simplify geojson
  useEffect(() => {
    if (statesGeoRef.current && districtsGeoRef.current) {
      setDataLoaded(true);
      return;
    }
    const loadGeoData = async () => {
      try {
        setLoading(true);
        const [resState, resDist] = await Promise.all([
          fetch(INDIA_STATES_URL),
          fetch(INDIA_DISTRICTS_URL)
        ]);

        if (!resState.ok || !resDist.ok) throw new Error("Vector databases error");

        const [sRaw, dRaw] = await Promise.all([resState.json(), resDist.json()]);

        const sSimple = simplify(sRaw);
        const dSimple = simplify(dRaw);

        globalStateGeoJSON = sSimple;
        globalDistrictGeoJSON = dSimple;

        statesGeoRef.current = sSimple;
        districtsGeoRef.current = dSimple;
        setDataLoaded(true);
      } catch (err) {
        console.error(err);
        setErrorStatus(true);
      } finally {
        setLoading(false);
      }
    };
    loadGeoData();
  }, []);

  // Utility: lock maxBounds to current view after a fitBounds animation settles
  const lockBoundsAfterMove = (paddingFactor = 0.15) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.once('moveend', () => {
      const locked = map.getBounds().pad(paddingFactor);
      map.setMaxBounds(locked);
    });
  };

  // Initialize Leaflet map with zoomSnap for smooth feel
  useEffect(() => {
    if (loading) return;
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const container = mapContainerRef.current as any;
    if (container._leaflet_id) return;

    const map = L.map(container, {
      center: [19.7515, 75.7139], // Maharashtra center
      zoom: 7,
      zoomSnap: 0.1,
      minZoom: 4.5,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      touchZoom: true,
      boxZoom: true,
      maxBounds: INDIA_BOUNDS,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });

    // Add muted basemap for geographic context outside the GeoJSON shapes
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      className: 'muted-context-basemap'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Initial size sync then fit India
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(INDIA_BOUNDS);
      lockBoundsAfterMove(0.1);
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        indiaLayerRef.current = null;
        districtLayerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, dataLoaded]);

  // Recalculate size when layout shifts (panel opens, split-view)
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 350);
    return () => clearTimeout(timer);
  }, [level, mapMode]);

  // Color scales with high color saturation and opacity
  const getColor = (val: number) => {
    switch (activeLayerId) {
      case "temp":
        if (dynamicTempRange) {
          const colors = ["#3b82f6", "#06b6d4", "#22c55e", "#eab308", "#f97316", "#ef4444", "#7f1d1d"];
          return d3.scaleLinear<string>()
            .domain(colors.map((_, i) => dynamicTempRange.min + i * (dynamicTempRange.max - dynamicTempRange.min) / (colors.length - 1)))
            .range(colors)(val);
        }
        if (val < 20) return "#3b82f6";
        if (val < 23) return "#06b6d4";
        if (val < 26) return "#22c55e";
        if (val < 29) return "#eab308";
        if (val < 32) return "#f97316";
        if (val <= 35) return "#ef4444";
        return "#7f1d1d";
      case "humidity":
        if (val <= 40) return "#ef4444";
        if (val <= 70) return "#eab308";
        return "#3b82f6";
      case "precip": {
        let maxP = 50; // Fallback max
        if (mapMode === 'india' && statesGeoRef.current) {
          let max = 0;
          statesGeoRef.current.features.forEach((f: any) => {
            const rawName = f.properties.st_nm || f.properties.ST_NM || f.properties.NAME_1;
            const v = getStateValue(rawName);
            if (v !== null && v > max) max = v;
          });
          if (max > 0) maxP = max;
        } else if (mapMode === 'state' && districtsGeoRef.current && selectedState) {
          let max = 0;
          districtsGeoRef.current.features.forEach((f: any) => {
            const rawName = f.properties.DISTRICT || f.properties.dtname || f.properties.NAME_2 || f.properties.NAME || '';
            const v = getDistrictValue(rawName, selectedState, f);
            if (v !== null && v > max) max = v;
          });
          if (max > 0) maxP = max;
        }
        return d3.scaleLinear<string>()
          .domain([0, maxP / 2, maxP])
          .range(["#cbd5e1", "#22c55e", "#1e3a8a"])(val);
      }
      case "wind":
        return d3.scaleLinear<string>()
          .domain([0, 10, 25, 50])
          .range(["#ecfdf5", "#34d399", "#059669", "#7c3aed"])(val);
      case "solar":
        return d3.scaleLinear<string>()
          .domain([100, 400, 700, 1000])
          .range(["#fff7ed", "#fed7aa", "#f97316", "#ea580c"])(val);
      case "pressure":
        return d3.scaleLinear<string>()
          .domain([990, 1005, 1020])
          .range(["#8b5cf6", "#cbd5e1", "#f43f5e"])(val);
      default:
        return "#cbd5e1";
    }
  };

  const getStateValue = (stateName: string): number => {
    const norm = normalizeStateName(stateName);
    const cleanS = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
    const climate = cleanS ? STATE_DATA[cleanS] : null;
    if (!climate) return 25;

    let hash = 0;
    for (let i = 0; i < stateName.length; i++) {
      hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const timeFactor = activeTimeIndex * 0.25; 
    const dynamicOffset = Math.sin(hash + activeTimeIndex) * 2.0;

    let base = 25;
    if (activeLayerId === "temp") {
      base = climate.temp + (simulation.tempOffset * (1 + timeFactor)) + dynamicOffset;
    } else if (activeLayerId === "precip") {
      base = climate.rain * (simulation.rainIntensity / 100) * (1 + (Math.cos(hash + timeFactor) * 0.15));
    } else if (activeLayerId === "wind") {
      base = climate.wind * (1 + (activeTimeIndex * 0.1)) + Math.abs(dynamicOffset);
    } else if (activeLayerId === "pressure") {
      base = climate.pressure - (activeTimeIndex * 2) + dynamicOffset;
    } else if (activeLayerId === "humidity") {
      base = Math.max(10, Math.min(100, climate.humidity + (simulation.tempOffset * -3 * activeTimeIndex)));
    } else if (activeLayerId === "solar") {
      base = climate.solar * (1 - (simulation.tempOffset * 0.02 * activeTimeIndex));
    }
    return Number(base.toFixed(1));
  };

  const getDistrictValue = (distName: string, stateName: string, feature?: any): number | null => {
    // Forecast Logic for Future Times
    if (activeTimeIndex > 0) {
      if (!forecastDataRef.current) return null;
      
      const forecastKey = FORECAST_DISTRICT_MAP[distName] || distName;
      const districtForecast = forecastDataRef.current[forecastKey];
      if (!districtForecast) return null;
      
      // TIMELINE_STEPS = ["Today", "+24h", "+72h", "+7d"]
      let dayIndex = 0;
      if (activeTimeIndex === 1) dayIndex = 0; // next day
      else if (activeTimeIndex === 2) dayIndex = 2; // +3 days
      else if (activeTimeIndex === 3) dayIndex = 6; // +7 days
      
      const dayData = districtForecast[dayIndex];
      if (!dayData) return null;
      
      let baseVal;
      if (activeLayerId === 'temp') baseVal = dayData.T2M;
      else if (activeLayerId === 'precip') baseVal = dayData.PRECTOTCORR;
      else if (activeLayerId === 'humidity') baseVal = dayData.RH2M;
      else if (activeLayerId === 'solar') baseVal = dayData.ALLSKY_SFC_SW_DWN;
      else if (activeLayerId === 'pressure') baseVal = dayData.PS;
      else return null;

      // Apply simulation offsets if active
      if (activeLayerId === 'temp') return Number((baseVal + simulation.tempOffset).toFixed(1));
      if (activeLayerId === 'precip') return Number((baseVal * (simulation.rainIntensity / 100)).toFixed(1));
      if (activeLayerId === 'humidity') return Number(Math.max(10, Math.min(100, baseVal + (simulation.tempOffset * -3))).toFixed(1));
      
      return Number(baseVal.toFixed(1));
    }

    // Existing Open-Meteo Logic for Today
    const cached = districtWeatherCache.current[distName];
    if (cached && cached.current) {
      let baseVal;
      if (activeLayerId === 'temp') baseVal = cached.current.temperature_2m;
      else if (activeLayerId === 'precip') baseVal = cached.daily.precipitation_sum[0];
      else if (activeLayerId === 'humidity') baseVal = cached.current.relative_humidity_2m;
      else return null;

      // Apply simulation offsets if active
      if (activeLayerId === 'temp') return Number((baseVal + simulation.tempOffset).toFixed(1));
      if (activeLayerId === 'precip') return Number((baseVal * (simulation.rainIntensity / 100)).toFixed(1));
      if (activeLayerId === 'humidity') return Number(Math.max(10, Math.min(100, baseVal + (simulation.tempOffset * -3))).toFixed(1));
      
      return Number(baseVal.toFixed(1));
    }
    // Return null if real data hasn't loaded yet to trigger the #cbd5e1 grey fallback
    return null;
  };

  const dynamicTempRange = useMemo(() => {
    if (activeLayerId !== 'temp') return null;
    let min = Infinity;
    let max = -Infinity;

    if (mapMode === 'india' && statesGeoRef.current) {
      statesGeoRef.current.features.forEach((f: any) => {
        const rawName = f.properties.st_nm || f.properties.ST_NM || f.properties.NAME_1;
        const val = getStateValue(rawName);
        if (val !== null) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    } else if (mapMode === 'state' && districtsGeoRef.current && selectedState) {
      districtsGeoRef.current.features.forEach((f: any) => {
        const rawName = f.properties.DISTRICT || f.properties.dtname || f.properties.NAME_2 || f.properties.NAME || '';
        const val = getDistrictValue(rawName, selectedState, f);
        if (val !== null) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    }
    
    if (min === Infinity || max === -Infinity) return { min: 20, max: 40 };
    return { min: Math.floor(min), max: Math.ceil(max) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode, activeLayerId, activeTimeIndex, simulation, selectedState, dataLoaded]);

  // --- MODE TRANSITIONS ---

  // Drill into a state: swap India layer → district layer, lock bounds to state
  const handleStateClick = (stateName: string, clickedLayer?: L.Layer) => {
    setActiveTelemetry(null);
    setSelectedState(stateName);
    setSelectedName(stateName);
    setMapMode('state');
    setLevel('state');
    setStateTelemetryValue(null);
    setHoveredRegion(null);
    setSelectedDistrict(null);

    window.dispatchEvent(new CustomEvent('region-select-update', { detail: stateName }));

    const norm = normalizeStateName(stateName);
    const feature = statesGeoRef.current?.features.find(
      (f: any) => normalizeStateName(f.properties.NAME_1 || f.properties.ST_NM || '') === norm
    );

    if (feature) {
      const centroid = d3.geoCentroid(feature);
      setSelectedCoords({ lat: centroid[1], lon: centroid[0] });

      fetchStateTelemetry(centroid[1], centroid[0]).then((val) => setStateTelemetryValue(val));

      setAiForecastPredictions([]);
      fetchStateHistoricalData(centroid[1], centroid[0]).then((history) => {
        if (history && history.length > 0) {
          const predictions = [0, 1, 3, 7].map(o => trainAndForecast(history, o));
          setAiForecastPredictions(predictions);
        }
      });
    }

    // Layer swap + fitBounds after 350ms to avoid resize jitter
    const timer = setTimeout(() => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Hide India layer
      if (indiaLayerRef.current) map.removeLayer(indiaLayerRef.current);

      // Build district layer for this state only
      let distFeatures = districtsGeoRef.current?.features.filter((f: any) => {
        const sp = f.properties.ST_NM || f.properties.STATE || f.properties.st_nm || f.properties.NAME_1 || '';
        return sp.toLowerCase() === stateName.toLowerCase() ||
               normalizeStateName(sp) === normalizeStateName(stateName);
      }) || [];

      // Fallback: If no districts are found, use the state outline itself as a single feature
      if (distFeatures.length === 0 && statesGeoRef.current) {
        const stateOutline = statesGeoRef.current.features.find((f: any) => {
          const sp = f.properties.NAME_1 || f.properties.ST_NM || f.properties.STATE || '';
          return sp.toLowerCase() === stateName.toLowerCase() ||
                 normalizeStateName(sp) === normalizeStateName(stateName);
        });
        if (stateOutline) {
          const clonedFeature = JSON.parse(JSON.stringify(stateOutline));
          // Use state name as district name placeholder
          clonedFeature.properties.DISTRICT = stateOutline.properties.NAME_1 || stateOutline.properties.ST_NM || stateOutline.properties.STATE || stateName;
          distFeatures = [clonedFeature];
        }
      }

      if (districtLayerRef.current) map.removeLayer(districtLayerRef.current);

      const dLayer = buildDistrictLayer(distFeatures, stateName);
      dLayer.addTo(map);
      districtLayerRef.current = dLayer;

      // fitBounds to district layer with animation
      map.invalidateSize();
      const bounds = dLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
        // Lock maxBounds to this state after animation settles
        map.once('moveend', () => {
          map.setMaxBounds(map.getBounds().pad(0.3));
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  };

  const handleDistrictClick = (districtName: string) => {
    setActiveTelemetry(null);
    setSelectedDistrict(districtName);
    setSelectedName(`${getDisplayDistrictName(districtName)}, ${selectedState}`);
    setLevel('district');
    setHoveredRegion(null);

    const feature = districtsGeoRef.current?.features.find((f: any) => {
      const dProp = f.properties.DISTRICT || f.properties.dtname || f.properties.NAME_2 || f.properties.NAME || '';
      const sProp = f.properties.ST_NM || f.properties.STATE || f.properties.st_nm || f.properties.NAME_1 || '';
      return dProp.toLowerCase() === districtName.toLowerCase() &&
             (sProp.toLowerCase() === selectedState?.toLowerCase() ||
              normalizeStateName(sProp) === normalizeStateName(selectedState || ''));
    });
    if (feature) {
      const centroid = d3.geoCentroid(feature);
      setSelectedCoords({ lat: centroid[1], lon: centroid[0] });
    }
    // Highlight the selected district via style update
    if (districtLayerRef.current) {
      let selectedLayer: any = null;
      districtLayerRef.current.eachLayer((l: any) => {
        if (!l.feature) return;
        const n = l.feature.properties.DISTRICT || l.feature.properties.dtname || l.feature.properties.NAME_2 || l.feature.properties.NAME || '';
        const isSel = n === districtName;
        const s = districtStyle(l.feature, isSel, districtName);
        l.feature.properties._originalStyle = s;
        l.setStyle(s);
        if (isSel && !L.Browser.ie) {
          l.bringToFront();
          selectedLayer = l;
        }
      });
      // Pan/zoom map to center district in the visible left-half map area
      if (selectedLayer && mapInstanceRef.current) {
        mapInstanceRef.current.fitBounds(selectedLayer.getBounds(), {
          paddingTopLeft: [300, 60],
          paddingBottomRight: [60, 60],
          maxZoom: 9,
          animate: true,
          duration: 0.4
        });
      }
    }
  };

  const handleBackToIndia = () => {
    setMapMode('india');
    setLevel('india');
    setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedCoords(null);
    setSelectedName('Central India');
    setHoveredRegion(null);

    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove district layer, restore India layer
    if (districtLayerRef.current) { map.removeLayer(districtLayerRef.current); districtLayerRef.current = null; }
    if (indiaLayerRef.current) { indiaLayerRef.current.addTo(map); }

    // Reset bounds to India, re-lock after settle
    map.setMaxBounds(INDIA_BOUNDS);
    map.fitBounds(INDIA_BOUNDS, { animate: true, duration: 0.6 });
    map.once('moveend', () => {
      map.setMaxBounds(map.getBounds().pad(0.1));
    });
  };

  const handleBackToState = () => {
    setLevel('state');
    setSelectedDistrict(null);
    setHoveredRegion(null);
    // Re-style all districts to remove selection highlight and restore full opacity
    if (districtLayerRef.current) {
      districtLayerRef.current.eachLayer((l: any) => {
        if (!l.feature) return;
        const s = districtStyle(l.feature, false, null);
        l.feature.properties._originalStyle = s;
        l.setStyle(s);
      });
    }
  };

  // Helper: compute display values for a named region
  const buildTooltipData = (name: string, feature: any) => {
    let tempText = "—", rainText = "—", humidText = "—", solarText = "—", alertLevel = "GREEN";

    if (level === 'india') {
      const preloaded = allStatesTelemetry[name];
      if (preloaded) {
        if (preloaded.current_weather) tempText = `${preloaded.current_weather.temperature}°C`;
        if (preloaded.hourly && preloaded.current_weather) {
          const times = preloaded.hourly.time;
          const idx = times.findIndex((t: string) => t.startsWith(preloaded.current_weather.time.substring(0, 13)));
          if (idx !== -1) {
            rainText  = `${preloaded.hourly.precipitation[idx]}mm`;
            humidText = `${preloaded.hourly.relative_humidity_2m[idx]}%`;
            solarText = `${Math.round(680 - simulation.tempOffset * 15)} W/m²`;
            const t = preloaded.hourly.temperature_2m[idx];
            const r = preloaded.hourly.precipitation[idx];
            alertLevel = (t > 40 || r > 150) ? "RED" : (t > 35 || r > 100) ? "ORANGE" : "GREEN";
          }
        }
      } else {
        const norm = normalizeStateName(name);
        const key = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
        const d = key ? STATE_DATA[key] : null;
        if (d) {
          tempText  = `${d.temp}°C`;
          rainText  = `${d.rain}mm`;
          humidText = `${d.humidity}%`;
          solarText = `${d.solar} W/m²`;
          alertLevel = (d.temp > 40 || d.rain > 150) ? "RED" : (d.temp > 35 || d.rain > 100) ? "ORANGE" : "GREEN";
        }
      }
    } else {
      const dVal = getDistrictValue(name, selectedState || '', feature);
      const suffix = activeTimeIndex > 0 ? " [AI]" : "";
      if (dVal !== null) {
        if (activeLayerId === 'temp')     tempText  = `${dVal}°C${suffix}`;
        else if (activeLayerId === 'precip')   rainText  = `${dVal}mm${suffix}`;
        else if (activeLayerId === 'humidity') humidText = `${dVal}%${suffix}`;
        else if (activeLayerId === 'solar')    solarText = `${dVal} W/m²${suffix}`;
        else if (activeLayerId === 'pressure') solarText = `${dVal} hPa${suffix}`; // Reuse solarText or add pressureText if exists, wait, tooltip only displays 4 values.
      }
    }
    return { tempText, rainText, humidText, solarText, alertLevel };
  };

  // --- CHOROPLETH HELPERS ---

  // Compute fill color for a state feature
  const stateStyle = (feature: any) => {
    const rawName = feature.properties.NAME_1 || feature.properties.ST_NM || feature.properties.STATE || '';
    let val = getStateValue(rawName);
    const preloaded = allStatesTelemetry[rawName];
    if (preloaded) {
      if (activeLayerId === 'temp' && preloaded.current_weather) val = preloaded.current_weather.temperature;
      else if (activeLayerId === 'wind' && preloaded.current_weather) val = preloaded.current_weather.windspeed;
      else if (preloaded.hourly && preloaded.current_weather) {
        const idx = preloaded.hourly.time.findIndex((t: string) => t.startsWith(preloaded.current_weather.time.substring(0, 13)));
        if (idx !== -1) {
          if (activeLayerId === 'precip')   val = preloaded.hourly.precipitation[idx];
          else if (activeLayerId === 'humidity') val = preloaded.hourly.relative_humidity_2m[idx];
          else if (activeLayerId === 'pressure') val = preloaded.hourly.surface_pressure?.[idx] || 1008;
          else if (activeLayerId === 'solar')    val = 650;
        }
      }
    }
    return { fillColor: getColor(val), fillOpacity: 0.85, color: 'rgba(255,255,255,0.85)', weight: 1 };
  };

  // Compute fill color for a district feature
  const districtStyle = (feature: any, isSelected: boolean, currentSelectedDistrict: string | null = selectedDistrict) => {
    const n = feature.properties.DISTRICT || feature.properties.dtname || feature.properties.NAME_2 || feature.properties.NAME || '';
    const val = getDistrictValue(n, selectedState || '', feature);
    const hasSelection = currentSelectedDistrict !== null;
    const isOther = hasSelection && !isSelected;
    
    let fillColor = '#cbd5e1';
    if (val === null || val === undefined || isNaN(val)) {
      console.warn(`Missing or invalid data for district: ${n}`);
    } else {
      fillColor = getColor(val);
    }

    return {
      fillColor,
      fillOpacity: isSelected ? 1 : (isOther ? 0.45 : 0.85),
      color: isSelected ? '#ffffff' : '#ffffff',
      opacity: 0.9,
      weight: isSelected ? 3 : 1.5,
      className: isSelected ? 'district-selected' : '',
    };
  };

  useEffect(() => {
    dynamicStateRef.current.selectedDistrict = selectedDistrict;
    dynamicStateRef.current.districtStyle = districtStyle;
    dynamicStateRef.current.stateStyle = stateStyle;
  });

  // Build the India states GeoJSON layer (called once on first data load)
  const buildIndiaLayer = () => {
    const features = statesGeoRef.current?.features || [];
    const layer = L.geoJSON({ type: 'FeatureCollection', features } as any, {
      onEachFeature: (feature, pathLayer) => {
        const rawName = feature.properties.NAME_1 || feature.properties.ST_NM || feature.properties.STATE || '';
        
        pathLayer.on('add', (e: any) => {
          const s = stateStyle(feature);
          feature.properties._originalStyle = s;
          e.target.setStyle(s);
        });

        pathLayer.on({
          click: () => handleStateClick(rawName),
          mouseover: (e: any) => {
            const { stateStyle } = dynamicStateRef.current;
            if (stateStyle) {
              const base = stateStyle(feature);
              e.target.setStyle({ ...base, weight: 2.5, color: '#ffffff', fillOpacity: 1 });
            } else {
              e.target.setStyle({ weight: 2.5, color: '#ffffff', fillOpacity: 1 });
            }
            if (!L.Browser.ie) e.target.bringToFront();
            const { tempText, rainText, humidText, solarText, alertLevel } = buildTooltipData(rawName, feature);
            setHoveredRegion({ name: rawName, feature, x: e.originalEvent.clientX, y: e.originalEvent.clientY, temp: tempText, rain: rainText, humid: humidText, solar: solarText, alertLevel });
          },
          mousemove: (e: any) => setHoveredRegion(p => p ? { ...p, x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null),
          mouseout: (e: any) => {
            const { stateStyle } = dynamicStateRef.current;
            if (stateStyle) {
              const s = stateStyle(feature);
              e.target.setStyle(s);
              feature.properties._originalStyle = s;
            } else if (feature.properties._originalStyle) {
              e.target.setStyle(feature.properties._originalStyle);
            }
            setHoveredRegion(null);
          }
        });
      }
    });
    return layer;
  };

  // Build the district GeoJSON layer for one state
  const buildDistrictLayer = (features: any[], stateName: string) => {
    const layer = L.geoJSON({ type: 'FeatureCollection', features } as any, {
      onEachFeature: (feature, pathLayer) => {
        const rawName = feature.properties.DISTRICT || feature.properties.dtname || feature.properties.NAME_2 || feature.properties.NAME || '';
        
        // Store layer reference
        layerRefs.current[rawName] = pathLayer;

        pathLayer.on('add', (e: any) => {
          // Set loading state color initially
          const initialStyle = { fillColor: '#cbd5e1', fillOpacity: 0.85, color: '#ffffff', opacity: 0.9, weight: 1.5 };
          feature.properties._originalStyle = initialStyle;
          e.target.setStyle(initialStyle);

          // Fetch if not cached
          if (!districtWeatherCache.current[rawName]) {
            const center = (pathLayer as any).getBounds().getCenter();
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max&timezone=Asia/Kolkata`;
            
            fetch(url)
              .then(res => res.json())
              .then(data => {
                districtWeatherCache.current[rawName] = data;
                const layer = layerRefs.current[rawName];
                const temp = data.current.temperature_2m;
                
                console.log(`[Fetch Resolved] District: ${rawName}, Temp: ${temp}, Layer exists:`, !!layer);
                
                if (layer) {
                  const { districtStyle, selectedDistrict: currentSel } = dynamicStateRef.current;
                  if (districtStyle) {
                    const s = districtStyle(feature, rawName === currentSel, currentSel);
                    feature.properties._originalStyle = s;
                    layer.setStyle(s);
                  }
                }
              })
              .catch(err => console.error(err));
          } else {
            // Already cached
            const s = districtStyle(feature, rawName === selectedDistrict);
            feature.properties._originalStyle = s;
            e.target.setStyle(s);
          }
        });

        pathLayer.on({
          click: () => handleDistrictClick(rawName),
          mouseover: (e: any) => {
            const { districtStyle, selectedDistrict: currentSel } = dynamicStateRef.current;
            if (districtStyle) {
              const base = districtStyle(feature, rawName === currentSel, currentSel);
              e.target.setStyle({ ...base, weight: 2.5, color: '#ffffff', fillOpacity: 1 });
            } else {
              e.target.setStyle({ weight: 2.5, color: '#ffffff', fillOpacity: 1 });
            }
            if (!L.Browser.ie) e.target.bringToFront();
            const { tempText, rainText, humidText, solarText, alertLevel } = buildTooltipData(rawName, feature);
            setHoveredRegion({ name: rawName, feature, x: e.originalEvent.clientX, y: e.originalEvent.clientY, temp: tempText, rain: rainText, humid: humidText, solar: solarText, alertLevel });
            
            // Fetch live data from Open-Meteo
            fetchDistrictWeather(rawName, e.target);
          },
          mousemove: (e: any) => setHoveredRegion(p => p ? { ...p, x: e.originalEvent.clientX, y: e.originalEvent.clientY } : null),
          mouseout: (e: any) => {
            const { districtStyle, selectedDistrict: currentSel } = dynamicStateRef.current;
            if (districtStyle) {
              const s = districtStyle(feature, rawName === currentSel, currentSel);
              e.target.setStyle(s);
              feature.properties._originalStyle = s;
            } else if (feature.properties._originalStyle) {
              e.target.setStyle(feature.properties._originalStyle);
            }
            setHoveredRegion(null);
            
            // Re-bring selected district to front after reset
            if (currentSel) {
              layer.eachLayer((l: any) => {
                const n = l.feature?.properties?.DISTRICT || l.feature?.properties?.dtname || l.feature?.properties?.NAME_2 || l.feature?.properties?.NAME || '';
                if (n === currentSel) l.bringToFront();
              });
            }
          }
        });
      }
    });
    return layer;
  };

  // EFFECT: Build India layer once when data first loads, add to map
  useEffect(() => {
    if (!mapInstanceRef.current || !dataLoaded || indiaLayerRef.current) return;
    const map = mapInstanceRef.current;
    const iLayer = buildIndiaLayer();
    iLayer.addTo(map);
    indiaLayerRef.current = iLayer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoaded, mapInstanceRef.current]);

  // EFFECT: Style-only update on India layer when activeLayer/simulation/time changes
  useEffect(() => {
    if (!indiaLayerRef.current || mapMode !== 'india') return;
    indiaLayerRef.current.eachLayer((l: any) => {
      if (!l.feature) return;
      const s = stateStyle(l.feature);
      l.feature.properties._originalStyle = s;
      l.setStyle(s);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayerId, activeTimeIndex, simulation, allStatesTelemetry]);


  // EFFECT: Style-only update on district layer when activeLayer/simulation/time changes
  useEffect(() => {
    if (!districtLayerRef.current || mapMode !== 'state') return;
    districtLayerRef.current.eachLayer((l: any) => {
      if (!l.feature) return;
      const n = l.feature.properties.DISTRICT || l.feature.properties.dtname || l.feature.properties.NAME_2 || l.feature.properties.NAME || '';
      const isSel = n === selectedDistrict;
      const s = districtStyle(l.feature, isSel);
      l.feature.properties._originalStyle = s;
      l.setStyle(s);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayerId, activeTimeIndex, simulation, selectedDistrict, stateTelemetryValue]);

  if (loading) {
    return (
      <div className="w-full h-full bg-bg-void flex flex-col items-center justify-center font-mono text-text-secondary select-none">
        <div className="w-10 h-10 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        <p className="mt-4 text-[10px] uppercase tracking-widest animate-pulse font-bold text-accent-blue leading-none">
          Loading Vector Geospatial Databases...
        </p>
      </div>
    );
  }

  if (errorStatus) {
    return (
      <div className="w-full h-full bg-bg-void flex flex-col items-center justify-center font-mono text-accent-red select-none p-6">
        <p className="text-xs uppercase tracking-wider font-bold">Meteorological Matrix Fetch Failure</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-accent-blue text-white text-[10px] uppercase font-bold rounded-xl cursor-pointer"
        >
          Reboot System
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-bg-void animate-fade-in" ref={containerRef}>
      <style>{`
        .muted-context-basemap {
          filter: grayscale(70%) opacity(50%);
        }
      `}</style>
      <div className={`map-area ${level === 'district' ? 'split-view' : ''}`} style={{ height: '100%', width: '100%' }}>

        {/* Leaflet map mount point */}
        <div
          ref={mapContainerRef}
          className="map-svg-container"
          style={{ height: '100%', width: '100%', outline: 'none' }}
        />

        {/* ← All States back button (state mode only) */}
        {mapMode === 'state' && (
          <button
            className="back-btn pointer-events-auto transition-all duration-300"
            style={{ zIndex: 1000, left: isLeftPanelOpen ? '280px' : '20px' }}
            onClick={level === 'district' ? handleBackToState : handleBackToIndia}
          >
            ← {level === 'district' ? selectedState : 'All States'}
          </button>
        )}

        {/* ACTIVE FOCUS AREA badge — hidden when district detail panel is open */}
        {mapMode === 'state' && level !== 'district' && (
          <div className="focus-badge" style={{ zIndex: 1000 }}>
            <div className="focus-label">ACTIVE FOCUS AREA</div>
            <div className="focus-name">{selectedState}</div>
          </div>
        )}

        {/* ZONE pill — top-right */}
        <div className="absolute top-4 right-4 z-[1000] pointer-events-none flex flex-col gap-2 items-end">
          <div
            style={{
              background: 'rgba(255,255,255,0.88)',
              border: '1px solid rgba(0,0,0,0.12)',
              backdropFilter: 'blur(8px)',
              borderRadius: '10px',
              padding: '5px 12px',
              fontFamily: 'monospace',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#1e293b',
              textTransform: 'uppercase',
            }}
          >
            ZONE: <span style={{ color: '#0369a1' }}>{selectedState ?? 'ALL INDIA SUB-GRID'}</span>
          </div>
          {activeTimeIndex > 0 && (
            <div className="bg-accent-purple text-white border border-accent-purple/20 px-3 py-1.5 rounded-xl text-[8.5px] font-mono font-extrabold uppercase flex items-center gap-1.5 animate-pulse shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              <span>AI PREDICTION MODE: ACTIVE</span>
            </div>
          )}
        </div>

        {/* IMD agency alert card (state mode) */}
        {mapMode === 'state' && selectedState && (
          (() => {
            const norm = normalizeStateName(selectedState);
            const cleanS = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
            const data = cleanS ? STATE_DATA[cleanS] : null;
            if (!data) return null;
            const isRed = data.rain > 200 || data.temp > 42;
            const isOrange = !isRed && (data.rain > 100 || data.temp > 38);
            if (!isRed && !isOrange) return null;
            const alertTitle = data.temp > 40 ? 'SEVERE HEATWAVE CONDITIONS' : data.rain > 150 ? 'FLASH FLOOD WARNING' : 'EXTREME METEOROLOGICAL ANOMALY';
            const advisoryText = data.temp > 40
              ? 'LST thresholds exceeded. Immediate risk of crop desiccation and power grid load anomalies across local subgrids.'
              : 'Extreme precipitation anomaly detected. Critical risk of local catchment overflow and immediate structural inundation.';
            const hoursRemaining = isRed ? '18h 42m 05s' : '44h 12m 30s';
            return (
              <div className="absolute top-16 left-4 z-[1000] panel-card bg-bg-surface border-l-4 border-l-accent-red border border-border-default p-4 rounded-xl shadow-xl max-w-[290px] font-sans">
                <div className="text-[10px] font-mono font-black tracking-widest text-accent-red flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-red inline-block" />
                  IMD NATIONAL BULLETIN
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-[12px] font-bold text-text-primary tracking-tight">{alertTitle}</div>
                  <p className="text-[10px] text-text-secondary leading-normal normal-case font-medium pt-0.5">{advisoryText}</p>
                  <div className="pt-2.5 mt-2 border-t border-border-default flex flex-col gap-1">
                    <div className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-wider">NEXT RESOURCE DEPLOYMENT DEADLINE:</div>
                    <div className="text-accent-red font-mono font-bold text-[13px] tracking-wider">{hoursRemaining}</div>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        <button className="reset-view-btn pointer-events-auto" style={{ zIndex: 1000 }} onClick={handleBackToIndia}>
          ⌖ Reset View
        </button>

        {/* Dynamic Legend */}
        <Legend activeLayerId={activeLayerId} isLeftPanelOpen={isLeftPanelOpen} dynamicTempRange={dynamicTempRange} />

        {/* Cursor-following React tooltip */}
        {hoveredRegion && (
          mapMode === 'state' ? (
            <DistrictHoverCard hoveredRegion={hoveredRegion} />
          ) : (
            <div
              className="fixed z-[9999] pointer-events-none map-tooltip"
              style={{ left: hoveredRegion.x + 20, top: hoveredRegion.y - 120 }}
            >
              <div className="tt-header">
                <span className="tt-name">{hoveredRegion.name.toUpperCase()}</span>
                <span className={`tt-alert alert-${hoveredRegion.alertLevel.toLowerCase()}`}>{hoveredRegion.alertLevel}</span>
              </div>
              <div className="tt-grid">
                <div className="tt-item"><span className="tt-icon">🌡</span><span className="tt-label">TEMP</span><span className="tt-val">{hoveredRegion.temp}</span></div>
                <div className="tt-item"><span className="tt-icon">🌧</span><span className="tt-label">RAIN</span><span className="tt-val">{hoveredRegion.rain}</span></div>
                <div className="tt-item"><span className="tt-icon">💧</span><span className="tt-label">HUMIDITY</span><span className="tt-val">{hoveredRegion.humid}</span></div>
                <div className="tt-item"><span className="tt-icon">☀️</span><span className="tt-label">SOLAR</span><span className="tt-val">{hoveredRegion.solar}</span></div>
              </div>
              <div className="tt-hint">Click to explore districts →</div>
            </div>
          )
        )}

        {/* Zoom/pan hint in state mode */}
        {mapMode === 'state' && (
          <div className="zoom-hint" style={{ zIndex: 1000 }}>Scroll to zoom · Drag to pan</div>
        )}

        {/* District Detail Panel (split layout) */}
        {level === 'district' && selectedDistrict && (
          <div className="district-detail-panel flex flex-col overflow-hidden bg-bg-surface border-l border-border-default shadow-2xl">
            <div className="flex justify-between items-start p-6 pb-5 border-b border-border-default shrink-0">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-black text-text-primary uppercase tracking-wide">
                  <span className="w-3 h-3 rounded-full bg-accent-green inline-block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  {getDisplayDistrictName(selectedDistrict)}
                </h2>
                <p className="text-[10px] text-text-secondary mt-2 font-bold tracking-widest uppercase flex items-center">
                  PILOT ZONE TELEMETRY <span className="mx-2 opacity-50">•</span> MH-ID: {getDisplayDistrictName(selectedDistrict).substring(0, 2).toUpperCase()}-{10 + (getDisplayDistrictName(selectedDistrict).length % 90)}
                </p>
              </div>
              <button 
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors font-bold text-sm shrink-0"
                onClick={handleBackToState}
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
            
            {selectedState?.toLowerCase() === 'maharashtra' ? (
              <>
                <div className="flex items-center px-6 border-b border-border-default bg-bg-surface/50 overflow-x-auto hide-scrollbar shrink-0">
                  {['FORECAST', 'AGRICULTURE', 'IMD DATA', 'ANALYSIS'].map(tab => (
                    <button 
                      key={tab} 
                      className={`py-3.5 px-2 mr-6 text-[10px] tracking-widest whitespace-nowrap border-b-[3px] transition-all ${
                        activeTab === tab 
                          ? 'border-accent-green text-accent-green font-bold' 
                          : 'border-transparent text-text-secondary font-bold hover:text-text-primary'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto hide-scrollbar bg-bg-surface">
                  {activeTab === 'FORECAST' && <DistrictForecastTab district={selectedDistrict} state={selectedState!} weatherData={districtWeatherCache.current[selectedDistrict]} forecastData={forecastDataRef.current} activeTimeIndex={activeTimeIndex} />}
                  {activeTab === 'IMD DATA' && <DistrictIMDTab district={selectedDistrict} state={selectedState!} />}
                  {activeTab === 'AGRICULTURE' && selectedState && selectedDistrict
                    ? <AgricultureView district={selectedDistrict} state={selectedState} />
                    : null}
                  {activeTab === 'ANALYSIS' && <DistrictAnalysisTab district={selectedDistrict} state={selectedState!} />}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-bg-surface">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8 text-slate-400" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Live Telemetry Not Available</h3>
                <p className="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
                  Live telemetry not yet available for this region.
                  <br className="mb-2" />
                  <button onClick={() => handleStateClick('Maharashtra')} className="font-bold text-accent-blue hover:underline bg-blue-50 px-2 py-1 rounded inline-block mt-1 uppercase tracking-wider">MAHARASHTRA</button> is currently the active pilot zone with full data coverage.
                </p>
              </div>
            )}
          </div>
        )}

        <style>{`
          .leaflet-container { background: #dde3ea !important; }
          .leaflet-pane { z-index: 1; }
          .leaflet-top, .leaflet-bottom { z-index: 1000; }
        `}</style>
      </div>

    </div>
  );
});

MapViewComponent.displayName = "MapView";

/* --- TAB INSERTS & HOVER CARDS FOR DISTRICT PANELS --- */

const DistrictHoverCard = ({ hoveredRegion }: { hoveredRegion: any }) => {
  return (
    <div
      className="fixed z-[9999] pointer-events-none rounded-xl p-4 font-sans shadow-2xl transition-opacity duration-200"
      style={{
        left: hoveredRegion.x + 20,
        top: hoveredRegion.y - 120,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(12px)',
        width: '240px',
        color: 'var(--text-primary)'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold text-sm tracking-wide">{getDisplayDistrictName(hoveredRegion.name).toUpperCase()}</span>
        <span className="text-[9px] font-mono font-bold bg-[#00ff88]/10 text-[#00ff88] px-2 py-0.5 rounded-full border border-[#00ff88]/30">
          DISTRICT
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-200">
          <div className="text-[10px] text-slate-500 font-mono mb-1 flex items-center gap-1">
            <span className="text-slate-800">🌡</span> TEMP
          </div>
          <div className="font-bold text-sm">{hoveredRegion.temp}</div>
        </div>
        <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-200">
          <div className="text-[10px] text-slate-500 font-mono mb-1 flex items-center gap-1">
            <span className="text-slate-800">🌧</span> RAIN
          </div>
          <div className="font-bold text-sm">{hoveredRegion.rain}</div>
        </div>
        <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-200">
          <div className="text-[10px] text-slate-500 font-mono mb-1 flex items-center gap-1">
            <span className="text-slate-800">💧</span> HUMIDITY
          </div>
          <div className="font-bold text-sm">{hoveredRegion.humid}</div>
        </div>
        <div className="bg-slate-50/50 rounded-lg p-2 border border-slate-200">
          <div className="text-[10px] text-slate-500 font-mono mb-1 flex items-center gap-1">
            <span className="text-amber-500">☀️</span> SOLAR
          </div>
          <div className="font-bold text-sm">{hoveredRegion.solar}</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="flex flex-col gap-3">
        <div>
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-slate-500">Crop Stress Index</span>
            <span className="font-bold text-slate-700">{hoveredRegion.cropStress || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${hoveredRegion.cropStress || 0}%`,
                background: 'linear-gradient(90deg, #00ff88, #fbbf24, #ef4444)'
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-mono mb-1">
            <span className="text-slate-500">Flood Risk Index</span>
            <span className="font-bold text-slate-700">{hoveredRegion.floodRisk || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${hoveredRegion.floodRisk || 0}%`,
                background: 'linear-gradient(90deg, #00ff88, #fbbf24, #ef4444)'
              }}
            />
          </div>
        </div>
      </div>

      {hoveredRegion.isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center z-10 border border-[#00ff88]/20">
          <div className="w-6 h-6 border-2 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin mb-2" />
          <span className="text-[10px] font-mono text-[#00ff88] tracking-widest animate-pulse">FETCHING...</span>
        </div>
      )}
    </div>
  );
};

const DistrictForecastTab = ({ district, state, weatherData, forecastData, activeTimeIndex }: { district: string, state: string, weatherData?: any, forecastData?: any, activeTimeIndex: number }) => {
  if (!weatherData || !weatherData.current || !weatherData.daily || !weatherData.hourly) {
    return (
      <div className="p-5 flex flex-col items-center justify-center font-mono text-[10px] text-text-secondary h-48 animate-pulse uppercase">
        Retrieving District Meteorological Telemetry...
      </div>
    );
  }

  const currentTemp = Math.round(weatherData.current.temperature_2m);
  const currentHumid = Math.round(weatherData.current.relative_humidity_2m);
  const currentRain = weatherData.current.precipitation;
  const currentWind = weatherData.current.wind_speed_10m;
  const currentUV = weatherData.daily.uv_index_max[0] || 5;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getWeatherIcon = (prob: number, sum: number) => {
    const props = { size: 28, color: '#059669', strokeWidth: 2 };
    if (sum > 5) return <CloudLightning {...props} />;
    if (sum > 1 || prob > 60) return <CloudRain {...props} />;
    if (prob > 30) return <CloudSun {...props} />;
    return <Sun {...props} />;
  };

  const forecastKey = FORECAST_DISTRICT_MAP[district] || district;
  const districtForecast = forecastData ? forecastData[forecastKey] : null;

  console.log(`[Forecast Debug] Key lookup: district="${district}" -> mappedKey="${forecastKey}"`);
  if (districtForecast) {
    console.log(`[Forecast Debug] Found data for ${forecastKey}:`, districtForecast.slice(0, 5));
  } else {
    console.log(`[Forecast Debug] NO DATA FOUND for ${forecastKey}`);
  }

  const highlightIdx = [0, 1, 3, 6][activeTimeIndex] ?? -1;

  // 7-day forecast mapping
  const forecastDays = weatherData.daily.time.slice(0, 7).map((dateStr: string, idx: number) => {
    const day = formatDay(dateStr);
    const dateLabel = formatDate(dateStr);
    
    let maxTemp, minTemp, rainProb, rainSum;
    if (districtForecast && districtForecast[idx]) {
      const f = districtForecast[idx];
      maxTemp = Math.round(f.T2M_MAX);
      minTemp = Math.round(f.T2M_MIN);
      rainSum = f.PRECTOTCORR;
      rainProb = Math.min(100, Math.round(f.PRECTOTCORR * 5));
    } else {
      maxTemp = Math.round(weatherData.daily.temperature_2m_max[idx]);
      minTemp = Math.round(weatherData.daily.temperature_2m_min[idx]);
      rainProb = Math.round(weatherData.daily.precipitation_probability_max[idx] || 0);
      rainSum = weatherData.daily.precipitation_sum[idx] || 0;
    }
    
    const icon = getWeatherIcon(rainProb, rainSum);
    return { day, dateLabel, max: maxTemp, min: minTemp, rain: rainProb, icon };
  });

  // 24-hour profile chart mapping
  const hourlyTemps = weatherData.hourly.temperature_2m.slice(0, 24);
  const hourlyHumid = weatherData.hourly.relative_humidity_2m.slice(0, 24);

  const minTemp = Math.min(...hourlyTemps) - 2;
  const maxTemp = Math.max(...hourlyTemps) + 2;
  const tempRange = maxTemp - minTemp || 1;

  const pointsTemp = hourlyTemps.map((val: number, idx: number) => {
    const x = 15 + (idx / 23) * 270;
    const y = 90 - ((val - minTemp) / tempRange) * 80;
    return `${x},${y}`;
  });

  const pointsHumid = hourlyHumid.map((val: number, idx: number) => {
    const x = 15 + (idx / 23) * 270;
    const y = 90 - (val / 100) * 80;
    return `${x},${y}`;
  });

  const chartHours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:00"];

  return (
    <div className="p-5 flex flex-col gap-4 font-sans select-none overflow-y-auto">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-[10px] uppercase font-mono tracking-wider text-emerald-600 flex items-center gap-2">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0" />
        <span>SYSTEM STATUS: NOMINAL — All seasonal matrices within standard error boundaries</span>
      </div>

      <div>
        <span className="text-[8px] font-mono font-bold text-text-secondary uppercase tracking-widest block mb-2">
          CURRENT METEOROLOGICAL METRICS
        </span>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#f3f6f4] border border-[#dce4df] p-3 rounded-xl flex flex-col justify-center shadow-sm">
            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Temperature</span>
            <span className="text-xl font-bold text-black leading-none">{currentTemp}°C</span>
          </div>
          <div className="bg-[#f3f6f4] border border-[#dce4df] p-3 rounded-xl flex flex-col justify-center shadow-sm">
            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Humidity</span>
            <span className="text-xl font-bold text-black leading-none">{currentHumid}%</span>
          </div>
          <div className="bg-[#f3f6f4] border border-[#dce4df] p-3 rounded-xl flex flex-col justify-center shadow-sm">
            <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Precipitation</span>
            <span className="text-xl font-bold text-black leading-none">{currentRain}mm</span>
          </div>
        </div>
      </div>

      <div>
        <span className="text-[8px] font-mono font-bold text-text-secondary uppercase tracking-widest block mb-2 mt-2">
          7-DAY WEATHER FORECAST
        </span>
        <div className="flex justify-between gap-3 w-full overflow-x-auto pb-2 pt-1 px-1 -mx-1 hide-scrollbar">
          {forecastDays.map((f: any, i: number) => {
            const isHighlighted = i === highlightIdx;
            return (
              <div key={i} 
                className={`flex-1 min-w-[5rem] bg-[#f3f6f4] border ${isHighlighted ? 'border-[#059669] shadow-[0_0_12px_rgba(5,150,105,0.5)]' : 'border-[#dce4df]'} rounded-xl p-3 text-center flex flex-col items-center justify-between h-auto min-h-[11rem] hover:border-[#b8c9c0] hover:shadow-md transition-all duration-300 shadow-sm`}
              >
                
                {/* Day and Date */}
                <div className="flex flex-col items-center">
                  <span className="text-[12px] font-bold text-slate-500 uppercase tracking-wide">{f.day}</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">{f.dateLabel}</span>
                </div>
                
                {/* Weather Icon */}
                <span className="my-2 flex items-center justify-center scale-110">{f.icon}</span>
                
                {/* Temperatures */}
                <div className="flex flex-col items-center mt-auto mb-2">
                  <span className="text-[18px] font-bold text-black leading-none">{f.max}°</span>
                  <span className="text-xs font-medium text-slate-500 mt-1.5 leading-none">{f.min}°</span>
                </div>
                
                {/* Rain % */}
                <span className="text-[10px] font-bold text-blue-600 mt-2 tracking-wide w-full border-t border-[#dce4df] pt-2">
                  {f.rain}% Rain
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#f3f6f4] border border-[#dce4df] p-4 rounded-xl flex flex-col gap-2 mt-2 shadow-sm">
        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
          24-Hour Met-Cycle Progression
        </span>
        <div className="h-28 w-full mt-2 relative">
          <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
            {[20, 50, 80].map((y, idx) => (
              <line key={idx} x1="10" y1={y} x2="290" y2={y} stroke="rgba(0,0,0,0.03)" strokeWidth="1" strokeDasharray="3 3" />
            ))}
            <path d={`M ${pointsTemp.join(" L ")}`} fill="none" stroke="var(--accent-orange)" strokeWidth="2.2" strokeLinecap="round" />
            <path d={`M ${pointsHumid.join(" L ")}`} fill="none" stroke="var(--accent-green)" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" />
            {pointsTemp.map((p, idx) => {
              if (idx % 2 !== 0) return null; // reduce clutter
              const [x, y] = p.split(",").map(Number);
              return <circle key={idx} cx={x} cy={y} r="2.5" fill="var(--accent-orange)" />;
            })}
            {pointsHumid.map((p, idx) => {
              if (idx % 2 !== 0) return null;
              const [x, y] = p.split(",").map(Number);
              return <circle key={idx} cx={x} cy={y} r="2.5" fill="var(--accent-green)" />;
            })}
          </svg>
        </div>
        <div className="flex justify-between text-[8px] font-mono text-text-secondary px-1">
          {chartHours.map((h, i) => (
            <span key={i}>{h}</span>
          ))}
        </div>
        
        <div className="flex justify-center gap-4 mt-2 text-[8px] font-mono text-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-accent-orange inline-block" />
            <span>Temperature Profile</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 border-t border-dashed border-accent-green inline-block" />
            <span>Humidity Profile</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
          <span className="text-[8px] font-mono font-bold text-text-secondary uppercase block mb-1 tracking-wider">Wind Speed</span>
          <span className="text-base font-mono font-extrabold text-slate-800">{currentWind} km/h</span>
          <span className="text-[8px] font-mono text-emerald-600 block mt-1 uppercase font-bold">WSW Directional Flow</span>
        </div>
        <div className="bg-slate-50 border border-slate-200/60 p-3.5 rounded-xl">
          <span className="text-[8px] font-mono font-bold text-text-secondary uppercase block mb-1 tracking-wider">UV Index</span>
          <span className="text-base font-mono font-extrabold text-amber-600">{currentUV} UV</span>
          <span className="text-[8px] font-mono text-text-secondary block mt-1 uppercase font-bold">Exposure Threshold</span>
        </div>
      </div>
    </div>
  );
};

const DistrictIMDTab = ({ district, state }: { district: string, state: string }) => {
  const norm = normalizeStateName(state);
  const cleanS = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
  const data = cleanS ? STATE_DATA[cleanS] : { temp: 28, rain: 100, humidity: 65, wind: 15 };

  const seed = district.length;
  const lpa = Math.round((data.rain * 12) * (1 + ((seed % 10) - 5) * 0.04));
  const actualRain = Math.round(lpa * (1 + ((seed % 4) - 2) * 0.08));
  const departure = Number((((actualRain - lpa) / lpa) * 100).toFixed(1));

  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  const monthlyData = months.map((m, idx) => {
    let factor = 0.02;
    if (idx >= 5 && idx <= 8) factor = 0.22;
    else if (idx === 4 || idx === 9) factor = 0.10;
    
    const baseRain = lpa * factor;
    const lpaVal = Math.max(2, Math.round(baseRain + Math.sin(idx + seed) * 10));
    const actVal = Math.max(1, Math.round(lpaVal * (1 + ((seed % 3) - 1) * 0.12)));
    return { month: m, actual: actVal, norm: lpaVal };
  });

  return (
    <div className="p-5 flex flex-col gap-4 font-sans select-none overflow-y-auto w-full">
      <div className="p-4 rounded-xl text-white shadow-xl flex flex-col gap-2" style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)" }}>
        <span className="text-[9px] font-mono font-black tracking-widest uppercase opacity-80">
          GRID MET DATABASE
        </span>
        <h3 className="text-base font-display font-black uppercase tracking-tight">
          IMD Gridded Data Analysis
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-white/10 text-white font-mono">
          <div>
            <span className="text-[8px] opacity-75 block">P-GRID (Rainfall)</span>
            <span className="text-[11px] font-bold">0.25° × 0.25°</span>
          </div>
          <div>
            <span className="text-[8px] opacity-75 block">T-GRID (Temp)</span>
            <span className="text-[11px] font-bold">1.00° × 1.00°</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/10 font-mono">
          <div>
            <span className="text-[8px] opacity-75 block">Actual Rain</span>
            <span className="text-[11px] font-bold text-white text-xs">{actualRain}mm</span>
          </div>
          <div>
            <span className="text-[8px] opacity-75 block">Normal (LPA)</span>
            <span className="text-[11px] font-bold text-white text-xs">{lpa}mm</span>
          </div>
          <div>
            <span className="text-[8px] opacity-75 block">Departure</span>
            <span className={`text-[11px] font-extrabold text-xs ${departure >= 0 ? "text-[#4ade80]" : "text-accent-orange"}`}>
              {departure >= 0 ? "+" : ""}{departure}%
            </span>
          </div>
        </div>
      </div>

      <div className="bg-bg-elevated border border-[var(--border-default)] p-4 rounded-xl flex flex-col gap-2 w-full">
        <span className="text-[9.5px] font-display font-black text-[var(--text-primary)] uppercase tracking-wider">
          Monthly Precipitation Distribution (LPA Comparison)
        </span>
        <div className="h-32 w-full mt-2 flex items-end justify-between px-1">
          {monthlyData.map((d, i) => {
            const maxVal = d.norm + d.actual + 40;
            const actH = Math.max(5, Math.round((d.actual / maxVal) * 90));
            const normH = Math.max(5, Math.round((d.norm / maxVal) * 90));

            return (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                <div className="flex gap-1 items-end h-[95px] justify-center w-full">
                  <div className="w-1.5 rounded-t bg-bg-void border border-[var(--border-default)]" style={{ height: `${normH}%` }} title={`LPA: ${d.norm}mm`} />
                  <div className="w-1.5 rounded-t bg-accent-blue" style={{ height: `${actH}%` }} title={`Actual: ${d.actual}mm`} />
                </div>
                <span className="text-[8px] font-mono text-[var(--text-muted)] font-bold">{d.month}</span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-4 mt-3 text-[8.5px] font-mono text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-accent-blue rounded-sm" />
            <span>Actual Rain</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-bg-void border border-white/10 rounded-sm" />
            <span>Normal (LPA)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const DistrictAnalysisTab = ({ district, state }: { district: string, state: string }) => {
  const seed = district.length;
  const metrics = [
    Math.max(15, Math.min(100, 30 + (seed % 5) * 14)),       // Crop Stress
    Math.max(15, Math.min(100, 20 + ((seed + 2) % 6) * 12)), // Flood Risk
    Math.max(15, Math.min(100, 40 + ((seed + 4) % 5) * 13)), // Heat Stress
    Math.max(15, Math.min(100, 10 + ((seed + 1) % 6) * 15)), // Water Stress
    Math.max(15, Math.min(100, 25 + ((seed * 3) % 4) * 18))  // Soil Degradation
  ];

  const labels = ["CROP STRESS", "FLOOD", "HEAT", "WATER", "SOIL DEGRA."];

  const angles = [
    -Math.PI / 2,
    -Math.PI / 2 + (2 * Math.PI) / 5,
    -Math.PI / 2 + (4 * Math.PI) / 5,
    -Math.PI / 2 + (6 * Math.PI) / 5,
    -Math.PI / 2 + (8 * Math.PI) / 5
  ];

  const polyPoints = (r: number) => {
    return angles.map(a => `${110 + r * Math.cos(a)},${100 + r * Math.sin(a)}`).join(" ");
  };

  const filledPoints = metrics.map((m, idx) => {
    const r = (m / 100) * 65;
    const a = angles[idx];
    return `${110 + r * Math.cos(a)},${100 + r * Math.sin(a)}`;
  }).join(" ");

  return (
    <div className="p-5 flex flex-col gap-4 font-sans select-none overflow-y-auto">
      <div className="bg-bg-elevated border border-[var(--border-default)] p-4 rounded-xl">
        <div className="flex items-center gap-1.5 border-b border-white/5 pb-2 mb-2">
          <span className="text-[9px] font-display font-black text-accent-purple uppercase tracking-wider leading-none">
            AI CLIMATE INSIGHTS MACHINE (GFS Ensemble)
          </span>
        </div>
        <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-mono uppercase">
          Dynamic matrix indicates a {metrics[2] > 60 ? "severe warning thermal anomaly" : "standard climate footprints profile"}. {metrics[3] > 60 ? "Water stress indexes are critical and risk total crop yields reduction." : "Hydration profiles score within highly stable ranges."}
        </p>
      </div>

      <div className="bg-bg-elevated border border-[var(--border-default)] p-4 rounded-xl flex flex-col items-center gap-4 w-full">
        <span className="text-[9.5px] font-display font-black text-[var(--text-primary)] uppercase tracking-wider self-start">
          Stress Footprint Fingerprint Matrix
        </span>

        <div className="relative w-full aspect-[4/3] flex items-center justify-center mt-2 max-w-[280px]">
          <svg className="w-full h-full" viewBox="0 0 220 200">
            {[20, 40, 65].map((r, i) => (
              <polygon key={i} points={polyPoints(r)} fill="none" stroke="#cbd5e1" strokeWidth="1" />
            ))}

            {angles.map((a, i) => (
              <line key={i} x1="110" y1="100" x2={110 + 65 * Math.cos(a)} y2={100 + 65 * Math.sin(a)} stroke="#cbd5e1" strokeWidth="1" />
            ))}

            <polygon points={filledPoints} fill="rgba(109,40,217,0.12)" stroke="rgba(109,40,217,0.85)" strokeWidth="1.8" />

            {metrics.map((m, idx) => {
              const r = (m / 100) * 65;
              const a = angles[idx];
              return <circle key={idx} cx={110 + r * Math.cos(a)} cy={100 + r * Math.sin(a)} r="2.5" fill="var(--accent-purple)" />;
            })}

            {labels.map((label, idx) => {
              const a = angles[idx];
              const labelRadius = 82;
              const x = 110 + labelRadius * Math.cos(a);
              const y = 100 + labelRadius * Math.sin(a);
              const anchor = Math.abs(Math.cos(a)) < 0.1 ? "middle" : Math.cos(a) > 0 ? "start" : "end";

              return (
                <text key={idx} x={x} y={y + 3} fill="#334155" fontSize="7px" fontFamily="monospace" fontWeight="bold" textAnchor={anchor}>
                  {label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default memo(MapViewComponent);
