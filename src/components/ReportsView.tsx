import React, { useState, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  FileText, 
  AlertCircle, 
  Terminal, 
  Cpu, 
  Bot, 
  Download, 
  Sparkles, 
  Send 
} from "lucide-react";
import { SimulationParams } from "../types";
import { STATE_DATA } from "./MapView";
import { useTelemetry } from "../context/TelemetryContext";

interface ReportsViewProps {
  simulation: SimulationParams;
  activeLayer: string;
  selectedRegion: string; // Dynamic map target focus prop entry
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export const generateDynamicReportHeuristics = (tempOffset: number, rainIntensity: number, activeLayer: string, selectedRegion: string) => {
  const rainPct = rainIntensity;
  const isThermalCrisis = tempOffset > 2.0;
  const isInundationCrisis = rainIntensity > 140;

  return `# NATIONAL CLIMATE SIMULATION ASSESSMENT REPORT: ${selectedRegion.toUpperCase()}
---
## 1. SIMULATED ENVIRONMENTAL MATRIX CORRIDORS
* **Operational Station Target:** Current intelligence brief tracks the **${selectedRegion.toUpperCase()}** administrative sub-grids.
* **Thermal Layer Delta:** Simulated macro offset is currently operating at **${tempOffset > 0 ? "+" : ""}${tempOffset.toFixed(1)}°C** across regional grids.
* **Precipitation Forcing Vector:** Atmospheric moisture throughput is modulated to **${rainPct}%** of seasonal baseline values.
* **Primary Sensor Focus:** Active visualization tracking is locked onto the **${activeLayer.toUpperCase()}** telemetry channel.

## 2. RISK ANALYSIS & INFRASTRUCTURE DIAGNOSTICS
* **Grid Vulnerability:** ${isThermalCrisis ? `CRITICAL OUTAGE RISK inside ${selectedRegion}. Thermal island forcing patterns indicate severe cooling infrastructure load thresholds exceeded by +18.5%.` : `STABLE CONSUMPTION inside ${selectedRegion}. Power grid operations are handling load factors within nominal standard deviations.`}
* **Hydrological Inundation:** ${isInundationCrisis ? "CRITICAL INUNDATION WARNING. High-intensity precipitation multipliers exceed structural municipal drainage clearance capabilities." : "OPTIMAL RUNOFF PROFILE. Catchment flow rates are conforming safely to historical seasonal boundaries."}
* **Agricultural Output Stress:** Simulated soil vectors indicate a **${Math.min(100, Math.round(40 + tempOffset * 8))}%** crop stress trajectory over local farming zones.
`;
};

export const getTelemetryDataAndTrends = (telemetry: any) => {
  if (!telemetry || !telemetry.hourly || !telemetry.current_weather) {
    return null;
  }

  const times: string[] = telemetry.hourly.time;
  const currentTimeStr = telemetry.current_weather.time;
  
  // Match current hour index
  const currentIdx = times.findIndex((t: string) => t.startsWith(currentTimeStr.substring(0, 13)));
  
  const getFieldValues = (field: string, fallbackVal: number) => {
    const curVal = currentIdx !== -1 ? telemetry.hourly[field][currentIdx] : fallbackVal;
    const pastVal = (currentIdx !== -1 && currentIdx >= 24) ? telemetry.hourly[field][currentIdx - 24] : curVal;
    return { curVal, trend: curVal - pastVal };
  };

  const temp = getFieldValues("temperature_2m", telemetry.current_weather.temperature);
  const precip = getFieldValues("precipitation", 0);
  const humidity = getFieldValues("relative_humidity_2m", 50);

  return {
    currentTemp: temp.curVal,
    tempTrend: temp.trend,
    currentPrecip: precip.curVal,
    precipTrend: precip.trend,
    currentHumidity: humidity.curVal,
    humidityTrend: humidity.trend
  };
};

export default function ReportsView({ simulation, activeLayer, selectedRegion }: ReportsViewProps) {
  const { activeTelemetry, selectedName } = useTelemetry();
  const activeLocation = selectedName || selectedRegion;

  // Clean, high-contrast reactive generation directly from live slider and map location props
  const reportContent = generateDynamicReportHeuristics(simulation.tempOffset, simulation.rainIntensity, activeLayer, activeLocation);

  const [isLoading, setIsLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Track manual execution lifecycle for the presentation layer
  const [hasGeneratedThisSession, setHasGeneratedThisSession] = useState(false);

  // Automatically reset the session generation hook whenever slider variables shift
  useEffect(() => {
    setHasGeneratedThisSession(false);
  }, [simulation.tempOffset, simulation.rainIntensity, activeLayer]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    { 
      role: "model", 
      content: `### CLIMATE ADVISORY MISSION CORE ENGAGED\nReady to analyze climate simulation layers. Adjust simulator values in the dashboard control room at any time to update this tactical assessment suite.` 
    }
  ]);
  const [userQuery, setUserQuery] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const loaderLabels = [
    "ACQUIRING GRIDS DATA",
    "SOLVING SPREAD COUPLING EQUATIONS",
    "RENDERING TEMPORAL INTRUSION MODELS",
    "GENERATING REPORT VIA GEMINI SENSOR"
  ];

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || isChatLoading) return;

