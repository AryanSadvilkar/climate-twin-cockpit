import type { DistrictClimateData } from '../components/MapTwin';

export const districtBaselineData: Record<string, DistrictClimateData> = {
  Ahmadnagar: {
    temp: 31.2,
    rainfall: 520,
    humidity: 55,
    cropStress: 55,
    floodRisk: 10,
    waterAvailability: 45,
    heatVulnerability: 35,
    aiForecast: 'ACCELERATED SOIL DEGRADATION'
  },
  Akola: {
    temp: 34.1,
    rainfall: 680,
    humidity: 50,
    cropStress: 60,
    floodRisk: 15,
    waterAvailability: 40,
    heatVulnerability: 55,
    aiForecast: 'EXTREME SUMMER HEAT SPIKE'
  },
  Amravati: {
    temp: 33.5,
    rainfall: 720,
    humidity: 52,
    cropStress: 50,
    floodRisk: 20,
    waterAvailability: 50,
    heatVulnerability: 50,
    aiForecast: 'MODERATE CROPLAND EROSION'
  },
  Aurangabad: {
    temp: 32.0,
    rainfall: 640,
    humidity: 54,
    cropStress: 48,
    floodRisk: 12,
    waterAvailability: 48,
    heatVulnerability: 40,
    aiForecast: 'GROUNDWATER DEPLETION ANOMALY'
  },
  Bhandara: {
    temp: 30.5,
    rainfall: 1150,
    humidity: 68,
    cropStress: 30,
    floodRisk: 40,
    waterAvailability: 75,
    heatVulnerability: 28,
    aiForecast: 'HIGH RESERVOIR SATURATION'
  },
  Bid: {
    temp: 33.8,
    rainfall: 480,
    humidity: 45,
    cropStress: 72,
    floodRisk: 8,
    waterAvailability: 22,
    heatVulnerability: 62,
    aiForecast: 'SEVERE ARIDITY WARNING'
  },
  Buldana: {
    temp: 32.7,
    rainfall: 620,
    humidity: 52,
    cropStress: 54,
    floodRisk: 12,
    waterAvailability: 42,
    heatVulnerability: 45,
    aiForecast: 'SOIL MOISTURE DEFICIT'
  },
  Chandrapur: {
    temp: 34.6,
    rainfall: 1200,
    humidity: 62,
    cropStress: 38,
    floodRisk: 38,
    waterAvailability: 68,
    heatVulnerability: 68,
    aiForecast: 'THERMAL POWER HEAT DOME'
  },
  Dhule: {
    temp: 32.4,
    rainfall: 550,
    humidity: 50,
    cropStress: 58,
    floodRisk: 10,
    waterAvailability: 38,
    heatVulnerability: 42,
    aiForecast: 'HYDROLOGICAL DROUGHT PATHWAY'
  },
  Garhchiroli: {
    temp: 31.8,
    rainfall: 1420,
    humidity: 75,
    cropStress: 22,
    floodRisk: 45,
    waterAvailability: 85,
    heatVulnerability: 30,
    aiForecast: 'FOREST CANOPY MICROCLIMATE'
  },
  Gondiya: {
    temp: 30.8,
    rainfall: 1380,
    humidity: 72,
    cropStress: 25,
    floodRisk: 42,
    waterAvailability: 82,
    heatVulnerability: 26,
    aiForecast: 'MONSOON BUFFER STABILITY'
  },
  Hingoli: {
    temp: 31.9,
    rainfall: 680,
    humidity: 56,
    cropStress: 48,
    floodRisk: 15,
    waterAvailability: 52,
    heatVulnerability: 38,
    aiForecast: 'STABLE PREDICTIVE PATH'
  },
  Jalgaon: {
    temp: 33.6,
    rainfall: 590,
    humidity: 48,
    cropStress: 64,
    floodRisk: 12,
    waterAvailability: 35,
    heatVulnerability: 58,
    aiForecast: 'CRITICAL COTTON CROP STRESS'
  },
  Jalna: {
    temp: 32.2,
    rainfall: 580,
    humidity: 53,
    cropStress: 58,
    floodRisk: 10,
    waterAvailability: 32,
    heatVulnerability: 42,
    aiForecast: 'MARATHWADA ARIDIFICATION'
  },
  Kolhapur: {
    temp: 26.5,
    rainfall: 1850,
    humidity: 78,
    cropStress: 18,
    floodRisk: 62,
    waterAvailability: 92,
    heatVulnerability: 15,
    aiForecast: 'RIVERINE FLOOD WARNING'
  },
  Latur: {
    temp: 33.0,
    rainfall: 520,
    humidity: 46,
    cropStress: 68,
    floodRisk: 10,
    waterAvailability: 25,
    heatVulnerability: 50,
    aiForecast: 'WATER SHUNTING REQUIRED'
  },
  Mumbai: {
    temp: 29.5,
    rainfall: 2200,
    humidity: 82,
    cropStress: 10,
    floodRisk: 85,
    waterAvailability: 95,
    heatVulnerability: 22,
    aiForecast: 'HIGH URBAN FLOOD RISK'
  },
  'Mumbai Suburban': {
    temp: 29.8,
    rainfall: 2250,
    humidity: 81,
    cropStress: 10,
    floodRisk: 88,
    waterAvailability: 95,
    heatVulnerability: 25,
    aiForecast: 'FLASH PLUVIAL INUNDATION'
  },
  Nagpur: {
    temp: 34.2,
    rainfall: 980,
    humidity: 55,
    cropStress: 42,
    floodRisk: 25,
    waterAvailability: 62,
    heatVulnerability: 65,
    aiForecast: 'URBAN HEAT ISLAND EXTENSION'
  },
  Nanded: {
    temp: 33.4,
    rainfall: 720,
    humidity: 50,
    cropStress: 52,
    floodRisk: 18,
    waterAvailability: 46,
    heatVulnerability: 48,
    aiForecast: 'METEOROLOGICAL FLUX INDICATOR'
  },
  Nandurbar: {
    temp: 32.8,
    rainfall: 710,
    humidity: 56,
    cropStress: 48,
    floodRisk: 15,
    waterAvailability: 48,
    heatVulnerability: 45,
    aiForecast: 'TRIBAL BELT SOIL INSTABILITY'
  },
  Nashik: {
    temp: 28.5,
    rainfall: 950,
    humidity: 65,
    cropStress: 30,
    floodRisk: 22,
    waterAvailability: 78,
    heatVulnerability: 25,
    aiForecast: 'HORTICULTURAL MICROCLIMATE SHIFT'
  },
  Osmanabad: {
    temp: 32.8,
    rainfall: 510,
    humidity: 48,
    cropStress: 65,
    floodRisk: 8,
    waterAvailability: 28,
    heatVulnerability: 48,
    aiForecast: 'RECURRING DROUGHT PATHWAY'
  },
  Palghar: {
    temp: 29.6,
    rainfall: 2100,
    humidity: 80,
    cropStress: 15,
    floodRisk: 72,
    waterAvailability: 90,
    heatVulnerability: 20,
    aiForecast: 'HIGH TIDAL OVERFLOW VULNERABILITY'
  },
  Parbhani: {
    temp: 33.2,
    rainfall: 600,
    humidity: 50,
    cropStress: 60,
    floodRisk: 12,
    waterAvailability: 35,
    heatVulnerability: 52,
    aiForecast: 'AGRICULTURAL YIELD DEPRESSION'
  },
  Pune: {
    temp: 29.0,
    rainfall: 850,
    humidity: 68,
    cropStress: 26,
    floodRisk: 20,
    waterAvailability: 80,
    heatVulnerability: 22,
    aiForecast: 'VALLEY RAIN SHADOW EXTENSION'
  },
  Raigarh: {
    temp: 29.2,
    rainfall: 2400,
    humidity: 84,
    cropStress: 12,
    floodRisk: 78,
    waterAvailability: 94,
    heatVulnerability: 20,
    aiForecast: 'COASTAL SALINITY SEEPAGE'
  },
  Ratnagiri: {
    temp: 28.8,
    rainfall: 2800,
    humidity: 85,
    cropStress: 10,
    floodRisk: 80,
    waterAvailability: 98,
    heatVulnerability: 18,
    aiForecast: 'MONSOON SURGE INUNDATION'
  },
  Sangli: {
    temp: 30.2,
    rainfall: 580,
    humidity: 62,
    cropStress: 45,
    floodRisk: 30,
    waterAvailability: 58,
    heatVulnerability: 30,
    aiForecast: 'RIVER BASIN FLOOD/DROUGHT CYCLE'
  },
  Satara: {
    temp: 27.5,
    rainfall: 910,
    humidity: 70,
    cropStress: 28,
    floodRisk: 32,
    waterAvailability: 72,
    heatVulnerability: 22,
    aiForecast: 'GHATS SLOPING LANDSLIDE VULN'
  },
  Sindhudurg: {
    temp: 28.5,
    rainfall: 3100,
    humidity: 86,
    cropStress: 8,
    floodRisk: 75,
    waterAvailability: 98,
    heatVulnerability: 15,
    aiForecast: 'ESTUARINE HABITAT COMPRESSION'
  },
  Solapur: {
    temp: 33.9,
    rainfall: 450,
    humidity: 42,
    cropStress: 75,
    floodRisk: 5,
    waterAvailability: 18,
    heatVulnerability: 60,
    aiForecast: 'SEVERE RESERVOIR CRYSIS'
  },
  Thane: {
    temp: 29.8,
    rainfall: 2150,
    humidity: 81,
    cropStress: 12,
    floodRisk: 80,
    waterAvailability: 95,
    heatVulnerability: 24,
    aiForecast: 'RUNOFF CO-EFFICIENT SURGE'
  },
  Wardha: {
    temp: 33.7,
    rainfall: 790,
    humidity: 54,
    cropStress: 48,
    floodRisk: 22,
    waterAvailability: 54,
    heatVulnerability: 52,
    aiForecast: 'CRITICAL COTTON BELT SHIFT'
  },
  Washim: {
    temp: 32.5,
    rainfall: 690,
    humidity: 53,
    cropStress: 50,
    floodRisk: 14,
    waterAvailability: 46,
    heatVulnerability: 44,
    aiForecast: 'STABLE BASELINE'
  },
  Yavatmal: {
    temp: 33.6,
    rainfall: 750,
    humidity: 50,
    cropStress: 54,
    floodRisk: 18,
    waterAvailability: 48,
    heatVulnerability: 52,
    aiForecast: 'AGRO-METEOROLOGICAL DROUGHT PATH'
  }
};
