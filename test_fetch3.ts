import https from 'https';

const urls = [
  'https://raw.githubusercontent.com/udit-001/india-maps-data/main/state/maharashtra.geojson',
  'https://raw.githubusercontent.com/udit-001/india-maps-data/master/state/maharashtra.geojson',
  'https://raw.githubusercontent.com/datta07/INDIAN-SHAPEFILES/main/INDIA/MAHARASHTRA/MAHARASHTRA_DISTRICTS.geojson',
  'https://raw.githubusercontent.com/guneetnarula/indian-district-boundaries/main/maharashtra.geojson',
  'https://raw.githubusercontent.com/HindustanTimesLabs/shapefiles/main/state_ut/maharashtra/district.geojson',
  'https://raw.githubusercontent.com/HindustanTimesLabs/shapefiles/master/state_ut/maharashtra/district.geojson'
];

urls.forEach(url => {
  https.get(url, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.log(`Failed to fetch from ${url}, status: ${res.statusCode}`);
        return;
      }
      try {
        const geojson = JSON.parse(body);
        let features = geojson.features;
        let districts = features.map((f: any) => f.properties.district || f.properties.DISTRICT || f.properties.dtname || f.properties.NAME_2 || f.properties.NAME || f.properties.name);
        districts = districts.filter(Boolean);
        
        console.log(`\nURL: ${url}`);
        console.log(`Found ${districts.length} districts.`);
        console.log('Includes Palghar?', districts.some((d: string) => d.toLowerCase() === 'palghar'));
        console.log('Includes Mumbai Suburban?', districts.some((d: string) => d.toLowerCase() === 'mumbai suburban' || d.toLowerCase() === 'mumbai (suburban)'));
        console.log(districts.sort());
      } catch (e) {
        console.log(`Error parsing JSON from ${url}`);
      }
    });
  }).on('error', (e) => {
    console.error(`Network error for ${url}:`, e.message);
  });
});