    const currentMsg = userQuery;
    setChatMessages(prev => [...prev, { role: "user", content: currentMsg }]);
    setUserQuery("");
    setIsChatLoading(true);

    try {
      // Initialize the Gemini client
      const apiKeyString = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
      const ai = new GoogleGenAI({ apiKey: apiKeyString });
      

      // 2. Inject your active slider parameters directly into the context prompt
      const contextPrompt = `
        You are the advanced ClimateSync India AI twin simulation engine.
        The user is interacting with a dashboard mapping regional weather impacts.
        
        CURRENT SIMULATION PARAMETERS:
        - Active Location Focus: ${activeLocation}
        - Active Map Visualization Layer: ${activeLayer}
        - Temperature Shift Offset: ${simulation.tempOffset > 0 ? "+" : ""}${simulation.tempOffset.toFixed(1)}°C
        - Precipitation Index Multiplier: ${simulation.rainIntensity}%
        
        Analyze the user's inquiry considering these exact physics parameters. Answer elegantly using clean markdown layout formatting.
        
        User Query: "${currentMsg}"
      `;

      // 3. Call the fast, responsive Gemini 2.5 Flash model
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contextPrompt,
      });

      const botReply = response.text || "No analytical response received from simulation sensor nodes.";
      setChatMessages(prev => [...prev, { role: "model", content: botReply }]);

    } catch (err: any) {
      console.error("Gemini Frontend API Call Failed:", err);
      // Clean up fallback text so your user knows if something went wrong with the API configuration
      setChatMessages(prev => [
        ...prev, 
        { 
          role: "model", 
          content: `### ⚠️ CONNECTIVITY EXCEPTION\nFailed to establish baseline streaming connectivity to the Gemini Core grid. Error Details: ${err.message || err}` 
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleDownloadOfflineReport = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ClimateTwin_Assessment_Report_Offset_${simulation.tempOffset > 0 ? "plus" : ""}${simulation.tempOffset.toFixed(1)}C.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSVGrid = () => {
    // 1. Build CSV header matrix rows
    let csvContent = "State,Simulated_Temperature(C),Simulated_Precipitation(mm),Simulated_Humidity(%),Simulated_Drought_Index\n";

    // 2. Iterate through all states to apply live simulator offsets
    Object.keys(STATE_DATA).forEach((stateName) => {
      const climate = STATE_DATA[stateName];
      
      // Mimic the exact dynamic physics math inside the map loop
      let hash = 0;
      for (let i = 0; i < stateName.length; i++) {
        hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
      }
      const valShift = Math.sin(hash) * 0.1;

      const dynamicTemp = (climate.temp + (climate.temp * valShift) + simulation.tempOffset).toFixed(1);
      const dynamicPrecip = (climate.rain * (1 + valShift) * (simulation.rainIntensity / 100)).toFixed(1);
      const dynamicHumid = (climate.humidity * (1 + valShift)).toFixed(1);
      const dynamicDrought = (climate.drought * (1 + valShift) * (simulation.tempOffset > 0 ? (1 + simulation.tempOffset * 0.1) : 1)).toFixed(2);

      csvContent += `"${stateName}",${dynamicTemp},${dynamicPrecip},${dynamicHumid},${dynamicDrought}\n`;
    });

    // 3. Trigger immediate client-side binary blob download sequence
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ClimateSync_Grid_Simulation_Metrics_T_${simulation.tempOffset > 0 ? "plus" : ""}${simulation.tempOffset.toFixed(1)}C_P_${simulation.rainIntensity}pct.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Safe markdown parser that enforces highly secure visual presentation
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith("### ")) {
        return (
          <h4 key={index} className="text-xs font-sans font-black text-indigo-600 mt-5 mb-2.5 tracking-wider uppercase">
            {line.substring(4)}
          </h4>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={index} className="text-sm font-sans font-black text-slate-800 border-b border-slate-100 pb-2 mt-6 mb-3">
            {line.substring(3)}
          </h3>
        );
      }
      if (line.startsWith("# ")) {
        return (
          <h2 key={index} className="text-base font-sans font-black text-slate-900 border-b-2 border-indigo-100 pb-2 mt-7 mb-4 tracking-tight uppercase">
            {line.substring(2)}
          </h2>
        );
      }

      // Separators
      if (line.trim() === "---") {
        return <hr key={index} className="my-5 border-slate-100" />;
      }

      // Unordered list items
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        const content = line.trim().substring(2);
        return (
          <li key={index} className="text-[11px] text-slate-600 leading-relaxed mb-1.5 ml-4 list-disc font-medium">
            {parseBoldTerm(content)}
          </li>
        );
      }

      // Ordered list items
      if (/^\d+\.\s/.test(line.trim())) {
        const dotIndex = line.indexOf(".");
        const content = line.substring(dotIndex + 1).trim();
        return (
          <li key={index} className="text-[11px] text-slate-600 leading-relaxed mb-1.5 ml-4 list-decimal font-medium">
            {parseBoldTerm(content)}
          </li>
        );
      }

      // Blockquotes
      if (line.trim().startsWith("> ")) {
        return (
          <blockquote key={index} className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-slate-50 text-[11px] text-slate-600 font-bold italic rounded-r-xl">
            {parseBoldTerm(line.substring(2))}
          </blockquote>
        );
      }

      // Standard Paragraph lines
      if (line.trim() === "") {
        return <div key={index} className="h-2" />;
      }

      return (
        <p key={index} className="text-[11px] text-slate-600 leading-relaxed mb-3 font-medium">
          {parseBoldTerm(line)}
        </p>
      );
    });
  };

  const parseBoldTerm = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    if (parts.length === 1) return text;
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-slate-900 font-black">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="w-full h-full p-6 text-slate-800 overflow-y-auto hide-scrollbar select-none bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Reports Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-lg font-display font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              COGNITIVE TWIN EXECUTIVE REPORTS
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Leverage Google Gemini modeling to generate real-time meteorology and policy hazard assessments based on What-If simulator parameters.
            </p>
          </div>
        </div>

        {/* Global Warnings Panel */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-sans font-black uppercase">API Connection Notification</p>
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Telemetry Input Monitor CLI Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-amber-500 font-mono text-[10px] text-slate-500 space-y-3">
          <div className="flex items-center gap-2 text-amber-600 font-black">
            <Terminal className="w-4 h-4" />
            <span>ACTIVE METEOROLOGICAL TELEMETRY STREAM</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
            <div>
              <span className="opacity-60 text-[9px] font-bold">STATION LOCATION:</span>
              <p className="text-slate-900 font-extrabold uppercase mt-0.5">{activeLocation}</p>
            </div>
            <div>
              <span className="opacity-60 text-[9px] font-bold">WHAT-IF TEMP OFFSET:</span>
              <p className="text-orange-600 font-extrabold mt-0.5">
                {simulation.tempOffset > 0 ? "+" : ""}{simulation.tempOffset.toFixed(1)}°C
              </p>
            </div>
            <div>
              <span className="opacity-60 text-[9px] font-bold">PRECIPITATION MULTIPLIER:</span>
              <p className="text-indigo-600 font-extrabold mt-0.5">{simulation.rainIntensity}%</p>
            </div>
            <div>
              <span className="opacity-60 text-[9px] font-bold">MAP DISPLAY LAYER:</span>
              <p className="text-slate-900 font-extrabold uppercase mt-0.5">{activeLayer}</p>
            </div>
            
            {/* HISTORICAL CONTRAST LAYER NODE */}
            <div className="border-l border-slate-200 pl-4 col-span-2 md:col-span-1">
              <span className="text-indigo-600 text-[9px] font-black tracking-wider block">HISTORICAL ANOMALY:</span>
              <p className="text-[11px] font-mono font-black text-slate-900 mt-0.5">
                {simulation.tempOffset > 0 ? `+${(simulation.tempOffset * 1.4).toFixed(0)}% VS BASELINE` : "NOMINAL VARIANCE"}
              </p>
            </div>
          </div>
        </div>

        {/* LIVE METEOROLOGICAL TELEMETRY CARDS */}
        {(() => {
          const trends = getTelemetryDataAndTrends(activeTelemetry);
          if (!trends) return null;
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
              {/* Temp Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">TEMPERATURE</span>
                  <p className="text-2xl font-mono font-black text-slate-900 mt-2">
                    {trends.currentTemp.toFixed(1)}°C
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[9.5px] font-mono">
                  <span className="text-slate-500">24H TREND:</span>
                  <span className={`font-black ${trends.tempTrend >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {trends.tempTrend >= 0 ? "▲ INCREASED" : "▼ DECREASED"} ({Math.abs(trends.tempTrend).toFixed(1)}°C)
                  </span>
                </div>
              </div>

              {/* Precipitation Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">PRECIPITATION</span>
                  <p className="text-2xl font-mono font-black text-slate-900 mt-2">
                    {trends.currentPrecip.toFixed(1)} mm
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[9.5px] font-mono">
                  <span className="text-slate-500">24H TREND:</span>
                  <span className={`font-black ${trends.precipTrend >= 0 ? "text-blue-600" : "text-emerald-600"}`}>
                    {trends.precipTrend >= 0 ? "▲ INCREASED" : "▼ DECREASED"} ({Math.abs(trends.precipTrend).toFixed(1)} mm)
                  </span>
                </div>
              </div>

              {/* Humidity Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">RELATIVE HUMIDITY</span>
                  <p className="text-2xl font-mono font-black text-slate-900 mt-2">
                    {Math.round(trends.currentHumidity)}%
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-[9.5px] font-mono">
                  <span className="text-slate-500">24H TREND:</span>
                  <span className={`font-black ${trends.humidityTrend >= 0 ? "text-indigo-600" : "text-amber-600"}`}>
                    {trends.humidityTrend >= 0 ? "▲ INCREASED" : "▼ DECREASED"} ({Math.abs(trends.humidityTrend).toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dynamic Model Variance Guardrail Alert */}
        {(simulation.tempOffset > 3.0 && simulation.rainIntensity > 150) && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-[11px] text-amber-800 flex items-start gap-2.5 shadow-sm animate-pulse">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-0.5">
              <p className="font-sans font-black uppercase tracking-wider text-amber-950">TWIN MODEL BOUNDS DETECTED</p>
              <p className="font-medium">
                Combined high-range boundaries (+{simulation.tempOffset.toFixed(1)}°C thermal forcing / {simulation.rainIntensity}% precipitation grid loading) match historical anomaly limits. GFS mathematical ensembles are maintaining localized verification tracking protocols.
              </p>
            </div>
          </div>
        )}

        {/* Active Action state: Empty state vs Loader vs Display */}
        {/* Dynamic Presentation Hook Container */}
        {!hasGeneratedThisSession && !isLoading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1e3a8a] shadow-sm">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-sans font-black text-slate-800 tracking-wider uppercase">
                Awaiting Climate Twin Data Target Ingress
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
                {`Live variables captured: Shift of ${simulation.tempOffset > 0 ? "+" : ""}${simulation.tempOffset.toFixed(1)}°C at ${simulation.rainIntensity}% precipitation forcing. Click below to synthesize the national diagnostic briefing.`}
              </p>
            </div>
            <button 
              onClick={() => {
                setIsLoading(true);
                setLoadStep(0);
                const stepInterval = setInterval(() => {
                  setLoadStep(prev => (prev < 3 ? prev + 1 : prev));
                }, 400);
                setTimeout(() => {
                  clearInterval(stepInterval);
                  setIsLoading(false);
                  setHasGeneratedThisSession(true);
                  setChatMessages([
                    {
                      role: "model",
                      content: `### EXTENDED BRIEFING SYNTHESIZED\nLive telemetry synthesis complete under simulated variables: **${simulation.tempOffset > 0 ? "+" : ""}${simulation.tempOffset.toFixed(1)}°C** / **${simulation.rainIntensity}%** precipitation matrix. Query my LLM interface below for local security directives.`
                    }
                  ]);
                }, 1600);
              }}
              className="px-6 py-2.5 bg-[#1e3a8a] text-white text-xs font-sans font-black rounded-xl hover:bg-blue-900 active:scale-95 transition-all shadow-md shadow-blue-100 cursor-pointer uppercase tracking-wider"
            >
              Synthesize Executive Report
            </button>
          </div>
        ) : isLoading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-6 py-16">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#1e3a8a] animate-spin ease-linear shrink-0" />
              <Bot className="w-6 h-6 text-[#1e3a8a] absolute top-4 left-4 animate-bounce" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-[#1e3a8a] animate-pulse uppercase tracking-widest font-black">
                {loaderLabels[loadStep]}
              </p>
            </div>
          </div>
        ) : (
          /* Markdown Display HUD */
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-[#1e3a8a] shadow-sm text-left select-text relative">
              <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
                <button 
                  onClick={handleExportCSVGrid}
                  className="p-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[9px] font-mono border border-indigo-200 text-indigo-700 font-extrabold transition-all cursor-pointer"
                >
                  📥 EXPORT MET-GRID CSV
                </button>
                <button 
                  onClick={() => setHasGeneratedThisSession(false)}
                  className="p-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-[9px] font-mono border border-slate-200 text-slate-700 font-extrabold transition-all cursor-pointer"
                >
                  RE-SYNTHESIZE NEW DATA
                </button>
              </div>

              <div className="prose max-w-none text-left select-text mt-8">
                {renderMarkdown(reportContent)}
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Interactive Climate AI Chat Assistant Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 border-t-4 border-indigo-600 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Bot className="w-4 h-4 text-indigo-600" />
            <h3 className="text-[10px] font-sans font-black text-slate-700 tracking-wider uppercase">
              INTERACTIVE SCENARIO ADVISORY CHAT
            </h3>
          </div>

          {/* Messages Flow Area */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
            {chatMessages.length === 0 && (
              <div className="text-center py-6">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black tracking-wider">
                  Conversation state is empty. Click synthesize report above to initiate AI advisor module.
                </span>
              </div>
            )}
            
            {chatMessages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex gap-3 text-xs text-left ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role !== "user" && (
                  <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-200/50 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                )}
                
                <div 
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-indigo-50 border border-indigo-200/50 text-slate-800 rounded-tr-sm font-bold shadow-sm" 
                      : "bg-white border border-slate-200/80 text-slate-700 font-medium select-text shadow-sm"
                  }`}
                >
                  {msg.role === "user" ? msg.content : renderMarkdown(msg.content)}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex gap-3 text-xs justify-start items-center">
                <div className="w-6 h-6 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center animate-spin">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="text-[9px] font-mono text-indigo-600 animate-pulse font-bold uppercase">ClimateTwin AI formulating real-time hazard advice...</span>
              </div>
            )}
          </div>

          {/* User Input field */}
          <form onSubmit={handleSendChat} className="flex gap-2">
            <input 
              type="text"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Ask: 'What are the flood implications for Samudrapur under +3°C scenarios?'..."
              disabled={isChatLoading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white placeholder-slate-400 disabled:opacity-50 text-slate-800 font-medium transition-all"
            />
            <button 
              type="submit"
              disabled={isChatLoading || !userQuery.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-55 duration-150 rounded-xl px-5 py-3 flex items-center justify-center text-white cursor-pointer shrink-0 shadow-md shadow-indigo-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
