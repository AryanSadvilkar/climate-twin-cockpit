import { useState, useEffect, useRef, useMemo, useImperativeHandle, forwardRef, memo } from "react";
import * as d3 from "d3";
import { SimulationParams, WeatherLayer } from "../types";

export type MapLevel = 'india' | 'state' | 'district';

export interface StateClimate {
  state: string;
  rain: number;
  temp: number;
  drought: number;
  wind: number;
  pressure: number;
  humidity: number;
  cloud: number;
}

const INDIA_STATES_URL = 'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';
const INDIA_DISTRICTS_URL = 'https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson';

// Global memory cache to absolutely avoid re-fetching data when swapping tabs
let globalStateGeoJSON: any = null;
let globalDistrictGeoJSON: any = null;

export const STATE_DATA: Record<string, {rain:number,temp:number,drought:number,wind:number,pressure:number,humidity:number,cloud:number}> = {
  'Andhra Pradesh':    {rain:88, temp:36.2,drought:0.32,wind:18,pressure:1008,humidity:72,cloud:45},
  'Arunachal Pradesh':{rain:180,temp:18.4,drought:0.05,wind:12,pressure:1012,humidity:88,cloud:75},
  'Assam':            {rain:220,temp:28.1,drought:0.02,wind:15,pressure:1010,humidity:90,cloud:85},
  'Bihar':            {rain:62, temp:34.8,drought:0.15,wind:14,pressure:1006,humidity:68,cloud:40},
  'Chhattisgarh':     {rain:110,temp:35.1,drought:0.12,wind:16,pressure:1007,humidity:75,cloud:55},
  'Delhi':            {rain:18, temp:41.2,drought:0.60,wind:22,pressure:1002,humidity:35,cloud:15},
  'Goa':              {rain:290,temp:30.2,drought:0.02,wind:28,pressure:1009,humidity:92,cloud:90},
  'Gujarat':          {rain:38, temp:36.4,drought:0.48,wind:20,pressure:1005,humidity:55,cloud:25},
  'Haryana':          {rain:22, temp:38.5,drought:0.50,wind:19,pressure:1003,humidity:38,cloud:20},
  'Himachal Pradesh': {rain:35, temp:14.2,drought:0.20,wind:25,pressure:1015,humidity:65,cloud:50},
  'Jammu and Kashmir':{rain:12, temp:8.4, drought:0.10,wind:30,pressure:1018,humidity:55,cloud:40},
  'Jharkhand':        {rain:75, temp:33.4,drought:0.22,wind:13,pressure:1007,humidity:70,cloud:45},
  'Karnataka':        {rain:115,temp:32.1,drought:0.18,wind:22,pressure:1009,humidity:78,cloud:65},
  'Kerala':           {rain:312,temp:29.8,drought:0.01,wind:32,pressure:1010,humidity:95,cloud:92},
  'Madhya Pradesh':   {rain:55, temp:39.2,drought:0.42,wind:17,pressure:1004,humidity:48,cloud:30},
  'Maharashtra':      {rain:95, temp:33.5,drought:0.30,wind:20,pressure:1007,humidity:70,cloud:60},
  'Manipur':          {rain:150,temp:25.4,drought:0.08,wind:11,pressure:1012,humidity:85,cloud:70},
  'Meghalaya':        {rain:260,temp:22.8,drought:0.03,wind:14,pressure:1011,humidity:92,cloud:88},
  'Mizoram':          {rain:175,temp:24.2,drought:0.05,wind:12,pressure:1012,humidity:88,cloud:75},
  'Nagaland':         {rain:165,temp:22.4,drought:0.06,wind:13,pressure:1012,humidity:86,cloud:72},
  'Odisha':           {rain:145,temp:34.2,drought:0.08,wind:18,pressure:1007,humidity:76,cloud:58},
  'Punjab':           {rain:28, temp:32.8,drought:0.30,wind:16,pressure:1004,humidity:42,cloud:22},
  'Rajasthan':        {rain:8,  temp:42.4,drought:0.82,wind:24,pressure:1001,humidity:22,cloud:10},
  'Sikkim':           {rain:190,temp:15.2,drought:0.04,wind:18,pressure:1014,humidity:88,cloud:80},
  'Tamil Nadu':       {rain:82, temp:34.4,drought:0.28,wind:21,pressure:1008,humidity:74,cloud:50},
  'Telangana':        {rain:72, temp:37.2,drought:0.38,wind:18,pressure:1005,humidity:60,cloud:35},
  'Tripura':          {rain:155,temp:28.4,drought:0.06,wind:12,pressure:1011,humidity:84,cloud:68},
  'Uttar Pradesh':    {rain:45, temp:37.4,drought:0.35,wind:15,pressure:1004,humidity:45,cloud:28},
  'Uttarakhand':      {rain:68, temp:18.2,drought:0.10,wind:28,pressure:1015,humidity:70,cloud:55},
  'West Bengal':      {rain:155,temp:32.4,drought:0.05,wind:16,pressure:1008,humidity:80,cloud:65},
};

export const STATE_CLIMATE_DATA: StateClimate[] = Object.keys(STATE_DATA).map(key => ({
  state: key,
  ...STATE_DATA[key]
}));

const getAlertLevel = (d: {rain:number,temp:number,drought:number}) => {
  if (d.rain > 200 || d.temp > 42) return 'RED';
  if (d.rain > 100 || d.temp > 38 || d.drought > 0.6) return 'ORANGE';
  if (d.drought > 0.35 || d.temp > 34) return 'YELLOW';
  return 'GREEN';
};

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
}

