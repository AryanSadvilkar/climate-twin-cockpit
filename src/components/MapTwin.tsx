import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Thermometer, CloudRain, Droplets, Cpu } from 'lucide-react';

// District Data Interface
export interface DistrictClimateData {
  temp: number; // in Celsius
  rainfall: number; // in mm
  humidity: number; // in %
  cropStress: number; // 0 to 100
  floodRisk: number; // 0 to 100
  waterAvailability: number; // 0 to 100
  heatVulnerability: number; // 0 to 100
  aiForecast: string; // text prediction
  Dist_Code?: string; // district administrative code
}

interface MapTwinProps {
  activeLayer: string; // 'temp' | 'rainfall' | 'humidity' | 'flood' | 'crop' | 'ai'
  tempOffset: number; // What-If offset
  rainfallOffset: number; // What-If offset
  humidityOffset: number; // What-If offset
  timelineState: string; // 'current' | '24h' | '72h' | '7d'
  onDistrictSelect: (districtName: string, data: DistrictClimateData) => void;
  districtData: Record<string, DistrictClimateData>;
  selectedDistrict: string | null;
  theme: 'light' | 'dark';
}

export const MapTwin: React.FC<MapTwinProps> = ({
  activeLayer,
  tempOffset,
  rainfallOffset,
  humidityOffset,
  timelineState,
  onDistrictSelect,
  districtData,
  selectedDistrict,
  theme
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const indiaLayerRef = useRef<L.GeoJSON | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // State for tracking hovered district info and cursor position
  const [hoveredDistrict, setHoveredDistrict] = useState<{
    name: string;
    data: DistrictClimateData;
    x: number;
    y: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Helper to determine district color based on current layer & What-If simulation metrics
  const getDistrictColor = (_name: string, data: DistrictClimateData) => {
    // Apply offset modifications locally for visualization
    const temp = Math.max(10, Math.min(50, data.temp + tempOffset));
    const rainfall = Math.max(0, data.rainfall * (1 + rainfallOffset / 100));
    const humidity = Math.max(0, Math.min(100, data.humidity + humidityOffset));
    
    // Recalculate indicators dynamically for display colors
    const cropStress = Math.min(100, Math.max(0, data.cropStress + (tempOffset * 5) - (rainfallOffset * 0.4)));
    const floodRisk = Math.min(100, Math.max(0, data.floodRisk + (rainfallOffset * 0.8) + (tempOffset * 2)));

    // Timeline state modulations
    let timelineMod = 1.0;
    if (timelineState === '24h') timelineMod = 1.05;
    else if (timelineState === '72h') timelineMod = 1.12;
    else if (timelineState === '7d') timelineMod = 1.25;

    switch (activeLayer) {
      case 'temp': {
        const val = temp * timelineMod;
        // Cool green-mint to hot orange-red
        if (val < 26) return '#a7f3d0'; // Mint
        if (val < 30) return '#6ee7b7'; // Sage green
        if (val < 33) return '#fde047'; // Soft yellow
        if (val < 37) return '#f97316'; // Orange
        return '#ef4444'; // Red
      }
      case 'rainfall': {
        const val = rainfall * timelineMod;
        // Deficit beige-orange to heavy rain forest-green-blue
        if (val < 150) return '#fed7aa'; // dry orange-beige
        if (val < 400) return '#a7f3d0'; // soft sage
        if (val < 800) return '#34d399'; // medium green
        if (val < 1500) return '#60a5fa'; // rain blue
        return '#2563eb'; // deep blue
      }
      case 'humidity': {
        const val = Math.min(100, humidity * timelineMod);
        if (val < 45) return '#ffedd5';
        if (val < 65) return '#d1fae5';
        if (val < 80) return '#93c5fd';
        return '#3b82f6';
      }
      case 'flood': {
        const val = Math.min(100, floodRisk * timelineMod);
        if (val < 25) return '#f4f4f0'; // Low risk matches base beige
        if (val < 50) return '#a7f3d0'; // Minor risk
        if (val < 75) return '#fb7185'; // Warning rose
        return '#e11d48'; // Critical red
      }
      case 'crop': {
        const val = Math.min(100, cropStress * timelineMod);
        if (val < 30) return '#d1fae5'; // healthy green
        if (val < 55) return '#fef08a'; // warning yellow
        if (val < 75) return '#fed7aa'; // high stress orange
        return '#f87171'; // critical red
      }
      case 'ai': {
        const val = (cropStress + floodRisk) / 2 * timelineMod;
        if (val < 40) return '#ecfdf5';
        if (val < 60) return '#6ee7b7';
        if (val < 80) return '#a78bfa'; // Violet glow anomaly
        return '#db2777'; // Pink alert
      }
      default:
        return '#10b981';
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center of Maharashtra
    const map = L.map(mapContainerRef.current, {
      center: [19.2, 76.5],
      zoom: 6.5,
      zoomSnap: 0.1,
      minZoom: 5.5,
      maxZoom: 10,
      zoomControl: true,
      attributionControl: true
    });

    mapRef.current = map;

    // CartoDB tiles based on initial theme
    const initTileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
    const tiles = L.tileLayer(initTileUrl, {
      maxZoom: 20,
      opacity: 0.95
    }).addTo(map);
    tileLayerRef.current = tiles;

    // Fetch GeoJSON Boundaries
    Promise.all([
      fetch('/data/india_states.geojson').then((res) => res.json()),
      fetch('/data/maharashtra_districts.geojson').then((res) => res.json())
    ])
      .then(([indiaGeojson, maharashtraGeojson]) => {
        if (!mapRef.current || mapRef.current !== map) return;
        setLoading(false);

        // 1. Draw India States (Dimmed)
        const indiaLayer = L.geoJSON(indiaGeojson, {
          style: (feature) => {
            const isMaharashtra = feature?.properties?.ST_NM === 'Maharashtra';
            return {
              fillColor: theme === 'dark' ? '#0b0f0c' : '#FAF8F5',
              fillOpacity: isMaharashtra ? 0.0 : 0.85, // Dim rest of India with high opacity light/dark bg
              color: theme === 'dark' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(21, 128, 61, 0.06)', // soft green-grey border
              weight: 1.0,
              interactive: false
            };
          }
        }).addTo(map);
        indiaLayerRef.current = indiaLayer;

        // 2. Draw Maharashtra Districts
        const geojsonLayer = L.geoJSON(maharashtraGeojson, {
          style: (feature) => {
            const distName = feature?.properties?.Dist_Name || '';
            const data = districtData[distName] || {
              temp: 28, rainfall: 450, humidity: 65,
              cropStress: 20, floodRisk: 15, waterAvailability: 80, heatVulnerability: 10,
              aiForecast: 'STABLE'
            };
            const col = getDistrictColor(distName, data);
            const isSelected = distName === selectedDistrict;
            return {
              fillColor: col,
              fillOpacity: isSelected ? 0.85 : (theme === 'dark' ? 0.55 : 0.62),
              color: isSelected 
                ? (theme === 'dark' ? '#22c55e' : '#15803d') 
                : (theme === 'dark' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(21, 128, 61, 0.18)'), // border color
              weight: isSelected ? 2.8 : 1.2,
              className: 'district-path'
            };
          },
          onEachFeature: (feature, layer) => {
            const distName = feature.properties.Dist_Name || '';
            const data = districtData[distName] || {
              temp: 28, rainfall: 450, humidity: 65,
              cropStress: 20, floodRisk: 15, waterAvailability: 80, heatVulnerability: 10,
              aiForecast: 'STABLE'
            };

            // Custom Leaflet Tooltip
            layer.bindTooltip(distName, {
              sticky: true,
              direction: 'top',
              opacity: 0.95
            });

            layer.on({
              mouseover: (e) => {
                const target = e.target;
                const isSelected = distName === selectedDistrict;
                
                target.setStyle({
                  weight: isSelected ? 3.0 : 2.5,
                  color: theme === 'dark' ? '#22c55e' : '#15803d'
                });
                
                if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                  target.bringToFront();
                }

                // Show floating glass HTML tooltip
                setHoveredDistrict({
                  name: distName,
                  data: data,
                  x: e.originalEvent.clientX,
                  y: e.originalEvent.clientY
                });
              },
              mousemove: (e) => {
                setHoveredDistrict((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY
                  };
                });
              },
              mouseout: (e) => {
                const target = e.target;
                const isSelected = distName === selectedDistrict;
                target.setStyle({
                  weight: isSelected ? 2.8 : 1.2,
                  color: isSelected 
                    ? (theme === 'dark' ? '#22c55e' : '#15803d') 
                    : (theme === 'dark' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(21, 128, 61, 0.18)')
                });
                setHoveredDistrict(null);

                // If there's a selected district, bring it back to front so its shadow renders correctly
                if (selectedDistrict && geojsonLayerRef.current) {
                  geojsonLayerRef.current.eachLayer((l: any) => {
                    if (l.feature.properties.Dist_Name === selectedDistrict) {
                      l.bringToFront();
                    }
                  });
                }
              },
              click: () => {
                onDistrictSelect(distName, data);
                map.fitBounds((layer as any).getBounds(), {
                  padding: [100, 100],
                  maxZoom: 8.5,
                  animate: true,
                  duration: 0.8
                });
              }
            });
          }
        }).addTo(map);

        geojsonLayerRef.current = geojsonLayer;
        
        map.fitBounds(geojsonLayer.getBounds(), {
          padding: [40, 40]
        });
      })
      .catch((err) => {
        console.error('Error loading GeoJSON maps:', err);
        setLoading(false);
      });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update styles reactively when activeLayer, offsets, timelineState, selectedDistrict or theme change
  useEffect(() => {
    if (!geojsonLayerRef.current) return;
    
    geojsonLayerRef.current.eachLayer((layer: any) => {
      const distName = layer.feature.properties.Dist_Name || '';
      const data = districtData[distName] || {
        temp: 28, rainfall: 450, humidity: 65,
        cropStress: 20, floodRisk: 15, waterAvailability: 80, heatVulnerability: 10,
        aiForecast: 'STABLE'
      };
      
      const newColor = getDistrictColor(distName, data);
      const isSelected = distName === selectedDistrict;
      
      // Update css variables for hover border shadows
      const hoverGlow = theme === 'dark' ? '#22c55e' : '#15803d';
      layer.getElement()?.style.setProperty('--hover-glow', hoverGlow);
      
      const borderColor = isSelected 
        ? (theme === 'dark' ? '#22c55e' : '#15803d') 
        : (theme === 'dark' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(21, 128, 61, 0.18)');
      
      layer.setStyle({
        fillColor: newColor,
        fillOpacity: isSelected ? 0.85 : (theme === 'dark' ? 0.55 : 0.65),
        color: borderColor,
        weight: isSelected ? 2.8 : 1.2
      });
      
      // Add/remove 3D class and bring selected district to front
      const element = layer.getElement();
      if (element) {
        if (isSelected) {
          element.classList.add('selected-district-3d');
          if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
          }
        } else {
          element.classList.remove('selected-district-3d');
        }
      }
    });

    // Also update the India background layer styles if it exists
    if (indiaLayerRef.current) {
      indiaLayerRef.current.setStyle((feature) => {
        const isMaharashtra = feature?.properties?.ST_NM === 'Maharashtra';
        return {
          fillColor: theme === 'dark' ? '#0b0f0c' : '#FAF8F5',
          fillOpacity: isMaharashtra ? 0.0 : 0.85,
          color: theme === 'dark' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(21, 128, 61, 0.06)',
          weight: 1.0,
          interactive: false
        };
      });
    }
  }, [activeLayer, tempOffset, rainfallOffset, humidityOffset, timelineState, districtData, selectedDistrict, theme]);

  // Dynamic Map tiles updating when theme changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const newTileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
    tileLayerRef.current.setUrl(newTileUrl);
  }, [theme]);

  // Dynamic Map invalidation and fly-to-bounds when selected district changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
      
      if (selectedDistrict && geojsonLayerRef.current) {
        geojsonLayerRef.current.eachLayer((layer: any) => {
          if (layer.feature.properties.Dist_Name === selectedDistrict) {
            mapRef.current?.fitBounds(layer.getBounds(), {
              padding: [50, 50],
              maxZoom: 8.5,
              animate: true,
              duration: 0.8
            });
            // Ensure it has the 3D elevation class and is at the front
            const element = layer.getElement();
            if (element) {
              element.classList.add('selected-district-3d');
            }
            layer.bringToFront();
          }
        });
      } else if (!selectedDistrict && geojsonLayerRef.current) {
        mapRef.current?.fitBounds(geojsonLayerRef.current.getBounds(), {
          padding: [30, 30],
          animate: true,
          duration: 0.8
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedDistrict]);

  // Modulate hovered values dynamically in tooltip
  const getModHoverData = (data: DistrictClimateData) => {
    const temp = Math.max(10, Math.min(50, data.temp + tempOffset));
    const rainfall = Math.max(0, data.rainfall * (1 + rainfallOffset / 100));
    const humidity = Math.max(0, Math.min(100, data.humidity + humidityOffset));
    
    const cropStress = Math.min(100, Math.max(0, data.cropStress + (tempOffset * 5) - (rainfallOffset * 0.4)));
    const floodRisk = Math.min(100, Math.max(0, data.floodRisk + (rainfallOffset * 0.8) + (tempOffset * 2)));

    let timelineMod = 1.0;
    if (timelineState === '24h') timelineMod = 1.05;
    else if (timelineState === '72h') timelineMod = 1.12;
    else if (timelineState === '7d') timelineMod = 1.25;

    return {
      temp: (temp * timelineMod).toFixed(1),
      rainfall: (rainfall * timelineMod).toFixed(0),
      humidity: Math.min(100, humidity * timelineMod).toFixed(0),
      cropStress: Math.min(100, cropStress * timelineMod).toFixed(0),
      floodRisk: Math.min(100, floodRisk * timelineMod).toFixed(0)
    };
  };

  const currentModData = hoveredDistrict ? getModHoverData(hoveredDistrict.data) : null;

  return (
    <div className="relative w-full h-full border border-brand-green/10 bg-beige-bg">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-beige-bg/95 z-20 flex flex-col items-center justify-center gap-4">
          <div className="relative flex h-12 w-12">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-12 w-12 border-2 border-brand-green/30 border-t-brand-green animate-spin"></span>
          </div>
          <p className="font-mono text-xs text-forest-text/50 uppercase tracking-widest animate-pulse">
            Compiling Positron Map Grid...
          </p>
        </div>
      )}

      {/* Main Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Premium Floating Hover Glass Tooltip in Bright Mode */}
      {hoveredDistrict && currentModData && (
        <div
          className="fixed glass-card z-50 p-4 w-72 pointer-events-none transition-all duration-75 shadow-lg border border-brand-green/15"
          style={{
            left: `${hoveredDistrict.x + 20}px`,
            top: `${hoveredDistrict.y - 120}px`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-green/10 pb-2 mb-3">
            <h3 className="font-display font-bold text-base text-forest-text tracking-wide">
              {hoveredDistrict.name}
            </h3>
            <span className="font-mono text-[9px] px-2.5 py-0.5 rounded-full bg-brand-green/5 border border-brand-green/15 text-brand-green uppercase tracking-wider font-semibold">
              District
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-brand-green/5 rounded-lg p-2 border border-brand-green/10">
              <div className="flex items-center gap-1 text-[10px] text-forest-text/40 font-mono">
                <Thermometer className="w-3.5 h-3.5 text-brand-yellow" />
                <span>TEMP</span>
              </div>
              <p className="text-sm font-semibold font-mono text-forest-text mt-0.5">
                {currentModData.temp}°C
              </p>
            </div>

            <div className="bg-brand-green/5 rounded-lg p-2 border border-brand-green/10">
              <div className="flex items-center gap-1 text-[10px] text-forest-text/40 font-mono">
                <CloudRain className="w-3.5 h-3.5 text-brand-blue" />
                <span>RAIN</span>
              </div>
              <p className="text-sm font-semibold font-mono text-forest-text mt-0.5">
                {currentModData.rainfall} mm
              </p>
            </div>

            <div className="bg-brand-green/5 rounded-lg p-2 border border-brand-green/10">
              <div className="flex items-center gap-1 text-[10px] text-forest-text/40 font-mono">
                <Droplets className="w-3.5 h-3.5 text-brand-mint" />
                <span>HUMIDITY</span>
              </div>
              <p className="text-sm font-semibold font-mono text-forest-text mt-0.5">
                {currentModData.humidity}%
              </p>
            </div>

            <div className="bg-brand-green/5 rounded-lg p-2 border border-brand-green/10">
              <div className="flex items-center gap-1 text-[10px] text-forest-text/40 font-mono">
                <Cpu className="w-3.5 h-3.5 text-brand-green" />
                <span>FORECAST</span>
              </div>
              <p className="text-[9px] font-bold font-mono text-brand-green mt-1.5 uppercase tracking-wider truncate">
                {hoveredDistrict.data.aiForecast}
              </p>
            </div>
          </div>

          {/* Risks & Impact Indicators */}
          <div className="space-y-2 pt-2 border-t border-brand-green/10">
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-forest-text/60 mb-1">
                <span>Crop Stress Index</span>
                <span className={Number(currentModData.cropStress) > 60 ? 'text-brand-yellow font-bold' : 'text-forest-text/80'}>
                  {currentModData.cropStress}%
                </span>
              </div>
              <div className="w-full bg-brand-green/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-mint via-brand-yellow to-red-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${currentModData.cropStress}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] font-mono text-forest-text/60 mb-1">
                <span>Flood Risk Index</span>
                <span className={Number(currentModData.floodRisk) > 60 ? 'text-rose-600 font-bold' : 'text-forest-text/80'}>
                  {currentModData.floodRisk}%
                </span>
              </div>
              <div className="w-full bg-brand-green/10 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-mint via-brand-blue to-rose-500 h-full rounded-full transition-all duration-200"
                  style={{ width: `${currentModData.floodRisk}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
