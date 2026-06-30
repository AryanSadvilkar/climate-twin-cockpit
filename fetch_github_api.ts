import https from 'https';

const options = {
  hostname: 'api.github.com',
  path: '/search/code?q=filename:maharashtra.geojson',
  headers: {
    'User-Agent': 'Node.js'
  }
};

https.get(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      data.items.slice(0, 10).forEach((item: any) => {
        console.log(`Repo: ${item.repository.full_name}, Path: ${item.path}`);
      });
    } catch (e) {
      console.log('Error parsing', body);
    }
  });
});
