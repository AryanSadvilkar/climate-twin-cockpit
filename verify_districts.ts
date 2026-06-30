import fs from 'fs';
import https from 'https';

const url = 'https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson';
const forecastPath = 'C:/Users/manpr/Desktop/Nerd Stuff/hackathon projects/isro/Model Training Data/forecast_7d.json';

https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const geojson = JSON.parse(body);
    const maharashtraFeatures = geojson.features.filter((f: any) => f.properties.NAME_1 === 'Maharashtra');
    const geoDistricts = maharashtraFeatures.map((f: any) => f.properties.NAME_2);
    
    const forecast = JSON.parse(fs.readFileSync(forecastPath, 'utf8'));
    const forecastDistricts = Object.keys(forecast);

    console.log('--- Maharashtra Districts in GeoJSON ---');
    console.log(geoDistricts.sort());
    
    console.log('\n--- Districts in Forecast JSON ---');
    console.log(forecastDistricts.sort());
    
    console.log('\n--- Mismatches ---');
    const geoLower = geoDistricts.map((d:string) => d.toLowerCase());
    const forecastLower = forecastDistricts.map((d:string) => d.toLowerCase());
    
    forecastDistricts.forEach(fd => {
      if (!geoLower.includes(fd.toLowerCase())) {
        console.log(`Forecast district missing in GeoJSON: ${fd}`);
      }
    });
    
    geoDistricts.forEach(gd => {
      if (!forecastLower.includes(gd.toLowerCase())) {
        console.log(`GeoJSON district missing in Forecast: ${gd}`);
      }
    });
  });
});
