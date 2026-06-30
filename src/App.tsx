import { useState, useEffect } from "react";
import { PanelTab, WeatherLayer, SimulationParams } from "./types";
import DashboardView from "./components/DashboardView";
import AnalyticsView from "./components/AnalyticsView";
import ReportsView from "./components/ReportsView";
import { Thermometer, CloudRain, Droplets, Gauge, Wind, BrainCircuit, AlertTriangle, LayoutDashboard, BarChart2, FileText } from "lucide-react";
export default function App() {
  const [activeTab, setActiveTab] = useState<PanelTab>("dashboard");
  const [isMissionControl, setIsMissionControl] = useState(false);
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("temp");
  const [selectedRegion, setSelectedRegion] = useState<string>("Maharashtra"); // Global map target anchor
  const [simulation, setSimulation] = useState<SimulationParams>({
    tempOffset: 0.0,
    rainIntensity: 100
  });

  useEffect(() => {
    const handleGlobalSimUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail;
      setSimulation(prev => ({ ...prev, ...data }));
    };

    const handleRegionUpdate = (e: Event) => {
      const regionName = (e as CustomEvent).detail;
      if (regionName) setSelectedRegion(regionName);
    };
    
    const handleTabSwitchTrigger = () => {
      setTimeout(() => {
        setActiveTab("reports");
      }, 50);
    };

    window.addEventListener('simulation-update', handleGlobalSimUpdate);
    window.addEventListener('region-select-update', handleRegionUpdate);
    window.addEventListener('trigger-report-tab', handleTabSwitchTrigger);
    
    return () => {
      window.removeEventListener('simulation-update', handleGlobalSimUpdate);
      window.removeEventListener('region-select-update', handleRegionUpdate);
      window.removeEventListener('trigger-report-tab', handleTabSwitchTrigger);
    };
  }, []);

  useEffect(() => {
    const handleMissionHotkey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'm' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setIsMissionControl(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleMissionHotkey);
    return () => window.removeEventListener('keydown', handleMissionHotkey);
  }, []);

  return (
    <div className="w-full h-screen bg-bg-void text-text-primary flex flex-col font-sans overflow-hidden">
      {!isMissionControl && (
        <div className="flex flex-col shrink-0 z-50" style={{ border: 'none', borderBottom: 'none', boxShadow: 'none' }}>
          {/* HERO HEADER */}
          <header className="px-6 py-2 bg-white flex flex-col xl:flex-row items-center justify-between gap-6 relative z-50" style={{ border: 'none', boxShadow: 'none' }}>
            
            {/* LEFT: Branding & Status */}
            <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent-blue to-accent-cyan rounded-xl flex items-center justify-center text-bg-void shadow-[0_0_15px_rgba(6,182,212,0.5)] flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                    <polyline points="7.5 19.79 7.5 14.6 12 12 16.5 14.6 16.5 19.79" />
                    <polyline points="12 22 12 12" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <h1 className="text-2xl font-brand font-bold text-[#111827] tracking-tight leading-none">
                    BHOOMI-TWIN
                  </h1>
                  <span className="text-[11px] font-sans font-medium text-[#6b7280] uppercase tracking-wider leading-tight mt-1">
                    India's Climate Digital Twin
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1.5 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                      <span className="text-[8px] font-mono text-[#6b7280] uppercase">INSAT-3DR LIVE</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 hidden xl:flex">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />
                      <span className="text-[8px] font-mono text-[#6b7280] uppercase">GFS Model</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Tabs (hidden on xl) */}
              <nav className="flex xl:hidden items-center gap-1" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center gap-2 px-4 py-2 text-[14px] font-sans transition-all tracking-wide rounded-full ${
                    activeTab === "dashboard"
                      ? "bg-[#111827] text-[#ffffff] font-semibold"
                      : "bg-transparent text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dash
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`flex items-center gap-2 px-4 py-2 text-[14px] font-sans transition-all tracking-wide rounded-full ${
                    activeTab === "analytics"
                      ? "bg-[#111827] text-[#ffffff] font-semibold"
                      : "bg-transparent text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  Ana
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`flex items-center gap-2 px-4 py-2 text-[14px] font-sans transition-all tracking-wide rounded-full ${
                    activeTab === "reports"
                      ? "bg-[#111827] text-[#ffffff] font-semibold"
                      : "bg-transparent text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Rep
                </button>
              </nav>
            </div>

            {/* CENTER: Climate Intelligence Chips */}
            <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar w-full xl:w-auto xl:flex-1 justify-start xl:justify-center pb-2 xl:pb-0 bg-transparent">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9fafb] border border-gray-200 rounded-lg group">
                <Thermometer className="w-4 h-4 text-[#374151] group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-medium text-[#6b7280] uppercase">Mean Temp</span>
                  <span className="text-[13px] font-sans font-bold text-[#111827] mt-0.5">28.4°C</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9fafb] border border-gray-200 rounded-lg group">
                <CloudRain className="w-4 h-4 text-[#374151] group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-medium text-[#6b7280] uppercase">Precip</span>
                  <span className="text-[13px] font-sans font-bold text-[#111827] mt-0.5">12.5 <span className="text-[10px] font-medium">mm</span></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9fafb] border border-gray-200 rounded-lg group">
                <Droplets className="w-4 h-4 text-[#374151] group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-medium text-[#6b7280] uppercase">Humidity</span>
                  <span className="text-[13px] font-sans font-bold text-[#111827] mt-0.5">64%</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#f9fafb] border border-gray-200 rounded-lg group">
                <Wind className="w-4 h-4 text-[#374151] group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-medium text-[#6b7280] uppercase">Wind</span>
                  <span className="text-[13px] font-sans font-bold text-[#111827] mt-0.5">14 <span className="text-[10px] font-medium">km/h</span></span>
                </div>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-[#f9fafb] border border-gray-200 rounded-lg group">
                <Gauge className="w-4 h-4 text-[#374151] group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-medium text-[#6b7280] uppercase">Pressure</span>
                  <span className="text-[13px] font-sans font-bold text-[#111827] mt-0.5">1012 <span className="text-[10px] font-medium">hPa</span></span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f9fafb] border border-gray-200 rounded-lg group">
                <BrainCircuit className="w-4 h-4 text-[#374151] group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-sans font-medium text-[#6b7280] uppercase">AI Conf</span>
                  <span className="text-[13px] font-sans font-bold text-[#059669] mt-0.5">98.2%</span>
                </div>
              </div>
            </div>

            {/* RIGHT: Metadata & Tabs (Desktop) */}
            <div className="hidden xl:flex items-center w-auto">
              
              <nav className="flex items-center gap-2" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`flex items-center gap-2 px-4 py-2 text-[14px] font-sans transition-all tracking-wide rounded-full ${
                    activeTab === "dashboard"
                      ? "bg-[#111827] text-[#ffffff] font-semibold"
                      : "bg-transparent text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`flex items-center gap-2 px-4 py-2 text-[14px] font-sans transition-all tracking-wide rounded-full ${
                    activeTab === "analytics"
                      ? "bg-[#111827] text-[#ffffff] font-semibold"
                      : "bg-transparent text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`flex items-center gap-2 px-4 py-2 text-[14px] font-sans transition-all tracking-wide rounded-full ${
                    activeTab === "reports"
                      ? "bg-[#111827] text-[#ffffff] font-semibold"
                      : "bg-transparent text-[#6b7280] hover:text-[#111827]"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Reports
                </button>
              </nav>
            </div>
          </header>
        </div>
      )}

      {/* TAB TRANSITION PANEL */}
      <main className="flex-1 overflow-hidden relative bg-bg-deep">
        {activeTab === "dashboard" && (
          <div className="h-full w-full">
            <DashboardView 
              activeLayer={activeLayer}
              setActiveLayer={setActiveLayer}
              simulation={simulation}
              setSimulation={setSimulation}
            />
          </div>
        )}

        {activeTab === "analytics" && (
          <AnalyticsView simulation={simulation} />
        )}

        {activeTab === "reports" && (
          <ReportsView 
            simulation={simulation}
            activeLayer={activeLayer}
            selectedRegion={selectedRegion}
          />
        )}
      </main>
    </div>
  );
}
