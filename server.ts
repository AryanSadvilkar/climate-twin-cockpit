import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// CORS headers for local development fetching
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Serve 7-day forecast model data
app.get("/api/forecast/weekly", (req, res) => {
  try {
    const rootDir = process.cwd();
    const forecastPath = path.join(rootDir, "data", "forecast_7d.json");
    const data = fs.readFileSync(forecastPath, "utf8");
    res.setHeader("Content-Type", "application/json");
    res.send(data);
  } catch (err: any) {
    console.error("Forecast API Error:", err);
    res.status(500).json({ error: "Failed to read forecast data" });
  }
});
// Initialize GoogleGenAI securely on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Scientific weather assessment prompt generation
app.post("/api/gemini/generate-report", async (req, res) => {
  const { layer, tempOffset, rainIntensity, scaleMin, scaleMax, activeTimeline, cycloneStatus } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in the environment variables. Please add it in Settings > Secrets."
    });
  }

  try {
    const prompt = `
      You are ClimateTwin AI, a hyper-accurate climatology and digital-twin simulator assistant for meteorological risk mitigation in India.
      Synthesize an executive climatology simulation assessment based on the following geospatial twin active variables:
      
      - ACTIVE DATA OVERLAY: ${layer.toUpperCase()} (Simulated scale range from ${scaleMin} to ${scaleMax})
      - WHAT-IF CLIMATE OFFSET:
         * Temperature Offset: ${tempOffset > 0 ? "+" : ""}${tempOffset}°C
         * Rain Intensity: ${rainIntensity}% of historical baseline
      - TEMPORAL INDEX: ${activeTimeline}
      - EMERGENCY ALERTS: ${cycloneStatus || "None active"}
      
      Structure your report in highly clean, detailed Markdown format suitable for scientists, urban planners, and defense forces.
      Include these specific sections:
      
      1. Climatological Assessment
         Present an analysis of this simulated meteorological scenario. Discuss local and regional atmospheric shifts.
      
      2. Agricultural & Hydrological Vulnerabilities
         Forecast specific impacts on Indian soil conditions, river catchments (e.g., Ganges/Brahmaputra, Godavari basins), crop yields (Kharif/Rabi), and regional reservoirs based on the offset parameters.
      
      3. Urban Risk & Infrastructure Hazards
         Examine storm surge risks, municipal water saturation, electrical grid stresses, and transportation bottlenecks in key Indian metros like Mumbai, Delhi, Chennai, or Kolkata given these offsets.
      
      4. Mitigation & Action Protocol
         Deliver 3-4 actionable commands for state authorities (IMD, NDMA, municipal corporations) to deploy immediately.
         
      Keep the tone strictly clinical, authoritatively scientific, and incredibly professional. Do not use conversational filler or self-promotion. Use clear titles and bullet points.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const reportText = response.text || "No report generated.";
    res.json({ report: reportText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI report" });
  }
});

// Interactive scenario chat assistant
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, simulation, layer } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in the environment variables. Please add it in Settings > Secrets."
    });
  }

  try {
    // Construct active system instructions regarding current geospatial digital twin state
    const systemInstruction = `
      You are ClimateTwin AI, a professional geophysicist, meteorologist, and disaster management consultant for state agencies in India.
      The user is testing weather models on a high-fidelity geospatial simulator mapping Central & Western India.
      The current simulation settings are:
      - Active meteorological overlay layer: ${layer.toUpperCase()}
      - Temperature Offset: ${simulation.tempOffset > 0 ? "+" : ""}${simulation.tempOffset.toFixed(1)}°C
      - Precipitation/Rain Intensity: ${simulation.rainIntensity}% of historical baseline
      - Warning State: Extreme Cyclone Asani Warning is ACTIVE tracking North-West.
      
      Respond to the user's meteorological questions with absolute scientific precision, using local Indian geography contexts (e.g. Ganges river plains, Godavari basin, coastal Mumbai storm-surge, Deccan soil aridity coefficient).
      Always format your answers in highly clean Markdown. Avoid conversational fluff. Keep answers concise, objective, and deeply analytical.
    `;

    // Map conversation array to genAI contents structure
    const contents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ text: response.text || "No response received." });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    res.status(500).json({ error: error.message || "Failed to call Gemini Chat API" });
  }
});

// Streamlined Executive Report Endpoint
app.post("/api/report", async (req, res) => {
  const { tempOffset, rainIntensity, activeLayer } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in the environment variables. Please add it in Settings > Secrets."
    });
  }

  try {
    const prompt = `
      You are ClimateTwin AI, a hyper-accurate climatology and digital-twin simulator assistant for meteorological risk mitigation in India.
      Synthesize an executive climatology simulation assessment based on the following geospatial twin active variables:
      
      - ACTIVE DATA OVERLAY: ${activeLayer ? activeLayer.toUpperCase() : "TEMPERATURE"}
      - WHAT-IF CLIMATE OFFSET:
         * Temperature Offset: ${tempOffset > 0 ? "+" : ""}${tempOffset}°C
         * Rain Intensity: ${rainIntensity}% of historical baseline
      - TEMPORAL INDEX: NOW
      - EMERGENCY ALERTS: Cyclone Asani NW is ACTIVE
      
      Structure your report in highly clean, detailed Markdown format suitable for scientists, urban planners, and defense forces.
      Include these specific sections:
      
      # EXECUTIVE SYNTHESIS REPORT: TWIN STATE ASSESSMENT
      ---
      ## 1. STRATEGIC METEOROLOGICAL FORECAST
      Provide a highly professional analysis of this simulated meteorological scenario. Discuss local and regional atmospheric shifts.
      
      ## 2. HABITAT IMPACT & SECTOR DIAGNOSTICS
      Forecast specific impacts on Indian soil conditions, river catchments (e.g., Ganges/Brahmaputra, Godavari basins), crop yields (Kharif/Rabi), and regional reservoirs based on the offset parameters.
      
      ## 3. ADVISORY ACTIONS & SECURITY PLAN
      Examine storm surge risks, municipal water saturation, electrical grid stresses, and transportation bottlenecks in key Indian metros like Mumbai, Delhi, Chennai, or Kolkata given these offsets.
      Deliver 3-4 actionable commands for state authorities (IMD, NDMA, municipal corporations) to deploy immediately.
          
      Keep the tone strictly clinical, authoritatively scientific, and incredibly professional. Do not use conversational filler or self-promotion. Use clear titles and bullet points. Enclose key phrases in **bold** terms for legibility.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ content: response.text || "No report generated." });
  } catch (error: any) {
    console.error("Gemini report endpoint failure:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI report" });
  }
});

