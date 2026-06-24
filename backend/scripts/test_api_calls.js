(async function(){
  const urls = [
    {name:'beatles', url:'http://localhost:5000/api/music/search?q=beatles'},
    {name:'arijit', url:'http://localhost:5000/api/music/search?q=arijit%20singh'},
    {name:'sita', url:'http://localhost:5000/api/music/search?q=sita%20ram'},
    {name:'trending', url:'http://localhost:5000/api/music/trending'},
  ];

  for(const u of urls){
    try{
      const res = await fetch(u.url, {timeout:10000});
      const text = await res.text();
      try{
        const data = JSON.parse(text);
        if(Array.isArray(data)){
          console.log(`${u.name.toUpperCase()} finalCount=${data.length}`);
          console.log(`${u.name.toUpperCase()} sample=`, JSON.stringify(data.slice(0,3), null, 2));
        } else {
          console.log(`${u.name.toUpperCase()} error=`, JSON.stringify(data));
        }
      }catch(e){
        console.log(`${u.name.toUpperCase()} raw=`, text.slice(0,500));
      }
    }catch(e){
      console.error(`${u.name.toUpperCase()} FETCH_ERR`, e);
    }
  }
})();
