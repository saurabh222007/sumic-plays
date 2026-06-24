(async ()=>{
  const axios = require('axios');
  const instances = ['https://piped.video','https://piped.kavin.rocks'];
  const q = 'beatles';
  for (const i of instances) {
    try {
      const start = Date.now();
      const url = `${i}/api/v1/search?q=${encodeURIComponent(q)}&type=video`;
      const { data, status } = await axios.get(url, { timeout: 5000, headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      console.log(i, 'OK', status, 'ms', Date.now() - start, 'jsonType', Array.isArray(data) ? 'array' : typeof data, 'len', JSON.stringify(data).length);
    } catch (e) {
      console.log(i, 'ERR', String(e.message).slice(0,200));
    }
  }
})();
