import React, { useState } from "react";
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

interface ReportsViewProps {
  simulation: SimulationParams;
  activeLayer: string;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

const defaultReportSuggestion = `
# EXECUTIVE SYNTHESIS REPORT: TWIN STATE ASSESSMENT
---
## 1. STRATEGIC METEOROLOGICAL FORECAST
*   **Thermal Offsets:** An active offset has been simulated at **{{OFFSET_TEMP}}°C** over the Central India spatial grids.
*   **Storm & Precipitation Inundation:** Current storm intensity multiplier stands at **{{OFFSET_RAIN}}%** baseline precipitation volume.
*   **Vulnerability Risks:** Surface models depict severe heat islands across rural grids and storm pressure troughs.

## 2. HABITAT IMPACT & SECTOR DIAGNOSTICS
*   **Agricultural Output:** Multi-layered temperature indices predict early wheat maturation under persistent heatwave stressors.
*   **Urban Flooding Risk:** Low-lying drainage bottlenecks face immediate overflow threats under accelerated rain scenarios.
*   **Energy Overhead Load:** Cooling grids are simulated to sustain up to **+15.5% peak energy drain** to cope with heat waves.

## 3. ADVISORY ACTIONS & SECURITY PLAN
> "Strategic resource buffers must be provisioned ahead of intense sub-tropical moisture surges."
1.  **Deploy Smart Storm Catchments** within the lower Tash catchment area to slow critical runoffs.
2.  **Activate Dual Cooling Nodes** to prevent sudden urban electricity outages and grid brownouts.
3.  **Initiate Evaporation Crop Protection** in key agricultural farms.
`;

export default function ReportsView({ simulation, activeLayer }: ReportsViewProps) {
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const loaderLabels = [
    "ACQUIRING GRIDS DATA",
    "SOLVING SPREAD COUPLING EQUATIONS",
    "RENDERING TEMPORAL INTRUSION MODELS",
    "GENERATING REPORT VIA GEMINI SENSOR"
  ];

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setLoadStep(0);
    setError(null);

    const stepInterval = setInterval(() => {
      setLoadStep(prev => {
        if (prev < loaderLabels.length - 1) return prev + 1;
        return prev;
      });
    }, 1300);

    try {
      // Lazy payload build for Server Side API endpoint
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempOffset: simulation.tempOffset,
          rainIntensity: simulation.rainIntensity,
          activeLayer: activeLayer
        })
      });

      if (!response.ok) {
        throw new Error(`Cloud server answered with status ${response.status}`);
      }

      const data = await response.json();
      if (data && data.content) {
        setReport(data.content);
        // Load clean initial greeting into conversation flow
        setChatMessages([
          { 
            role: "model", 
            content: `### CLIMATE ADVISORY SYSTEM ENGAGED\nGreetings. I have generated your executive climatology assessment report based on the active **${simulation.tempOffset > 0 ? "+" : ""}${simulation.tempOffset.toFixed(1)}°C** temperature offset and **${simulation.rainIntensity}%** rain index. Ask me any scenario-specific questions about infrastructure security plans, flood pathways, or regional power grid load limits!` 
          }
        ]);
      } else {
        throw new Error("No payload content from Gemini server.");
      }
    } catch (err: any) {
      console.warn("API Error. Falling back to local twin analyzer heuristics.", err);
      // Soft interactive fallback so developers have complete interactive experience
      setTimeout(() => {
        const fallbackText = defaultReportSuggestion
          .replace("{{OFFSET_TEMP}}", (simulation.tempOffset > 0 ? "+" : "") + simulation.tempOffset.toFixed(1))
          .replace("{{OFFSET_RAIN}}", simulation.rainIntensity.toString());
        setReport(fallbackText);
        setChatMessages([
          { 
            role: "model", 
            content: `### LOCAL REPORT GENERATED (FALLBACK MODE)\nI have synthesized a localized analytical assessment report under simulation offsets **${simulation.tempOffset > 0 ? "+" : ""}${simulation.tempOffset.toFixed(1)}°C** and **${simulation.rainIntensity}%** precipitation intensity. Feel free to formulate advisory queries below!` 
          }
        ]);
      }, 5200);
    } finally {
      clearInterval(stepInterval);
      setTimeout(() => setIsLoading(false), 500);
    }
  };

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
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ClimateTwin_Assessment_Report_Offset_${simulation.tempOffset > 0 ? "plus" : ""}${simulation.tempOffset.toFixed(1)}C.md`;
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div>
              <span className="opacity-60 text-[9px] font-bold">STATION LOCATION:</span>
              <p className="text-slate-900 font-extrabold uppercase mt-0.5">CENTRAL INDIA</p>
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
          </div>
        </div>

        {/* Active Action state: Empty state vs Loader vs Display */}
        {!report && !isLoading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-4 py-16">
            <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-sans font-black text-slate-800 tracking-wider">
                NO METEOROLOGICAL REPORT GENERATED
              </h3>
              <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed">
                Click synthesized below to call Gemini AI modeling. It will analyze agricultural vulnerability matrices, storm surge risks, and drainage inundations.
              </p>
            </div>
            <button 
              onClick={handleGenerateReport}
              className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-sans font-black rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-100 cursor-pointer"
            >
              SYNTHESIZE EXECUTIVE REPORT
            </button>
          </div>
        ) : isLoading ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center gap-6 py-16">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-indigo-600 animate-spin ease-linear shrink-0" />
              <Bot className="w-6 h-6 text-indigo-600 absolute top-4 left-4 animate-bounce" />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono text-indigo-600 animate-pulse uppercase tracking-widest font-black">
                {loaderLabels[loadStep]}
              </p>
              <div className="w-64 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden border border-slate-200">
                <div 
                  className="bg-indigo-600 h-full duration-300 transition-all rounded-full"
                  style={{ width: `${((loadStep + 1) / loaderLabels.length) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-[9px] font-mono text-slate-400 max-w-xs uppercase font-semibold">
              Solving Navier-Stokes equations, performing spatial interpolation over Indian climate grids.
            </p>
          </div>
        ) : (
          /* Markdown Display HUD */
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-4 border-l-indigo-600 shadow-sm text-left select-text relative">
              {/* Floating control trigger for report */}
              <div className="absolute top-4 right-4 flex items-center gap-2 pointer-events-auto">
                <button 
                  onClick={handleGenerateReport}
                  className="p-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[9px] font-mono border border-indigo-200 text-indigo-700 font-extrabold transition-all cursor-pointer"
                >
                  RE-SYNTHESIZE
                </button>
                <button 
                  onClick={handleDownloadOfflineReport}
                  className="p-1.5 px-2.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg border border-slate-200 text-[9px] font-mono transition-all flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Download className="w-3 h-3" />
                  DOWNLOAD
                </button>
              </div>

              <div className="prose max-w-none text-left select-text mt-8">
                {renderMarkdown(report!)}
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
