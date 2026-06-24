(async ()=>{
  const ytsr = require('ytsr');
  const { rankTracks } = require('../src/lib/musicRanking');
  const r = await ytsr('beatles', { limit: 20 });
  const mapped = (r.items||[]).filter(it=>it.type==='video').map(video=>({
    id: video.id||'',
    title: video.title||'Unknown',
    artist: (video.author&&video.author.name)||'Unknown',
    thumbnail: (video.thumbnails && video.thumbnails[0] && video.thumbnails[0].url) || `https://img.youtube.com/vi/${video.id}/0.jpg`,
    duration: (function parseDur(d){ if(!d) return 0; if(typeof d==='number') return d; if(typeof d==='string'){ const parts=d.split(':').map(Number).reverse(); let s=0; for(let i=0;i<parts.length;i++){ s += (parts[i]||0)*Math.pow(60,i); } return s;} return 0;})(video.duration),
    url: video.url||`https://www.youtube.com/watch?v=${video.id}`
  }));
  console.log('mapped count',mapped.length);
  const ranked = rankTracks('beatles', mapped, {limit:20, minDuration:60, maxDuration:720, preferOriginals:true});
  console.log('ranked count',ranked.length);
  console.log(ranked.slice(0,5));
})();
