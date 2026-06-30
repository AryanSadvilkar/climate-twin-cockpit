import https from 'https';

const urls = [
  'https://raw.githubusercontent.com/udit-001/india-maps-data/master/states/maharashtra.geojson',
  'https://raw.githubusercontent.com/guneetnarula/indian-district-boundaries/master/maharashtra.geojson',
  'https://raw.githubusercontent.com/datameet/maps/master/Districts/Census_2011/2011_Districts_State_Header.geojson',
  'https://raw.githubusercontent.com/geohacker/india/master/district/india_district.geojson'
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
        // Filter for Maharashtra if it's an India-wide file
        if (url.includes('india_district.geojson') || url.includes('2011_Districts')) {
          features = features.filter((f: any) => {
            const stName = f.properties.ST_NM || f.properties.STATE || f.properties.NAME_1 || f.properties.st_nm || '';
            return stName.toLowerCase() === 'maharashtra';
          });
        }
        
        let districts = features.map((f: any) => f.properties.DISTRICT || f.properties.dtname || f.properties.NAME_2 || f.properties.district || f.properties.NAME || f.properties.name);
        // Clean up undefined
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
