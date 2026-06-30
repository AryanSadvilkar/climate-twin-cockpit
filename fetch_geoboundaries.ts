import fs from 'fs';

async function run() {
  try {
    const res = await fetch('https://www.geoboundaries.org/api/current/gbOpen/IND/ADM2/');
    const data = await res.json();
    const geojsonUrl = data.gjDownloadURL;
    console.log('GeoJSON URL:', geojsonUrl);
    
    const res2 = await fetch(geojsonUrl);
    const body2 = await res2.text();
    fs.writeFileSync('india_adm2.geojson', body2);
    console.log('Downloaded india_adm2.geojson');
    
    const geojson = JSON.parse(body2);
    console.log(geojson.features.slice(0, 5).map((f:any) => f.properties));
    
    const palghar = geojson.features.find((f:any) => f.properties.shapeName.toLowerCase() === 'palghar');
    console.log('Palghar found:', !!palghar);
    
  } catch (e) {
    console.log('Error', e);
  }
}

run();
