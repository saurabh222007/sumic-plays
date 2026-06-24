(async ()=>{
  const ytsr = require('ytsr');
  const r = await ytsr('beatles', { limit: 5 });
  console.log('items', r.items.length);
  console.log(JSON.stringify(r.items.slice(0,3), null, 2));
})();
