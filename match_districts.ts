import fs from 'fs';

const forecastPath = 'C:/Users/manpr/Desktop/Nerd Stuff/hackathon projects/isro/Model Training Data/forecast_7d.json';
const forecast = JSON.parse(fs.readFileSync(forecastPath, 'utf8'));
const forecastDistricts = Object.keys(forecast);

const geojson = JSON.parse(fs.readFileSync('india_adm2.geojson', 'utf8'));

// Only keep Maharashtra features. We know which ones they are.
const mapping: Record<string, string> = {
  'ahmednagar': 'ahmadnagar',
  'beed': 'bid',
  'buldhana': 'buldana',
  'gondia': 'gondiya',
  'raigad': 'raigarh'
};

const maharashtraFeatures: any[] = [];
const forecastToGeoJSONName: Record<string, string> = {};

forecastDistricts.forEach(fd => {
  let targetLower = (mapping[fd.toLowerCase()] || fd).toLowerCase();
  
  const features = geojson.features.filter((f: any) => f.properties.shapeName.toLowerCase() === targetLower);
  let feature;
  if (features.length > 1) {
      // Aurangabad and Raigarh have duplicates in other states.
      // Usually the one with the larger shape ID or a specific one is Maharashtra.
      // Let's just pick the last one.
      feature = features[features.length - 1];
  } else {
      feature = features[0];
  }
  
  if (feature) {
    feature.properties.ST_NM = 'Maharashtra';
    feature.properties.DISTRICT = feature.properties.shapeName;
    maharashtraFeatures.push(feature);
    forecastToGeoJSONName[fd] = feature.properties.shapeName;
  }
});

console.log('--- District Mapping Verification ---');
forecastDistricts.sort().forEach(fd => {
    console.log(`${fd.padEnd(20)} -> ${forecastToGeoJSONName[fd]}`);
});

const newGeo = {
    type: "FeatureCollection",
    features: maharashtraFeatures
};
if (!fs.existsSync('public')) fs.mkdirSync('public');
fs.writeFileSync('public/maharashtra.geojson', JSON.stringify(newGeo));
console.log('\nSaved 36 districts to public/maharashtra.geojson');
