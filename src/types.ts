export type PanelTab = "dashboard" | "analytics" | "reports" | "map";

export type WeatherLayer = "temp" | "precip" | "wind" | "pressure" | "humidity" | "drought" | "cloud";

export interface LayerConfig {
  id: WeatherLayer;
  name: string;
  title: string;
  maxLabel: string;
  minLabel: string;
  unit: string;
  gradientClass: string;
  analysisTitle: string;
  metric1: { label: string; value: string };
  metric2: { label: string; value: string };
}

export interface SimulationParams {
  tempOffset: number;
  rainIntensity: number;
}

export interface RadarStatus {
  name: string;
  status: "OK" | "SYNCING" | "OFFLINE";
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface WindParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  opacity: number;
}