// Streamlined Chat Assistant Endpoint
app.post("/api/chat", async (req, res) => {
  const { message, tempOffset, rainIntensity, activeLayer, history } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in the environment variables. Please add it in Settings > Secrets."
    });
  }

  try {
    const systemInstruction = `
      You are ClimateTwin AI, a professional geophysicist, meteorologist, and disaster management consultant for state agencies in India.
      The user is testing weather models on a high-fidelity geospatial simulator mapping Central & Western India.
      The current simulation settings are:
      - Active meteorological overlay layer: ${(activeLayer || "temp").toUpperCase()}
      - Temperature Offset: ${tempOffset > 0 ? "+" : ""}${Number(tempOffset).toFixed(1)}°C
      - Precipitation/Rain Intensity: ${rainIntensity}% of historical baseline
      - Warning State: Extreme Cyclone Asani Warning is ACTIVE tracking North-West.
      
      Respond to the user's meteorological questions with absolute scientific precision, using local Indian geography contexts (e.g. Ganges river plains, Godavari basin, coastal Mumbai storm-surge, Deccan soil aridity coefficient).
      Always format your answers in highly clean Markdown. Avoid conversational fluff. Keep answers concise, objective, and deeply analytical.
    `;

    // Map conversation array to genAI contents structure
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((m: any) => {
        // Only push clean role matches
        if (m.role === "user" || m.role === "model") {
          contents.push({
            role: m.role,
            parts: [{ text: m.content }]
          });
        }
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    res.json({ reply: response.text || "No response received." });
  } catch (error: any) {
    console.error("Gemini chat endpoint failure:", error);
    res.status(500).json({ error: error.message || "Failed to call Gemini Chat API" });
  }
});

// Serve district names list for typeahead UI
app.get('/api/districts', (req, res) => {
  try {
    const rootDir = process.cwd();
    const districtFile = path.join(rootDir, "model", "district_names.txt");
    const content = fs.readFileSync(districtFile, 'utf-8');
    const districts = content.split(/\r?\n/).map((d: string) => d.trim()).filter((d: string) => d.length > 0);
    res.json(districts);
  } catch (err: any) {
    console.error('Failed to read district_names.txt:', err);
    res.status(500).json({ error: 'Could not load district list' });
  }
});

// Python model prediction endpoint
app.post('/api/predict/tomorrow', (req, res) => {
  const { district } = req.body;
  if (!district) {
    return res.status(400).json({ error: 'District is required' });
  }

  const rootDir = process.cwd();
  const pythonPath = 'python';
  const scriptPath = path.join(rootDir, "model", "predict_district.py");
  
  const child = spawn(pythonPath, [scriptPath], {
    cwd: path.join(rootDir, "model"),
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
  });
  let output = '';
  let errorOutput = '';

  child.stdin.write(district + '\n');
  child.stdin.end();

  child.stdout.on('data', (data) => { output += data.toString('utf-8'); });
  child.stderr.on('data', (data) => { errorOutput += data.toString('utf-8'); });

  const timeout = setTimeout(() => {
    child.kill();
    res.status(500).json({ error: 'Prediction timed out' });
  }, 15000);

  child.on('close', (code) => {
    clearTimeout(timeout);
    console.log('District requested:', district);
    console.log('Raw stdout:', output);
    if (errorOutput) console.log('Stderr:', errorOutput);

    try {
      const lines = output.split('\n').filter(line => line.includes(':'));
      const result: Record<string, string> = {};
      const keyMap: Record<string, string> = {
        'District': 'district', 'Date': 'date', 'Mean Temp': 'meanTemp',
        'Max Temp': 'maxTemp', 'Min Temp': 'minTemp', 'Humidity': 'humidity',
        'Rainfall': 'rainfall', 'Pressure': 'pressure', 'Solar Radiation': 'solarRadiation'
      };
      lines.forEach(line => {
        const idx = line.indexOf(':');
        const rawKey = line.substring(0, idx).trim();
        const value = line.substring(idx + 1).trim();
        const mappedKey = keyMap[rawKey];
        if (mappedKey) result[mappedKey] = value;
      });
      console.log('Parsed JSON:', result);
      res.json(result);
    } catch (err) {
      console.error('Parse error:', err);
      res.status(500).json({ error: 'Failed to parse prediction output' });
    }
  });
});

// Serve static assets or mount Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ClimateTwin India Server running on http://localhost:${PORT}`);
  });
}

startServer();
