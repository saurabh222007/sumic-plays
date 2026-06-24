(async ()=>{
  const piped = ['https://piped.video','https://piped.kavin.rocks'];
  const invid = ['https://vid.puffyan.us','https://invidious.fdn.fr','https://invidious.privacyredirect.com','https://inv.nadeko.net'];
  const q = 'beatles';
  const tests = [];

  async function doTest(base) {
    const start = Date.now();
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video`;
      const res = await fetch(url, { timeout: 5000 });
      const text = await res.text();
      return { url, status: res.status, ok: res.ok, ms: Date.now() - start, length: text.length };
    } catch (e) {
      return { url: `${base}/api/v1/search`, status: 0, ok: false, ms: Date.now() - start, error: String(e).slice(0,200) };
    }
  }

  for (const p of [...new Set(piped)]) {
    tests.push({ provider: 'piped', instance: p, results: await doTest(p) });
  }
  for (const i of [...new Set(invid)]) {
    tests.push({ provider: 'invidious', instance: i, results: await doTest(i) });
  }

  console.log(JSON.stringify(tests, null, 2));
})();
