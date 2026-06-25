export interface CityIndex {
  name: string;
  state: string;
  left: number; // Percent on map width
  top: number;  // Percent on map height
  baseTemp: number;
  baseRain: number;
  description: string;
  focus: boolean;
  status: string;
}

export const CITIES_INDEX: CityIndex[] = [
  // --- NORTH INDIA (Jammu & Kashmir, Ladakh, Himachal, Punjab, Haryana, Uttarakhand) ---
  { name: "Srinagar", state: "Jammu & Kashmir", left: 41, top: 7, baseTemp: 18.5, baseRain: 85, description: "Summer Capital of J&K • North Valley Post", focus: false, status: "Cold Wave Threshold" },
  { name: "Jammu", state: "Jammu & Kashmir", left: 40, top: 11, baseTemp: 24.2, baseRain: 95, description: "Winter Capital of J&K • Shivalik Foothills", focus: false, status: "Stable Envelope" },
  { name: "Leh", state: "Ladakh", left: 47, top: 6, baseTemp: 11.5, baseRain: 15, description: "High-Altitude cold desert outpost", focus: true, status: "Extremely Arid Alert" },
  { name: "Shimla", state: "Himachal Pradesh", left: 45, top: 14, baseTemp: 17.2, baseRain: 110, description: "State Capital • Ridge Weather Station", focus: false, status: "Normal" },
  { name: "Dharamshala", state: "Himachal Pradesh", left: 44, top: 13, baseTemp: 20.4, baseRain: 160, description: "Kangra Valley Meteorological Array", focus: false, status: "Trough Influx" },
  { name: "Amritsar", state: "Punjab", left: 38, top: 13, baseTemp: 32.2, baseRain: 60, description: "West Border Sentinel Station", focus: false, status: "Thermal Ridge Active" },
  { name: "Ludhiana", state: "Punjab", left: 40, top: 15, baseTemp: 31.8, baseRain: 70, description: "Central Punjab Agro-Met Unit", focus: false, status: "Normal" },
  { name: "Chandigarh", state: "Punjab & Haryana", left: 43, top: 15, baseTemp: 30.5, baseRain: 80, description: "Joint Capital Met Tower", focus: false, status: "Stable" },
  { name: "Gurugram", state: "Haryana", left: 43, top: 21, baseTemp: 34.2, baseRain: 50, description: "NCR Industrial Corridor Grid", focus: false, status: "Heat Dome Border" },
  { name: "Dehradun", state: "Uttarakhand", left: 47, top: 16, baseTemp: 25.4, baseRain: 140, description: "State Capital • Doon Valley Observatory", focus: false, status: "Mountain Slope Condensation" },
  { name: "Nainital", state: "Uttarakhand", left: 49, top: 18, baseTemp: 16.8, baseRain: 125, description: "Lake Region Barometric Node", focus: false, status: "Mild Uplift Flow" },

  // --- NATIONAL CAPITAL REGION ---
  { name: "Delhi", state: "Delhi NCR", left: 44, top: 20, baseTemp: 35.8, baseRain: 75, description: "National Capital Meteorological HQ", focus: true, status: "Severe Thermal Envelope" },
  { name: "Noida", state: "Uttar Pradesh", left: 45, top: 20.5, baseTemp: 35.5, baseRain: 70, description: "NCR East Trough Array", focus: false, status: "Stable Heat" },
  { name: "Ghaziabad", state: "Uttar Pradesh", left: 45.2, top: 20, baseTemp: 35.6, baseRain: 72, description: "NCR Northeast Boundary Station", focus: false, status: "Normal" },

  // --- WEST INDIA (Rajasthan & Gujarat) ---
  { name: "Jaipur", state: "Rajasthan", left: 35, top: 25, baseTemp: 34.8, baseRain: 65, description: "State Capital • Pink City Observatory", focus: false, status: "Heatwave Alert" },
  { name: "Jodhpur", state: "Rajasthan", left: 28, top: 26, baseTemp: 36.5, baseRain: 40, description: "Thar Desert Gateway Radar", focus: false, status: "Thermal Plume Center" },
  { name: "Jaisalmer", state: "Rajasthan", left: 21, top: 25, baseTemp: 39.2, baseRain: 15, description: "Deep Thar Desert Sentry Station", focus: true, status: "Severe Heatwave Warning" },
  { name: "Udaipur", state: "Rajasthan", left: 30, top: 32, baseTemp: 33.4, baseRain: 80, description: "Aravalli Range Hydro Station", focus: false, status: "Normal" },
  { name: "Ahmedabad", state: "Gujarat", left: 25, top: 37, baseTemp: 35.0, baseRain: 95, description: "Sabarmati Basin Meteorological Site", focus: false, status: "High Temperature Dome" },
  { name: "Gandhinagar", state: "Gujarat", left: 25, top: 36, baseTemp: 34.8, baseRain: 90, description: "State Capital • Green Zone Monitor", focus: false, status: "Normal" },
  { name: "Surat", state: "Gujarat", left: 25, top: 43, baseTemp: 32.5, baseRain: 180, description: "Tapi River Estuary Monitoring Station", focus: false, status: "Coastal Humidity Index High" },
  { name: "Rajkot", state: "Gujarat", left: 18, top: 39, baseTemp: 34.6, baseRain: 75, description: "Saurashtra Arid Region Node", focus: false, status: "Normal" },
  { name: "Bhuj", state: "Gujarat", left: 14, top: 35, baseTemp: 37.0, baseRain: 45, description: "Rann of Kutch Seismic-Met Post", focus: false, status: "Arid Winds Warning" },

  // --- CENTRAL INDIA (Madhya Pradesh & Chhattisgarh) ---
  { name: "Bhopal", state: "Madhya Pradesh", left: 43, top: 37, baseTemp: 33.2, baseRain: 110, description: "State Capital • Central India Highlands Node", focus: false, status: "Normal" },
  { name: "Indore", state: "Madhya Pradesh", left: 39, top: 39, baseTemp: 32.8, baseRain: 105, description: "Malwa Plateau Forecast Center", focus: false, status: "Stable Atmosphere" },
  { name: "Gwalior", state: "Madhya Pradesh", left: 45, top: 29, baseTemp: 36.4, baseRain: 80, description: "North MP Thermal Convection Core", focus: false, status: "Heat Dome Overlay" },
  { name: "Jabalpur", state: "Madhya Pradesh", left: 49, top: 39, baseTemp: 32.5, baseRain: 130, description: "Narmada Rift Valley Observatory", focus: false, status: "Rain Trough Boundary" },
  { name: "Raipur", state: "Chhattisgarh", left: 55, top: 43, baseTemp: 33.8, baseRain: 140, description: "State Capital • Mahanadi Catchment Unit", focus: false, status: "Normal" },
  { name: "Bilaspur", state: "Chhattisgarh", left: 55, top: 41, baseTemp: 34.2, baseRain: 135, description: "Mining Zone Thermal Tracer Array", focus: false, status: "Moderate Pressure" },

  // --- EAST INDIA (Bihar, Jharkhand, Odisha, West Bengal) ---
  { name: "Patna", state: "Bihar", left: 63, top: 30, baseTemp: 33.5, baseRain: 115, description: "State Capital • Ganges River Plain Observatory", focus: false, status: "Normal" },
  { name: "Gaya", state: "Bihar", left: 63, top: 32, baseTemp: 34.8, baseRain: 105, description: "South Bihar Thermal Dome Station", focus: false, status: "Mild Thermal Lift" },
  { name: "Ranchi", state: "Jharkhand", left: 62, top: 36, baseTemp: 29.8, baseRain: 135, description: "State Capital • Chota Nagpur Plateau Station", focus: false, status: "Normal" },
  { name: "Jamshedpur", state: "Jharkhand", left: 64, top: 38, baseTemp: 32.4, baseRain: 150, description: "Subarnarekha Industrial Air Basin", focus: false, status: "Normal" },
  { name: "Kolkata", state: "West Bengal", left: 69, top: 39, baseTemp: 32.0, baseRain: 220, description: "State Capital • Hooghly Tidal Met HQ", focus: true, status: "Outer Cyclone bands" },
  { name: "Darjeeling", state: "West Bengal", left: 67, top: 23, baseTemp: 14.5, baseRain: 280, description: "Himalayan Ridge Frost Observation Station", focus: false, status: "Fog Density Warning" },
  { name: "Bhubaneswar", state: "Odisha", left: 61, top: 46, baseTemp: 32.2, baseRain: 190, description: "State Capital • Coastal Plains Radar Station", focus: true, status: "High Tide Surge Warning" },
  { name: "Cuttack", state: "Odisha", left: 61, top: 45, baseTemp: 32.0, baseRain: 195, description: "Mahanadi Delta Hydro Station", focus: false, status: "High Silt Runoff Alert" },
  { name: "Puri", state: "Odisha", left: 62, top: 47, baseTemp: 31.0, baseRain: 215, description: "Jagannath Coast Wave-Radar Sentry", focus: false, status: "Coastal Surge Warning" },

  // --- NORTH-EAST INDIA (Assam, Meghalaya, Tripura, Mizoram, Manipur, Nagaland, Arunachal, Sikkim) ---
  { name: "Guwahati", state: "Assam", left: 77, top: 27, baseTemp: 29.2, baseRain: 195, description: "Brahmaputra Basin Meteorological Node", focus: true, status: "Heavy Precipitation Threat" },
  { name: "Shillong", state: "Meghalaya", left: 78, top: 29, baseTemp: 21.0, baseRain: 310, description: "State Capital • Khasi Hills Pluviometry Hub", focus: false, status: "Extreme Rainfall Accumulation" },
  { name: "Cherrapunji", state: "Meghalaya", left: 78, top: 30, baseTemp: 20.2, baseRain: 450, description: "World Wettest Station High Pluviometer", focus: true, status: "Monsoon Surge Active" },
  { name: "Gangtok", state: "Sikkim", left: 67, top: 25, baseTemp: 16.5, baseRain: 220, description: "Teesta River Valley High Altitude Node", focus: false, status: "Normal" },
  { name: "Itanagar", state: "Arunachal Pradesh", left: 81, top: 25, baseTemp: 25.8, baseRain: 240, description: "State Capital • Eastern Himalaya Footprint", focus: false, status: "Normal" },
  { name: "Kohima", state: "Nagaland", left: 84, top: 28, baseTemp: 22.4, baseRain: 190, description: "State Capital • Naga Hills Observatory", focus: false, status: "Normal" },
  { name: "Imphal", state: "Manipur", left: 83, top: 30, baseTemp: 26.5, baseRain: 180, description: "State Capital • Loktak Basin Sentry", focus: false, status: "Stable Envelope" },
  { name: "Aizawl", state: "Mizoram", left: 81, top: 32, baseTemp: 24.8, baseRain: 230, description: "State Capital • Mizo Ridge Hill Sentry", focus: false, status: "Normal" },
  { name: "Agartala", state: "Tripura", left: 77, top: 32, baseTemp: 31.2, baseRain: 210, description: "State Capital • Border Station Network", focus: false, status: "Normal" },

  // --- SOUTH INDIA (Telangana, Andhra Pradesh, Karnataka, Goa, Tamil Nadu, Kerala, Lakshadweep, Andaman) ---
  { name: "Hyderabad", state: "Telangana", left: 45, top: 58, baseTemp: 33.4, baseRain: 110, description: "Deccan Radar & Telemetry Capital HQ", focus: true, status: "Stable Atmosphere" },
  { name: "Warangal", state: "Telangana", left: 47, top: 56, baseTemp: 34.0, baseRain: 115, description: "Kakatiya District Met Post", focus: false, status: "Normal" },
  { name: "Visakhapatnam", state: "Andhra Pradesh", left: 54, top: 54, baseTemp: 31.8, baseRain: 185, description: "Eastern Naval Command Radar Station", focus: true, status: "Cyclone Boundary Currents" },
  { name: "Vijayawada", state: "Andhra Pradesh", left: 49, top: 58, baseTemp: 34.5, baseRain: 130, description: "Krishna River Basin Flood Monitor", focus: false, status: "Thermal Convective Front" },
  { name: "Tirupati", state: "Andhra Pradesh", left: 46, top: 66, baseTemp: 33.8, baseRain: 100, description: "Seshachalam Biosphere Uplift Array", focus: false, status: "Normal" },
  { name: "Bengaluru", state: "Karnataka", left: 41, top: 69, baseTemp: 28.2, baseRain: 130, description: "Karnataka Capital Plateau Cluster", focus: true, status: "Wind Shear Convergence" },
  { name: "Mysuru", state: "Karnataka", left: 40, top: 71, baseTemp: 29.5, baseRain: 120, description: "South Karnataka agro-ecological post", focus: false, status: "Normal" },
  { name: "Hubballi", state: "Karnataka", left: 34, top: 61, baseTemp: 31.6, baseRain: 90, description: "North Karnataka Uplift Sensor", focus: false, status: "Normal" },
  { name: "Mangaluru", state: "Karnataka", left: 33, top: 67, baseTemp: 31.5, baseRain: 240, description: "Coastal Karnataka Harbor Barometer", focus: false, status: "Coastal Surge Warning" },
  { name: "Panaji", state: "Goa", left: 30, top: 59, baseTemp: 31.2, baseRain: 250, description: "Mandovi Estuary Met Observatory", focus: false, status: "Marine Saturated Layer" },
  { name: "Mumbai", state: "Maharashtra", left: 27, top: 49, baseTemp: 30.5, baseRain: 280, description: "State Capital Coastal Metro Array", focus: true, status: "Coastal Moisture Trough" },
  { name: "Pune", state: "Maharashtra", left: 30, top: 51, baseTemp: 31.0, baseRain: 140, description: "Western Ghats Rainshadow Post", focus: false, status: "Stable Overlay" },
  { name: "Nagpur", state: "Maharashtra", left: 48, top: 41, baseTemp: 35.5, baseRain: 120, description: "Central India Geographic Array Center", focus: true, status: "Hyper-Thermal Dome Active" },
  { name: "Nashik", state: "Maharashtra", left: 29, top: 47, baseTemp: 32.2, baseRain: 100, description: "Godavari River Origin Station", focus: false, status: "Normal" },
  { name: "Aurangabad", state: "Maharashtra", left: 34, top: 47, baseTemp: 33.8, baseRain: 95, description: "Marathwada Meteorological Sentinel", focus: false, status: "Stable Arid" },
  { name: "Solapur", state: "Maharashtra", left: 37, top: 54, baseTemp: 34.6, baseRain: 90, description: "South Maharashtra Thermal Envelope", focus: false, status: "Thermal Convective Front" },
  { name: "Chennai", state: "Tamil Nadu", left: 46, top: 69, baseTemp: 33.5, baseRain: 170, description: "State Capital Coastline Cyclone HQ", focus: true, status: "Bay of Bengal High Swell" },
  { name: "Coimbatore", state: "Tamil Nadu", left: 40, top: 74, baseTemp: 30.2, baseRain: 95, description: "Western Ghats Palghat Gap Watcher", focus: false, status: "Normal" },
  { name: "Madurai", state: "Tamil Nadu", left: 42, top: 77, baseTemp: 34.0, baseRain: 110, description: "South TN Convective Energy Field", focus: false, status: "Mild Heat Grid" },
  { name: "Salem", state: "Tamil Nadu", left: 43, top: 72, baseTemp: 32.6, baseRain: 115, description: "Steel City Atmospheric Observatory", focus: false, status: "Normal" },
  { name: "Kochi", state: "Kerala", left: 37, top: 76, baseTemp: 31.0, baseRain: 290, description: "Malabar Coastal Port Observatory", focus: false, status: "Precipitational Influx" },
  { name: "Thiruvananthapuram", state: "Kerala", left: 39, top: 81, baseTemp: 30.8, baseRain: 270, description: "Southern Peninsula Cape Radar HQ", focus: true, status: "Equatorial Trough Convergence" },
  { name: "Kozhikode", state: "Kerala", left: 36, top: 73, baseTemp: 31.2, baseRain: 280, description: "Malabar High Humidity Station", focus: false, status: "Normal" },
  { name: "Puducherry", state: "Union Territory", left: 46.5, top: 70, baseTemp: 32.8, baseRain: 160, description: "UT Coastal Swell Radar", focus: false, status: "Normal" },
  { name: "Kavaratti", state: "Lakshadweep", left: 24, top: 78, baseTemp: 31.5, baseRain: 190, description: "Lakshadweep Sea Barometric Node", focus: false, status: "Tropical High Wind Swell" },
  { name: "Port Blair", state: "Andaman & Nicobar", left: 81, top: 67, baseTemp: 30.2, baseRain: 310, description: "Bay of Bengal Deep Sea Met Warning HQ", focus: true, status: "Severe Sea State Alert" }
];
