import { useState, useEffect } from "react";
import { PanelTab, WeatherLayer, SimulationParams } from "./types";
import DashboardView from "./components/DashboardView";
import AnalyticsView from "./components/AnalyticsView";
import ReportsView from "./components/ReportsView";

export default function App() {
  const [activeTab, setActiveTab] = useState<PanelTab>("dashboard");
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("temp");
  const [simulation, setSimulation] = useState<SimulationParams>({
    tempOffset: 0.0,
    rainIntensity: 100
  });

  return (
    <div className="w-full h-screen bg-bg-void text-text-primary flex flex-col font-sans overflow-hidden">
      {/* TOP COMMAND HEADER NAVIGATION */}
      <header className="h-14 border-b border-border-default bg-bg-surface backdrop-blur-md flex items-center justify-between px-8 z-50 shrink-0 select-none">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-accent-blue rounded-lg flex items-center justify-center text-text-primary shadow-md hover:scale-105 active:scale-95 transition-all">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
              <polyline points="7.5 19.79 7.5 14.6 12 12 16.5 14.6 16.5 19.79" />
              <polyline points="12 22 12 12" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xs font-display font-black text-text-primary tracking-tight leading-tight">
              CLIMATESYNC <span className="text-accent-blue">INDIA</span>
            </h1>
            <div className="flex items-center gap-1 leading-none mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              <span className="text-[8px] font-mono font-bold tracking-wider text-text-secondary uppercase leading-none">
                LIVE • INSAT-3DR
              </span>
            </div>
          </div>
        </div>

        {/* Tab panels switcher - ONLY DASHBOARD, ANALYTICS, REPORTS */}
        <nav className="flex items-center gap-1 h-full">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`px-6 h-full text-[11px] font-mono cursor-pointer uppercase transition-all flex items-center border-b-2 font-black tracking-wider ${
              activeTab === "dashboard"
                ? "border-accent-blue text-accent-blue"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            DASHBOARD
          </button>
          
          <button 
            onClick={() => setActiveTab("analytics")}
            className={`px-6 h-full text-[11px] font-mono cursor-pointer uppercase transition-all flex items-center border-b-2 font-black tracking-wider ${
              activeTab === "analytics"
                ? "border-accent-blue text-accent-blue"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            ANALYTICS
          </button>
          
          <button 
            onClick={() => setActiveTab("reports")}
            className={`px-6 h-full text-[11px] font-mono cursor-pointer uppercase transition-all flex items-center border-b-2 font-black tracking-wider ${
              activeTab === "reports"
                ? "border-accent-blue text-accent-blue"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            REPORTS
          </button>
        </nav>

        {/* Model status & operator av */}
        <div className="flex items-center gap-4">
          <div className="nav-badges">
            <span className="nav-badge">MODEL: GFS-382</span>
            <span className="nav-badge live">● INSAT-3DR</span>
            <span className="nav-badge confidence">✦ 98.4% CONFIDENCE</span>
          </div>
        </div>
      </header>

      {/* TAB TRANSITION PANEL */}
      <main className="flex-1 overflow-hidden relative bg-bg-deep">
        {activeTab === "dashboard" && (
          <DashboardView 
            activeLayer={activeLayer}
            setActiveLayer={setActiveLayer}
            simulation={simulation}
            setSimulation={setSimulation}
          />
        )}

        {activeTab === "analytics" && (
          <AnalyticsView simulation={simulation} />
        )}

        {activeTab === "reports" && (
          <ReportsView 
            simulation={simulation}
            activeLayer={activeLayer}
          />
        )}
      </main>
    </div>
  );
}
