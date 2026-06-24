(async ()=>{
  const axios = require('axios');
  const piped=['https://piped.video','https://piped.kavin.rocks'];
  const q='beatles';
  for(const p of piped){
    const start=Date.now();
    try{
      const url = `${p}/api/v1/search?q=${encodeURIComponent(q)}&type=video`;
      const {data,status} = await axios.get(url,{ timeout: 5000 });
      console.log(p,'OK',status,'ms',Date.now()-start,'items', Array.isArray(data)?data.length: (data?.items?.length||0));
    }catch(e){
      console.log(p,'ERR',Date.now()-start,String(e.message).slice(0,200));
    }
  }
})();
