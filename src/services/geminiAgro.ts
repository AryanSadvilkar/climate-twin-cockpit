export interface AgroAdvisory {
  farmingTips: string[];
  pestRisk: {
    level: "Low" | "Moderate" | "High";
    percentage: number;
    description: string;
  };
  irrigationAdvice: string;
  severeWeatherAlert?: string;
}

/**
 * Service to simulate the Gemini Agro Advisory Engine.
 * Constructs the contextual prompt and generates parsed JSON recommendations.
 */
export async function generateAgroAdvisory(
  districtName: string,
  temp: number,
  humidity: number,
  rain: number,
  pH: number,
  soilMoisture: number,
  crops: string[]
): Promise<AgroAdvisory> {
  const prompt = `Context: District ${districtName}, Weather: ${temp.toFixed(1)}°C / ${humidity.toFixed(1)}% / ${rain.toFixed(1)}mm, Soil: pH ${pH.toFixed(1)} / Moisture ${soilMoisture}%, Crops: ${crops.join(", ")}. Generate localized farming tips, pest/disease risk levels (Low/Moderate/High), and specific irrigation advice.`;
  
  console.log("GEMINI AGRO ENGINE PROMPT:\n", prompt);

  // Simulate network latency of the Gemini Inference Pass
  await new Promise((resolve) => setTimeout(resolve, 600));

  let riskLevel: "Low" | "Moderate" | "High" = "Moderate";
  let riskPct = 40;
  let pestDesc = "";
  let tips: string[] = [];
  let irrigation = "";
  let alertText = "";

  // Dynamic meteorological reasoning
  if (temp > 35 && soilMoisture < 35) {
    riskLevel = "High";
    riskPct = 85;
    pestDesc = "Extreme risk of Sucking Pests (Thrips and Jassids) due to heat stresses and drying soil layers.";
    tips = [
      "Set up yellow sticky traps to intercept sucking pests.",
      "Apply light straw mulch to limit surface moisture evaporation.",
      "Postpone synthetic fertilizer additions until humidity rises to avoid leaf burn."
    ];
    irrigation = "Schedule immediate sprinkler run of 15mm. Evapotranspiration is high.";
    alertText = "SEVERE HEATWAVE WARNING: Temperature exceeds 35°C. Immediate risk of crop dehydration.";
  } else if (rain > 80 || humidity > 85) {
    riskLevel = "High";
    riskPct = 75;
    pestDesc = "High risk of Fungal Leaf Blight and Root Rot under saturated humidity and standing water.";
    tips = [
      "Open field bunds to drain excess water from lower crop terraces.",
      "Apply localized fungicide sprays once dry spells resume.",
      "Check root zones for structural soft rot or root decay."
    ];
    irrigation = "SUSPEND IRRIGATION: Rainfall accumulation has saturated topsoil layers.";
    alertText = "HEAVY PRECIPITATION ALERT: High risk of surface runoff and root drowning.";
  } else {
    riskLevel = "Low";
    riskPct = 20;
    pestDesc = "Low pest pressure. Environmental metrics within standard agricultural comfort zones.";
    tips = [
      "Perform regular shallow weeding between crop beds.",
      "Apply preventive organic neem oil spray (10,000 ppm).",
      "Monitor timeline calendar for next planned top-dressing."
    ];
    irrigation = "Maintain standard micro-irrigation cycle of 6-8mm in 48 hours.";
  }

  return {
    farmingTips: tips,
    pestRisk: {
      level: riskLevel,
      percentage: riskPct,
      description: pestDesc
    },
    irrigationAdvice: irrigation,
    severeWeatherAlert: alertText || undefined
  };
}