const MapViewComponent = forwardRef<any, MapViewProps>(({
  activeLayerId,
  simulation,
  activeTimeIndex,
  onZoomChange,
  level: externalLevel,
  onLevelChange: externalOnLevelChange
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 700, height: 600 });
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(!globalStateGeoJSON);
  const [errorStatus, setErrorStatus] = useState(false);

  // Fallback state if parent does not control level
  const [internalLevel, setInternalLevel] = useState<MapLevel>('india');
  const level = externalLevel || internalLevel;
  const setLevel = externalOnLevelChange || setInternalLevel;

  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('FORECAST');
  const stateViewBoxRef = useRef<string>('');

  const statesGeoRef = useRef<any>(globalStateGeoJSON);
  const districtsGeoRef = useRef<any>(globalDistrictGeoJSON);

  // backward-compatible ref methods
  useImperativeHandle(ref, () => ({
    zoomIn: () => onZoomChange?.(1.5),
    zoomOut: () => onZoomChange?.(1.0),
    resetZoom: () => {
      setLevel('india');
      setSelectedState(null);
      setSelectedDistrict(null);
      if (svgRef.current) {
        svgRef.current.setAttribute('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`);
      }
    }
  }));

  // Track size changes to calculate D3 projection boundaries
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        
        // CRITICAL GUARDRAIL: If width or height is 0 (tab is hidden/swapped), ignore it to preserve layout
        if (w === 0 || h === 0) continue;

        setDimensions({
          width: w,
          height: h
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch coordinates on mount and compress them statically
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

        if (!resState.ok || !resDist.ok) throw new Error("Vector data download error");

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

  // Calculate Mercator center grids
  const getProjection = (w: number, h: number) => {
    // Dynamically choose the limiting dimension so the map fits any screen ratio
    const baseScale = Math.min(w * 2.1, h * 2.45);
    
    return d3.geoMercator()
      .center([82.8, 22.5])
      .scale(baseScale)
      .translate([w / 2, h / 2]);
  };

  const projection = getProjection(dimensions.width, dimensions.height);
  const pathGen = d3.geoPath().projection(projection);

  // Calculate premium, professional environmental color scales for light mode
  const getColor = (val: number) => {
    switch (activeLayerId) {
      case "temp":
        return d3.scaleLinear<string>()
          .domain([8, 20, 32, 45])
          .range(["#e0f2fe", "#7dd3fc", "#fcd34d", "#f87171"])(val); // Soft sky blue -> Mild yellow -> Warm coral red
      case "precip":
        return d3.scaleLinear<string>()
          .domain([0, 50, 120, 250])
          .range(["#f8fafc", "#bae6fd", "#38bdf8", "#0284c7"])(val); // Premium gradient teals and ocean blues
      case "wind":
        return d3.scaleLinear<string>()
          .domain([0, 15, 30, 60])
          .range(["#f8fafc", "#e2e8f0", "#94a3b8", "#475569"])(val); // High-end clean gray wind gradients
      case "pressure":
        return d3.scaleLinear<string>()
          .domain([990, 1008, 1020])
          .range(["#ddd6fe", "#f1f5f9", "#c7d2fe"])(val); // Muted professional barometric tones
      case "humidity":
        return d3.scaleLinear<string>()
          .domain([20, 50, 80, 100])
          .range(["#fef3c7", "#fde68a", "#a5f3fc", "#22d3ee"])(val); // Soft desert sand -> Vibrant hydration teals
      case "drought":
        return d3.scaleLinear<string>()
          .domain([0, 0.3, 0.6, 1.0])
          .range(["#86efac", "#fcd34d", "#f87171", "#ef4444"])(val); // Balanced environmental alert steps
      case "cloud":
        return d3.scaleLinear<string>()
          .domain([0, 40, 80, 100])
          .range(["#f1f5f9", "#cbd5e1", "#94a3b8", "#475569"])(val); // Natural meteorological coverage gradients
      default:
        return d3.scaleLinear<string>()
          .domain([0, 100])
          .range(["#e2e8f0", "#3b82f6"])(val);
    }
  };

  // Dynamically shift state values using timeline progression offsets
  const getStateValue = (stateName: string): number => {
    const norm = normalizeStateName(stateName);
    const cleanS = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
    const climate = cleanS ? STATE_DATA[cleanS] : null;
    if (!climate) return 25;

    // Generates a unique, repeatable geographical wave pattern per state
    let hash = 0;
    for (let i = 0; i < stateName.length; i++) {
      hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // TEMPORAL MODULATION WAVE: Changes the weather matrix profile based on the bottom timeline day index
    const timeFactor = activeTimeIndex * 0.25; 
    const dynamicOffset = Math.sin(hash + activeTimeIndex) * 2.0;

    let base = 25;
    if (activeLayerId === "temp") {
      // Temperature compounds over days if the simulator shift is positive
      base = climate.temp + (simulation.tempOffset * (1 + timeFactor)) + dynamicOffset;
    } else if (activeLayerId === "precip") {
      // Rain scaling dynamically alters precipitation volumes along the timeline steps
      base = climate.rain * (simulation.rainIntensity / 100) * (1 + (Math.cos(hash + timeFactor) * 0.15));
    } else if (activeLayerId === "wind") {
      base = climate.wind * (1 + (activeTimeIndex * 0.1)) + Math.abs(dynamicOffset);
    } else if (activeLayerId === "pressure") {
      base = climate.pressure - (activeTimeIndex * 2) + dynamicOffset;
    } else if (activeLayerId === "humidity") {
      base = Math.max(10, Math.min(100, climate.humidity + (simulation.tempOffset * -3 * activeTimeIndex)));
    } else if (activeLayerId === "drought") {
      base = climate.drought * (1 + (simulation.tempOffset > 0 ? simulation.tempOffset * 0.15 * activeTimeIndex : 0));
    } else if (activeLayerId === "cloud") {
      base = Math.max(0, Math.min(100, climate.cloud + (activeTimeIndex * 5 * (simulation.rainIntensity > 100 ? 1 : -0.5))));
    }
    return Number(base.toFixed(1));
  };

  const getDistrictValue = (distName: string, stateName: string): number => {
    const parentVal = getStateValue(stateName);
    let hash = 0;
    for (let i = 0; i < distName.length; i++) {
      hash = distName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const ratio = (Math.abs(hash % 200) / 200) * 0.30 - 0.15; // varies ±15%
    return Number((parentVal * (1 + ratio)).toFixed(1));
  };

  // Viewbox animations
  const animateViewBox = (targetVB: string, duration = 650) => {
    const svg = svgRef.current;
    if (!svg) return;
    const fromStr = svg.getAttribute('viewBox') || `0 0 ${dimensions.width} ${dimensions.height}`;
    const from = fromStr.split(' ').map(Number);
    const to = targetVB.split(' ').map(Number);
    const start = performance.now();

    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const et = ease(t);
      const vb = from.map((f, i) => f + (to[i] - f) * et).join(' ');
      svg.setAttribute('viewBox', vb);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const pathGenRef = useRef<any>(null);
  pathGenRef.current = pathGen;

  const zoomToState = (stateFeature: any) => {
    const pathG = pathGenRef.current;
    if (!pathG) return;
    
    // Get absolute bounding box of the state geometry
    const [[x0, y0], [x1, y1]] = pathG.bounds(stateFeature);
    const stateW = x1 - x0;
    const stateH = y1 - y0;
    
    // Find geometric center of the shape
    const stateCenterX = x0 + stateW / 2;
    const stateCenterY = y0 + stateH / 2;
    
    // Read the exact, live layout width and height from the DOM container bounding box
    const currentW = containerRef.current ? containerRef.current.getBoundingClientRect().width : dimensions.width;
    const currentH = containerRef.current ? containerRef.current.getBoundingClientRect().height : dimensions.height;
    
    // Prevent bad mathematical divisions
    const finalRenderW = currentW > 0 ? currentW : 700;
    const finalRenderH = currentH > 0 ? currentH : 600;
    
    // Calculate aspect ratio scale based tightly on the live container size
    const viewScale = Math.max(stateW / finalRenderW, stateH / finalRenderH) * 1.15;
    const finalW = finalRenderW * viewScale;
    const finalH = finalRenderH * viewScale;
    
    // Align viewport coordinates directly over the state center point
    const finalX = stateCenterX - finalW / 2;
    const finalY = stateCenterY - finalH / 2;
    
    const newVB = `${finalX} ${finalY} ${finalW} ${finalH}`;
    stateViewBoxRef.current = newVB;
    
    if (svgRef.current) {
      svgRef.current.setAttribute('viewBox', newVB);
    }
    animateViewBox(newVB);
  };

  const getStateBounds = (stateName: string) => {
    const norm = normalizeStateName(stateName);
    const feature = statesGeoRef.current?.features.find(
      (f: any) => normalizeStateName(f.properties.NAME_1 || f.properties.ST_NM || '') === norm
    );
    if (!feature) return null;
    const bounds = pathGen.bounds(feature);
    if (!bounds || isNaN(bounds[0][0])) return null;
    const [[x0, y0], [x1, y1]] = bounds;
    const pad = Math.min(dimensions.width, dimensions.height) * 0.08;
    return `${x0 - pad} ${y0 - pad} ${x1 - x0 + pad * 2} ${y1 - y0 + pad * 2}`;
  };

  const fullIndiaViewBox = `0 0 ${dimensions.width} ${dimensions.height}`;

  // Clicks
  const handleStateClick = (stateName: string) => {
    setSelectedState(stateName);
    setLevel('state');
    
    // Broadcast geographic target selection cleanly up to parent shell
    window.dispatchEvent(new CustomEvent('region-select-update', { detail: stateName }));
    
    // Find state feature to pass to zoomToState
    const norm = normalizeStateName(stateName);
    const feature = statesGeoRef.current?.features.find(
      (f: any) => normalizeStateName(f.properties.NAME_1 || f.properties.ST_NM || '') === norm
    );
    if (feature) {
      setTimeout(() => {
        zoomToState(feature);
      }, 50);
    } else {
      setTimeout(() => {
        const vb = getStateBounds(stateName);
        if (vb) {
          stateViewBoxRef.current = vb;
          animateViewBox(vb);
        }
      }, 50);
    }
  };

  const handleDistrictClick = (districtName: string) => {
    setSelectedDistrict(districtName);
    setLevel('district');
    // Reset to full state view on left side
    if (stateViewBoxRef.current) {
      animateViewBox(stateViewBoxRef.current); // full state bounds, not zoomed
    }
  };

  const handleBackToIndia = () => {
    setLevel('india');
    setSelectedState(null);
    setSelectedDistrict(null);
    // Smooth 500ms transition back to full India
    animateViewBox(fullIndiaViewBox, 500);
  };

  const handleBackToState = () => {
    setLevel('state');
    setSelectedDistrict(null);
    if (stateViewBoxRef.current) {
      animateViewBox(stateViewBoxRef.current);
    } else {
      const vb = getStateBounds(selectedState!);
      if (vb) animateViewBox(vb);
    }
  };

  // Map Panning (click & drag to pan, no stretch, hard bounds clamped)
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const svgEl = svgRef.current;
    if (!svgEl) return;

    let isDragging = false;
    let startX = 0, startY = 0;
    const svgWidth = dimensions.width;
    const svgHeight = dimensions.height;

    // Define the FIXED full-India viewBox — never change these base values
    const INDIA_VB = { x: 0, y: 0, w: svgWidth, h: svgHeight };

    // Hard bounds — map cannot be panned beyond these limits
    const PAN_BOUNDS = {
      minX: -svgWidth * 0.3,
      maxX: svgWidth * 0.3,
      minY: -svgHeight * 0.3,
      maxY: svgHeight * 0.3,
    };

    // In the pan/drag handler, clamp the viewBox:
    const clampViewBox = (x: number, y: number, w: number, h: number) => {
      if (level !== 'india') {
        return {
          x: Math.max(-svgWidth, Math.min(svgWidth * 1.5, x)),
          y: Math.max(-svgHeight, Math.min(svgHeight * 1.5, y)),
          w,
          h,
        };
      }
      return {
        x: Math.max(PAN_BOUNDS.minX, Math.min(PAN_BOUNDS.maxX, x)),
        y: Math.max(PAN_BOUNDS.minY, Math.min(PAN_BOUNDS.maxY, y)),
        w: INDIA_VB.w,  // width NEVER changes
        h: INDIA_VB.h,  // height NEVER changes
      };
    };

    let currentVB = { x: 0, y: 0, w: dimensions.width, h: dimensions.height };

    // Parse current viewBox
    const getVB = () => {
      const vb = svgEl.getAttribute('viewBox')?.split(' ').map(Number);
      if (vb) { currentVB = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] }; }
      return currentVB;
    };

    const onMouseDown = (e: MouseEvent) => {
      // Only pan on left click, not on state/district clicks
      if ((e.target as SVGElement).classList.contains('state-path') ||
          (e.target as SVGElement).classList.contains('district-path')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      getVB();
      svg.style('cursor', 'grabbing');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const vb = currentVB;
      // Scale mouse delta to viewBox coordinate space
      const rect = svgEl.getBoundingClientRect();
      const scaleX = vb.w / rect.width;
      const scaleY = vb.h / rect.height;
      const dx = (e.clientX - startX) * scaleX;
      const dy = (e.clientY - startY) * scaleY;

      const targetX = vb.x - dx;
      const targetY = vb.y - dy;
      const clamped = clampViewBox(targetX, targetY, vb.w, vb.h);

      svgEl.setAttribute('viewBox', `${clamped.x} ${clamped.y} ${clamped.w} ${clamped.h}`);
    };

    const onMouseUp = () => {
      isDragging = false;
      svg.style('cursor', 'default');
      getVB(); // save final position
    };

    svgEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support for mobile
    let touchStartX = 0, touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      getVB();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const vb = currentVB;
      const rect = svgEl.getBoundingClientRect();
      const scaleX = vb.w / rect.width;
      const scaleY = vb.h / rect.height;
      const dx = (e.touches[0].clientX - touchStartX) * scaleX;
      const dy = (e.touches[0].clientY - touchStartY) * scaleY;

      const targetX = vb.x - dx;
      const targetY = vb.y - dy;
      const clamped = clampViewBox(targetX, targetY, vb.w, vb.h);

      svgEl.setAttribute('viewBox', `${clamped.x} ${clamped.y} ${clamped.w} ${clamped.h}`);
    };

    svgEl.addEventListener('touchstart', onTouchStart, { passive: true });
    svgEl.addEventListener('touchmove', onTouchMove, { passive: false });

    // Add cursor style
    svgEl.style.cursor = 'grab';

    return () => {
      svgEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      svgEl.removeEventListener('touchstart', onTouchStart);
      svgEl.removeEventListener('touchmove', onTouchMove);
    };
  }, [level, dimensions.width, dimensions.height]);

  // STATE LEVEL: SCROLL-WHEEL ZOOM (only active in Level 2 state view)
  useEffect(() => {
    if (level !== 'state') return; // only active in state view

    const svg = svgRef.current!;
    let currentScale = 1;
    const MIN_SCALE = 1;
    const MAX_SCALE = 8;

    // Store the state's fitted viewBox when we entered Level 2
    // so we can use it as the zoom base
    const baseVB = stateViewBoxRef.current || svg.getAttribute('viewBox') || `0 0 ${dimensions.width} ${dimensions.height}`;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.85 : 1.18;
      currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale * delta));

      // Get cursor position relative to SVG
      const rect = svg.getBoundingClientRect();
      const [bx, by, bw, bh] = baseVB.split(' ').map(Number);

      // Zoom toward cursor
      const cursorX = bx + (e.clientX - rect.left) / rect.width * bw;
      const cursorY = by + (e.clientY - rect.top) / rect.height * bh;

      const newW = bw / currentScale;
      const newH = bh / currentScale;
      const newX = cursorX - (cursorX - bx) / currentScale;
      const newY = cursorY - (cursorY - by) / currentScale;

      svg.setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
    };

    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [level]);

  // Attachment of direct DOM on mouse move for zero-lag performance
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !dataLoaded) return;

    const onMove = (e: MouseEvent) => {
      if (!tooltipRef.current) return;
      const x = e.clientX + 16;
      const y = e.clientY - 10;
      const tt = tooltipRef.current;
      tt.style.left = (x + 220 > window.innerWidth ? e.clientX - 234 : x) + 'px';
      tt.style.top = (y + 160 > window.innerHeight ? e.clientY - 170 : y) + 'px';
    };

    const onEnterState = (e: Event) => {
      const path = e.currentTarget as SVGPathElement;
      const name = path.dataset.state || '';
      const norm = normalizeStateName(name);
      const cleanS = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
      const data = cleanS ? STATE_DATA[cleanS] : null;
      if (!tooltipRef.current || !data) return;
      const tt = tooltipRef.current;
      tt.querySelector('.tt-name')!.textContent = name.toUpperCase();
      tt.querySelector('.tt-temp')!.textContent = `${data.temp}°C`;
      tt.querySelector('.tt-rain')!.textContent = `${data.rain}mm`;
      tt.querySelector('.tt-humid')!.textContent = `${data.humidity}%`;
      tt.querySelector('.tt-drought')!.textContent = `${data.drought} idx`;
      const alertLevel = getAlertLevel(data);
      tt.querySelector('.tt-alert')!.textContent = alertLevel;
      tt.querySelector('.tt-alert')!.className = `tt-alert alert-${alertLevel.toLowerCase()}`;
      tt.style.opacity = '1';
      path.style.filter = 'brightness(1.25)';
    };

    const onEnterDistrict = (e: Event) => {
      const path = e.currentTarget as SVGPathElement;
      const name = path.dataset.district || '';
      if (!tooltipRef.current) return;
      const tt = tooltipRef.current;
      tt.querySelector('.tt-name')!.textContent = name.toUpperCase();
      const base = STATE_DATA[selectedState || ''];
      if (base) {
        const seed = name.length;
        const vary = (v: number, pct: number) => Math.round(v * (1 + ((seed % 7) - 3) * pct / 100) * 10) / 10;
        tt.querySelector('.tt-temp')!.textContent = `${vary(base.temp, 15)}°C`;
        tt.querySelector('.tt-rain')!.textContent = `${vary(base.rain, 20)}mm`;
        tt.querySelector('.tt-humid')!.textContent = `${vary(base.humidity, 10)}%`;
        tt.querySelector('.tt-drought')!.textContent = `${Math.round(vary(base.drought, 25) * 100) / 100} idx`;
      }
      const alertLevel = base ? getAlertLevel(base) : 'GREEN';
      tt.querySelector('.tt-alert')!.textContent = alertLevel;
      tt.querySelector('.tt-alert')!.className = `tt-alert alert-${alertLevel.toLowerCase()}`;
      tt.style.opacity = '1';
      path.style.filter = 'brightness(1.3)';
    };

    const onLeave = (e: Event) => {
      if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      (e.currentTarget as SVGPathElement).style.filter = '';
    };

    const attachListeners = () => {
      svg.querySelectorAll('.state-path').forEach(p => {
        p.addEventListener('mouseenter', onEnterState);
        p.addEventListener('mouseleave', onLeave);
      });
      svg.querySelectorAll('.district-path').forEach(p => {
        p.addEventListener('mouseenter', onEnterDistrict);
        p.addEventListener('mouseleave', onLeave);
      });
    };

    svg.addEventListener('mousemove', onMove);
    const observer = new MutationObserver(attachListeners);
    observer.observe(svg, { childList: true, subtree: true });
    attachListeners();

    return () => {
      svg.removeEventListener('mousemove', onMove);
      observer.disconnect();
    };
  }, [dataLoaded, level, selectedState]);

  // Loading Screen Render
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

  // Error boundary State Render
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
      
      {/* In the map container div: */}
      <div className={`map-area ${level === 'district' ? 'split-view' : ''}`}>
        
        <div className="map-svg-container">
          
          {/* LEVEL BACK FLOATING CONTROL */}
          {level !== 'india' && (
            <button className="back-btn" onClick={level === 'state' ? handleBackToIndia : handleBackToState}>
              ← {level === 'state' ? 'All States' : selectedState}
            </button>
          )}

          {/* ACTIVE DISCIPLINED AREA INDICATOR FOCUS BADGE */}
          {level !== 'india' && (
            <div className="focus-badge">
              <div className="focus-label">ACTIVE FOCUS AREA</div>
              <div className="focus-name">{level === 'district' ? selectedDistrict : selectedState}</div>
            </div>
          )}

          {/* GEOGRAPHIC GRID COORDINATES NOTIFICATION */}
          <div className="absolute top-4 right-4 z-40 pointer-events-none">
            <div className="bg-bg-surface/80 border border-border-default backdrop-blur-md px-3 py-1.5 rounded-xl text-[8.5px] font-mono font-extrabold text-text-secondary uppercase">
              ZONE: <span className="text-text-primary">{selectedState ? selectedState : "ALL INDIA SUB-GRID"}</span>
            </div>
          </div>

          {/* REALISTIC AGENCY ALERTS OPERATIONAL WINDOW */}
          {level === 'state' && selectedState && (
            (() => {
              const norm = normalizeStateName(selectedState);
              const cleanS = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
              const data = cleanS ? STATE_DATA[cleanS] : null;
              if (!data) return null;
              
              const isRed = data.rain > 200 || data.temp > 42;
              const isOrange = !isRed && (data.rain > 100 || data.temp > 38 || data.drought > 0.6);
              
              if (!isRed && !isOrange) return null;

              const alertTitle = data.temp > 40 ? "SEVERE HEATWAVE CONDITIONS" : data.rain > 150 ? "FLASH FLOOD WARNING" : "EXTREME DROUGHT SITUATION";
              const advisoryText = data.temp > 40 
                ? "LST thresholds exceeded. Immediate risk of crop desiccation and power grid load anomalies across local subgrids."
                : "Extreme precipitation anomaly detected. Critical risk of local catchment overflow and immediate structural inundation.";
              const hoursRemaining = isRed ? "18h 42m 05s" : "44h 12m 30s";

              return (
                <div className="absolute top-16 left-4 z-40 bg-white border-l-4 border-l-accent-red border border-border-default p-4 rounded-xl shadow-xl max-w-[290px] font-sans">
                  <div className="text-[10px] font-mono font-black tracking-widest text-accent-red flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-red inline-block" />
                    IMD NATIONAL BULLETIN
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-[12px] font-bold text-slate-900 tracking-tight">{alertTitle}</div>
                    <p className="text-[10px] text-slate-600 leading-normal normal-case font-medium pt-0.5">
                      {advisoryText}
                    </p>
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex flex-col gap-1">
                      <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">NEXT RESOURCE DEPLOYMENT DEADLINE:</div>
                      <div className="text-accent-red font-mono font-bold text-[13px] tracking-wider">{hoursRemaining}</div>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          <button className="reset-view-btn" onClick={() => {
            if (level === 'state' && stateViewBoxRef.current) {
              animateViewBox(stateViewBoxRef.current);
            } else {
              animateViewBox(`0 0 ${dimensions.width} ${dimensions.height}`);
            }
          }}>
            ⌖ Reset
          </button>

          {/* PRIMARY MAP DRAW CANVAS COMPONENT */}
          <svg
            ref={svgRef}
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            viewBox={fullIndiaViewBox}
            style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}
          >
            <g style={{ willChange: 'transform' }}>
              {/* Level 1: render all states */}
              {level === 'india' && statesGeoRef.current?.features.map((f: any, idx: number) => {
                const rawName = f.properties.NAME_1 || f.properties.ST_NM || f.properties.STATE || '';
                const climateVal = getStateValue(rawName);
                return (
                  <path
                    key={`state-${rawName}-${idx}`}
                    className="state-path"
                    d={pathGen(f) || ''}
                    data-state={rawName}
                    fill={getColor(climateVal)}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                    style={{ transition: 'fill 600ms ease-in-out' }} // Smooth color morphing transition animation
                    onClick={() => handleStateClick(rawName)}
                  />
                );
              })}

              {/* Level 2 & 3: render districts of selected state only */}
              {(level === 'state' || level === 'district') && (
                districtsGeoRef.current?.features
                  .filter((f: any) => {
                    const stateProp = f.properties.ST_NM || f.properties.STATE || f.properties.st_nm || f.properties.NAME_1 || '';
                    return stateProp.toLowerCase() === selectedState?.toLowerCase() ||
                           normalizeStateName(stateProp) === normalizeStateName(selectedState || ''); // matches clean format
                  })
                  .map((f: any, idx: number) => {
                    const dName = f.properties.DISTRICT || f.properties.dtname || f.properties.NAME_2 || f.properties.NAME || '';
                    const isSelected = dName === selectedDistrict;
                    const dVal = getDistrictValue(dName, selectedState!);

                    return (
                      <path
                        key={`district-${dName}-${idx}`}
                        className={`district-path ${isSelected ? 'selected' : ''}`}
                        d={pathGen(f) || ''}
                        data-district={dName}
                        fill={isSelected ? 'var(--accent-blue)' : getColor(dVal)}
                        stroke={isSelected ? '#0f172a' : 'rgba(255,255,255,0.4)'}
                        strokeWidth={isSelected ? 1.4 : 0.6}
                        onClick={() => handleDistrictClick(dName)}
                      />
                    );
                  })
              )}
            </g>
          </svg>

          {/* FLOATING CURSOR ZERO-LAG MULTI-METRIC TOOLTIP */}
          <div ref={tooltipRef} className="map-tooltip">
            <div className="tt-header">
              <span className="tt-name"></span>
              <span className="tt-alert"></span>
            </div>
            <div className="tt-grid">
              <div className="tt-item"><span className="tt-icon">🌡</span><span className="tt-label">TEMP</span><span className="tt-temp tt-val"></span></div>
              <div className="tt-item"><span className="tt-icon">🌧</span><span className="tt-label">RAIN</span><span className="tt-rain tt-val"></span></div>
              <div className="tt-item"><span className="tt-icon">💧</span><span className="tt-label">HUMIDITY</span><span className="tt-humid tt-val"></span></div>
              <div className="tt-item"><span className="tt-icon">🏜</span><span className="tt-label">DROUGHT</span><span className="tt-drought tt-val"></span></div>
            </div>
            <div className="tt-hint">
              {level === 'india' ? 'Click to explore districts →' : 'Click for full telemetry →'}
            </div>
          </div>

          {/* Zoom hint when we enter level 2 state view */}
          {level === 'state' && (
            <div className="zoom-hint">
              Scroll to zoom · Drag to pan
            </div>
          )}

        </div>

        {/* LEVEL 3 DISTRICT TELEMETRY CLIMATE SIDE PANEL */}
        {level === 'district' && selectedDistrict && (
          <div className="district-detail-panel shadow-2xl hide-scrollbar flex flex-col">
            <div className="dp-header shrink-0">
              <div>
                <div className="dp-dot flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--accent-green)] rounded-full inline-block animate-ping" />
                  <span>PILOT ZONE TELEMETRY</span>
                </div>
                <h2 className="dp-title">{selectedDistrict}</h2>
                <p className="dp-sub">{selectedState?.toUpperCase()} • GRID ZONE {Math.floor(Math.random() * 90) + 10}</p>
              </div>
              <button className="dp-close hover:border-[var(--accent-blue)] hover:text-text-primary duration-150 flex items-center justify-center font-bold" onClick={handleBackToState}>✕</button>
            </div>

            <div className="dp-tabs shrink-0 bg-bg-surface/50">
              {['FORECAST', 'AGRICULTURE', 'IMD DATA', 'ANALYSIS'].map(tab => (
                <button
                  key={tab}
                  className={`dp-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar bg-bg-surface">
              {activeTab === 'FORECAST' && <DistrictForecastTab district={selectedDistrict} state={selectedState!} />}
              {activeTab === 'IMD DATA' && <DistrictIMDTab district={selectedDistrict} state={selectedState!} />}
              {activeTab === 'AGRICULTURE' && <DistrictAgriTab district={selectedDistrict} state={selectedState!} />}
              {activeTab === 'ANALYSIS' && <DistrictAnalysisTab district={selectedDistrict} state={selectedState!} />}
            </div>
          </div>
        )}

        {/* Core layout animations vector compiler */}
        <style>{`
          @keyframes ventuskyFlow {
            0% {
              stroke-dashoffset: 100;
            }
            100% {
              stroke-dashoffset: 0;
            }
          }
        `}</style>
      </div>

    </div>
  );
});

MapViewComponent.displayName = "MapView";

/* --- TAB INSERTS FOR DISTRICT PANELS --- */

const DistrictForecastTab = ({ district, state }: { district: string, state: string }) => {
  const norm = normalizeStateName(state);
  const cleanS = Object.keys(STATE_DATA).find(k => k.toLowerCase() === norm);
  const data = cleanS ? STATE_DATA[cleanS] : { temp: 28, rain: 100, humidity: 65, wind: 15 };

  const seed = district.length;
  const tempVal = Number((data.temp * (1 + ((seed % 5) - 2) * 0.05)).toFixed(1));
  const rainVal = Math.round(data.rain * (1 + ((seed % 5) - 2) * 0.1));

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const forecast = days.map((day, idx) => {
    const dailyTempMax = Math.round(tempVal + Math.sin(idx * 1.5 + seed) * 3);
    const dailyTempMin = Math.round(tempVal - 4 + Math.cos(idx * 1.5 + seed) * 2);
    const rainChance = Math.max(0, Math.min(100, Math.round((rainVal > 50 ? 60 : 20) + Math.sin(idx + seed) * 30)));
    let icon = "⛅";
    if (rainChance > 70) icon = "⛈";
    else if (rainChance > 40) icon = "🌧";
    else if (dailyTempMax > 38) icon = "☀";
    return { day, max: dailyTempMax, min: dailyTempMin, rain: rainChance, icon };
  });

  const hours = ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
  const pointsTemp = hours.map((_, idx) => {
    const h = idx * 50 + 25;
    const factor = Math.sin((idx / 5) * Math.PI) * 10;
    const val = tempVal - 5 + factor;
    const ratio = (val - 10) / 40;
    const y = 80 - ratio * 70;
    return `${h},${y}`;
  });

  const pointsHumid = hours.map((_, idx) => {
    const h = idx * 50 + 25;
    const factor = Math.cos((idx / 5) * Math.PI) * 15;
    const val = data.humidity + factor;
    const ratio = val / 100;
    const y = 80 - ratio * 70;
    return `${h},${y}`;
  });

  return (
    <div className="p-5 flex flex-col gap-4 font-sans select-none overflow-y-auto">
      <div className="bg-bg-elevated border border-[var(--border-default)] rounded-xl px-4 py-3 text-[10px] uppercase font-mono tracking-wider text-[var(--accent-green)] flex items-center gap-2">
        <span className="w-2 h-2 bg-[var(--accent-green)] rounded-full animate-ping shrink-0" />
        <span>SYSTEM STATUS: NOMINAL — All seasonal matrices within standard error boundaries</span>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mt-1">
        {forecast.map((f, i) => (
          <div key={i} className="bg-bg-elevated border border-[var(--border-default)] rounded-xl p-2 text-center flex flex-col justify-between h-24 hover:border-[var(--border-bright)] duration-150">
            <span className="text-[10px] font-mono font-bold text-[var(--text-secondary)]">{f.day}</span>
            <span className="text-lg my-1">{f.icon}</span>
            <div className="text-[9.5px] font-mono font-bold mt-1">
              <span className="text-[var(--text-primary)]">{f.max}°</span>
              <span className="text-[var(--text-muted)] ml-1">/{f.min}°</span>
            </div>
            <span className="text-[8px] font-mono font-bold text-accent-cyan mt-1 leading-none">{f.rain}%</span>
          </div>
        ))}
      </div>

      <div className="bg-bg-elevated border border-[var(--border-default)] p-4 rounded-xl flex flex-col gap-2">
        <span className="text-[9.5px] font-display font-black text-[var(--text-primary)] uppercase tracking-wider">
          24-Hour Met-Cycle Progression
        </span>
        <div className="h-28 w-full mt-2 relative">
          <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
            {[20, 50, 80].map((y, idx) => (
              <line key={idx} x1="10" y1={y} x2="290" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
            ))}
            <path d={`M ${pointsTemp.join(" L ")}`} fill="none" stroke="var(--accent-orange)" strokeWidth="2" strokeLinecap="round" />
            <path d={`M ${pointsHumid.join(" L ")}`} fill="none" stroke="var(--accent-green)" strokeWidth="1.8" strokeDasharray="4 3" strokeLinecap="round" />
            {pointsTemp.map((p, idx) => {
              const [x, y] = p.split(",").map(Number);
              return <circle key={idx} cx={x} cy={y} r="2.5" fill="var(--accent-orange)" />;
            })}
            {pointsHumid.map((p, idx) => {
              const [x, y] = p.split(",").map(Number);
              return <circle key={idx} cx={x} cy={y} r="2.5" fill="var(--accent-green)" />;
            })}
          </svg>
        </div>
        <div className="flex justify-between text-[8px] font-mono text-[var(--text-secondary)] px-1">
          {hours.map((h, i) => (
            <span key={i}>{h}</span>
          ))}
        </div>
        
        <div className="flex justify-center gap-4 mt-2 text-[8.5px] font-mono text-[var(--text-secondary)]">
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

      <div className="grid grid-cols-2 gap-3 mt-1">
        <div className="bg-bg-elevated border border-[var(--border-default)] p-3.5 rounded-xl">
          <span className="text-[8px] font-mono font-bold text-[var(--text-secondary)] uppercase block mb-1 font-extrabold tracking-wider">Wind Shear</span>
          <span className="text-base font-mono font-extrabold text-[var(--text-primary)]">{data.wind} km/h</span>
          <span className="text-[8px] font-mono text-[var(--accent-green)] block mt-1 uppercase font-bold">Direction: WSW</span>
        </div>
        <div className="bg-bg-elevated border border-[var(--border-default)] p-3.5 rounded-xl">
          <span className="text-[8px] font-mono font-bold text-[var(--text-secondary)] uppercase block mb-1 font-extrabold tracking-wider">UV Index</span>
          <span className="text-base font-mono font-extrabold text-[var(--accent-orange)]">
            {(4 + (seed % 6))} UV
          </span>
          <span className="text-[8px] font-mono text-[var(--text-muted)] block mt-1 uppercase font-bold">Moderate Exposure</span>
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

const DistrictAgriTab = ({ district, state }: { district: string, state: string }) => {
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  const seed = district.length;
  const cropStress = Math.round(25 + (seed % 7) * 8);
  const floodRisk = Math.round(15 + (seed % 5) * 16);
  const soilMoisture = Math.round(45 + (seed % 6) * 7);

  let advisory = "";
  if (cropStress > 60) {
    advisory = "CRITICAL: Moisture stress detected inside soil subgrids. Restrict fertilizer use until rains resume. Recommend potassium nitrate foliar spray to shield crop cells.";
  } else if (floodRisk > 60) {
    advisory = "ALERT: High inundation risks indices. Open field bund channels to restrict soil erosion and prevent waterlogging around tender crop root structures.";
  } else {
    advisory = "NORMAL: Optimal structural micro-climate and soil conditions. Proceed with standard nitrogen crop fertilizer top dressing and rabi sow cycles.";
  }

  const drawProgress = (val: number, colorClass: string) => {
    return (
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200 relative">
        <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${val}%` }} />
      </div>
    );
  };

  return (
    <div className="p-5 flex flex-col gap-4 font-sans select-none overflow-y-auto">
      <div className="bg-bg-elevated border border-[var(--border-default)] p-4 rounded-xl flex flex-col gap-4">
        <span className="text-[9.5px] font-display font-black text-[var(--text-primary)] uppercase tracking-wider border-b border-white/5 pb-2">
          Agronomic Stress Telemetry
        </span>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[9px] font-mono text-[var(--text-secondary)]">
            <span>Crop Stress Index</span>
            <span className={cropStress > 60 ? "text-accent-red font-bold" : "text-accent-green font-bold"}>{cropStress}%</span>
          </div>
          {drawProgress(cropStress, cropStress > 60 ? "bg-accent-red" : cropStress > 40 ? "bg-accent-orange" : "bg-accent-green")}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[9px] font-mono text-[var(--text-secondary)]">
            <span>Flood Risk Index</span>
            <span className={floodRisk > 60 ? "text-accent-red font-bold" : "text-accent-cyan font-bold"}>{floodRisk}%</span>
          </div>
          {drawProgress(floodRisk, floodRisk > 60 ? "bg-accent-red" : floodRisk > 40 ? "bg-accent-orange" : "bg-accent-blue")}
        </div>

        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-white/5">
          <div className="flex justify-between text-[9px] font-mono text-[var(--text-secondary)]">
            <span>Soil Moisture (VWC)</span>
            <span className="text-accent-cyan font-bold">{soilMoisture}%</span>
          </div>
          {drawProgress(soilMoisture, "bg-accent-cyan")}
        </div>
      </div>

      <div className="bg-bg-elevated borderMain border-l-4 border-l-accent-orange border border-[var(--border-default)] p-4 rounded-xl flex flex-col gap-2">
        <div className="flex justify-between items-center w-full">
          <span className="text-[9.5px] font-display font-black text-accent-orange uppercase tracking-wider leading-none">
            Agronomic Advisory System
          </span>
          <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-mono font-black animate-pulse">
            WHATSAPP EDGE READY
          </span>
        </div>
        
        <p className="text-[10px] text-[var(--text-secondary)] mt-1.5 leading-relaxed font-mono uppercase">
          {advisory}
        </p>

        {/* CONDITIONALLY UNLOCKED LAST-MILE VOICE BROADCAST BUTTON */}
        {(floodRisk > 60 || cropStress > 60) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
            <div className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              LAST-MILE AUDIO BROADCAST (ILLITERATE INCLUSION NODE)
            </div>
            <div className="flex gap-2">
              <button
                disabled={isDispatching || dispatchSuccess}
                onClick={() => {
                  // DIRECT BROWSER COMPLIANT NEURAL SPEECH SYNTHESIS ENGINE ACCELERATION
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel(); // Flush stuck queues immediately
                    
                    const warningText = "चेतावनी: जैसलमेर में भारी बाढ़ का खतरा है। कृपया अपने खेत के बांधों को खोलें ताकि फसल का नुकसान न हो।";
                    const utterance = new SpeechSynthesisUtterance(warningText);
                    
                    // Force clean Indian Hindi locale bindings
                    utterance.lang = 'hi-IN';
                    utterance.rate = 0.85;
                    utterance.volume = 1.0;

                    // Fetch live voices array
                    const systemVoices = window.speechSynthesis.getVoices();
                    
                    // Explicitly bind to an active Indian voice engine if available in browser memory
                    const localizedVoice = systemVoices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi_IN'));
                    if (localizedVoice) {
                      utterance.voice = localizedVoice;
                    }

                    // Explicitly fire speech channel output
                    window.speechSynthesis.speak(utterance);
                  } else {
                    console.warn("Speech synthesis interface not active or blocked by host browser protocols.");
                  }

                  setIsDispatching(true);
                  setTimeout(() => {
                    setIsDispatching(false);
                    setDispatchSuccess(true);
                  }, 1200);
                }}
                className={`flex-1 py-2 rounded-lg text-[9px] font-mono font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  dispatchSuccess 
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 font-extrabold"
                    : "bg-emerald-600 hover:bg-emerald-700 border-transparent text-white shadow-sm"
                }`}
              >
                {isDispatching ? "🔄 SYNTHESIZING LOCAL AUDIO PLUME..." : dispatchSuccess ? "✅ WHATSAPP VOICE BROADCAST DISPATCHED" : "🔊 DISPATCH WHATSAPP VOICE NOTE"}
              </button>
            </div>
            
            {dispatchSuccess && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 animate-fade-in text-left">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-500 font-mono">LIVE LOCAL CHANNELS AUDIO FEED (NEURAL HINDI):</span>
                  <button 
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const warningText = "चेतावनी: जैसलमेर में भारी बाढ़ का खतरा है। कृपया अपने खेत के बांधों को खोलें ताकि फसल का नुकसान न हो।";
                        const utterance = new SpeechSynthesisUtterance(warningText);
                        utterance.lang = 'hi-IN';
                        utterance.rate = 0.85;
                        utterance.volume = 1.0;

                        const systemVoices = window.speechSynthesis.getVoices();
                        const localizedVoice = systemVoices.find(v => v.lang.includes('hi-IN') || v.lang.includes('hi_IN'));
                        if (localizedVoice) {
                          utterance.voice = localizedVoice;
                        }
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] font-mono font-bold hover:bg-emerald-200 cursor-pointer"
                  >
                    ▶ REPLAY AUDIO BROADCAST
                  </button>
                </div>
                <p className="text-[10px] font-mono font-extrabold text-slate-700 tracking-wide bg-white border border-slate-200 p-2 rounded-lg leading-relaxed">
                  "चेतावनी: जैसलमेर में भारी बाढ़ का खतरा है (७९%)। कृपया अपने खेत के बांधों को खोलें ताकि फसल का नुकसान न हो।"
                </p>
              </div>
            )}
          </div>
        )}
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
