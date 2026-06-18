import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from './components/Header';
import { MapTwin } from './components/MapTwin';
import type { DistrictClimateData } from './components/MapTwin';
import { Simulator } from './components/Simulator';
import { ControlPanel } from './components/ControlPanel';
import { InsightsPanel } from './components/InsightsPanel';
import { DistrictDetailDrawer } from './components/DistrictDetailDrawer';
import { districtBaselineData } from './data/districts';

function App() {
  // Theme state: 'light' | 'dark'
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Sync theme with document element classList
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Active Layer: 'temp' | 'rainfall' | 'humidity' | 'flood' | 'crop' | 'ai'
  const [activeLayer, setActiveLayer] = useState<string>('temp');
  // Timeline: 'current' | '24h' | '72h' | '7d'
  const [timelineState, setTimelineState] = useState<string>('current');

  // Active offsets (sliders directly modify these in real-time)
  const [tempOffset, setTempOffset] = useState<number>(0);
  const [rainfallOffset, setRainfallOffset] = useState<number>(0);
  const [humidityOffset, setHumidityOffset] = useState<number>(0);

  // Selected District Focus
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedDistrictData, setSelectedDistrictData] = useState<DistrictClimateData | null>(null);

  // Sidebar collapsible state
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // AI model output placeholders (for future API integrations)
  const [aiConfidence] = useState<number>(92);
  const [aiInsight] = useState({
    title: "Heatwave conditions detected across eastern Maharashtra.",
    explanation: "Current temperatures exceed the historical seasonal average by 4.2°C.",
    duration: "3 days",
    riskLevel: "High"
  });

  const handleDistrictSelect = (name: string, data: DistrictClimateData) => {
    setSelectedDistrict(name);
    setSelectedDistrictData(data);
  };

  const handleCloseFocus = () => {
    setSelectedDistrict(null);
    setSelectedDistrictData(null);
  };

  const handleResetSimulator = () => {
    setTempOffset(0);
    setRainfallOffset(0);
    setHumidityOffset(0);
  };

  return (
    <div className="w-screen h-screen bg-beige-bg flex flex-col overflow-hidden relative select-none">
      {/* 1. TOP HEADER (Over Map) */}
      <Header 
        systemStatus={selectedDistrict ? `FOCUSED: ${selectedDistrict.toUpperCase()}` : 'OPERATIONAL'} 
        theme={theme}
        onThemeToggle={handleThemeToggle}
        tempOffset={tempOffset}
        rainfallOffset={rainfallOffset}
        timelineState={timelineState}
        isCollapsed={!!selectedDistrict}
        aiConfidence={aiConfidence}
      />

      {/* 2. DYNAMIC MAP CONTAINER (Transitions from 100% to 45% width) */}
      <div className={`absolute top-0 bottom-0 left-0 transition-all duration-300 ease-in-out z-0 ${
        selectedDistrict ? 'w-[45%]' : 'w-full'
      }`}>
        <MapTwin
          activeLayer={activeLayer}
          tempOffset={tempOffset}
          rainfallOffset={rainfallOffset}
          humidityOffset={humidityOffset}
          timelineState={timelineState}
          onDistrictSelect={handleDistrictSelect}
          districtData={districtBaselineData}
          selectedDistrict={selectedDistrict}
          theme={theme}
        />
        
        {/* Floating Focused District Name Overlay */}
        <div className={`absolute top-6 left-6 z-20 transition-all duration-500 ease-in-out ${
          selectedDistrict 
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
            : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
        }`}>
          <div className="glass-card px-5 py-3 border border-brand-green/20 bg-white/60 dark:bg-black/45 backdrop-blur-md shadow-lg rounded-2xl flex flex-col gap-0.5">
            <span className="text-[9px] font-sans text-brand-green uppercase tracking-widest font-bold">
              Active Focus Area
            </span>
            <h2 className="font-display font-black text-lg text-forest-text tracking-wider uppercase leading-none mt-1">
              {selectedDistrict}
            </h2>
          </div>
        </div>
      </div>

      {/* 3. FLOATING HUD OVERLAYS (Shown only in standard exploration view) */}
      <div className={`absolute inset-0 pt-[88px] z-10 pointer-events-none flex flex-col justify-between p-6 transition-all duration-300 ${
        selectedDistrict ? 'opacity-0 scale-95 pointer-events-none translate-x-[-20px]' : 'opacity-100 scale-100'
      }`}>
        {/* Space reserved for Top Section */}
        <div className="w-full pointer-events-none h-[1px]" />

        {/* Middle Section: Symmetrical Sidebars */}
        <div className="flex-1 flex justify-between items-start my-4 overflow-hidden pointer-events-none">
          {/* Left Panel: Simulator knobs */}
          <div className={`relative h-full transition-all duration-300 ease-in-out pointer-events-auto ${
            leftPanelCollapsed ? 'w-0' : 'w-[360px]'
          }`}>
            <div className={`absolute top-0 bottom-0 left-0 w-[360px] transition-transform duration-300 ease-in-out ${
              leftPanelCollapsed ? 'translate-x-[-380px]' : 'translate-x-0'
            }`}>
              <Simulator
                tempOffset={tempOffset}
                rainfallOffset={rainfallOffset}
                humidityOffset={humidityOffset}
                onTempChange={setTempOffset}
                onRainfallChange={setRainfallOffset}
                onHumidityChange={setHumidityOffset}
                onReset={handleResetSimulator}
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
              />
            </div>
          </div>

          {/* Right Panel: Recharts stress and selected focus */}
          <div className={`relative h-full transition-all duration-300 ease-in-out pointer-events-auto ${
            rightPanelCollapsed ? 'w-0' : 'w-[360px]'
          }`}>
            <div className={`absolute top-0 bottom-0 right-0 w-[360px] transition-transform duration-300 ease-in-out ${
              rightPanelCollapsed ? 'translate-x-[380px]' : 'translate-x-0'
            }`}>
              <InsightsPanel
                tempOffset={tempOffset}
                rainfallOffset={rainfallOffset}
                humidityOffset={humidityOffset}
                selectedDistrict={selectedDistrict}
                selectedDistrictData={selectedDistrictData}
                allDistrictsData={districtBaselineData}
                theme={theme}
                aiInsight={aiInsight}
              />
            </div>
          </div>
        </div>

        {/* Bottom Section: Map Controls HUD */}
        <div className="w-full pointer-events-auto">
          <ControlPanel
            timelineState={timelineState}
            onTimelineChange={setTimelineState}
          />
        </div>
      </div>

      {/* Sidebar Toggle Buttons - Positioned outside HUD to sit flush with screen edges */}
      <div className={`absolute inset-0 pointer-events-none z-40 transition-all duration-300 ${
        selectedDistrict ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}>
        {/* Left Toggle Button */}
        <button
          onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
          className={`fixed top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-r-full bg-white/70 dark:bg-black/50 backdrop-blur-md border border-y-brand-green/15 border-r-brand-green/15 text-brand-green hover:bg-brand-green/10 transition-all duration-300 ease-in-out cursor-pointer shadow-md flex items-center justify-center pointer-events-auto ${
            leftPanelCollapsed ? 'left-0' : 'left-[384px]'
          }`}
          style={{ borderLeftWidth: '0px', borderLeftColor: 'transparent' }}
          aria-label="Toggle Simulator Panel"
        >
          {leftPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Right Toggle Button */}
        <button
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className={`fixed top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-l-full bg-white/70 dark:bg-black/50 backdrop-blur-md border border-y-brand-green/15 border-l-brand-green/15 text-brand-green hover:bg-brand-green/10 transition-all duration-300 ease-in-out cursor-pointer shadow-md flex items-center justify-center pointer-events-auto ${
            rightPanelCollapsed ? 'right-0' : 'right-[384px]'
          }`}
          style={{ borderRightWidth: '0px', borderRightColor: 'transparent' }}
          aria-label="Toggle Insights Panel"
        >
          {rightPanelCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* 4. SPLIT-SCREEN DETAIL DRAWER (Shown on right 55% in split focus view) */}
      <div className={`absolute top-0 bottom-0 right-0 w-[55%] z-20 transition-all duration-300 ease-in-out ${
        selectedDistrict && selectedDistrictData
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0 pointer-events-none'
      }`}>
        {selectedDistrict && selectedDistrictData && (
          <DistrictDetailDrawer
            districtName={selectedDistrict}
            data={selectedDistrictData}
            tempOffset={tempOffset}
            rainfallOffset={rainfallOffset}
            humidityOffset={humidityOffset}
            onClose={handleCloseFocus}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}

export default App;
