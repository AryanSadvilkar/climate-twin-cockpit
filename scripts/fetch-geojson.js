import fs from 'fs';
import path from 'path';

const INDIA_STATES_URL = 'https://raw.githubusercontent.com/india-in-data/india-states-2019/master/india_states.geojson';
const MAHARASHTRA_DISTRICTS_URL = 'https://raw.githubusercontent.com/shuklaneerajdev/IndiaStateTopojsonFiles/master/Maharashtra.geojson';

const dataDir = path.join(process.cwd(), 'public', 'data');

// Create directory if it doesn't exist
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function downloadFile(url, destName) {
  const destPath = path.join(dataDir, destName);
  console.log(`Fetching ${url}...`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Optional: simplify or validate structure
    fs.writeFileSync(destPath, JSON.stringify(data, null, 2));
    console.log(`Successfully saved to ${destPath} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB)`);
  } catch (error) {
    console.error(`Error downloading ${destName}:`, error.message);
  }
}

async function main() {
  await downloadFile(INDIA_STATES_URL, 'india_states.geojson');
  await downloadFile(MAHARASHTRA_DISTRICTS_URL, 'maharashtra_districts.geojson');
  console.log('GeoJSON download process complete.');
}

main();
