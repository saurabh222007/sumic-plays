(async ()=>{
  const axios = require('axios');
  const { data } = await axios.get('https://piped.video/api/v1/search?q=beatles&type=video', { timeout: 5000 });
  if (Array.isArray(data)) {
    console.log('count', data.length);
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('not array', Object.keys(data || {}).length);
    console.log(JSON.stringify(data, null, 2));
  }
})();
