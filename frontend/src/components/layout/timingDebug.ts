export function createRafFpsMeter(enabled: boolean) {
  if (!enabled) {
    return {
      attach: () => {},
      detach: () => {},
      getSnapshot: () => ({ fps: 0, avgFrameMs: 0, maxFrameMs: 0, sampleCount: 0 }),
    };
  }

  let rafId: number | null = null;
  let last = performance.now();
  let frameCount = 0;
  let avg = 0;
  let max = 0;
  const samples: number[] = [];

  const tick = () => {
    rafId = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = now - last;
    last = now;

    frameCount++;
    samples.push(dt);
    if (samples.length > 180) samples.shift();

    if (samples.length) {
      const sum = samples.reduce((a, b) => a + b, 0);
      avg = sum / samples.length;
      max = Math.max(max, dt);
    }
  };

  const attach = () => {
    if (rafId != null) return;
    last = performance.now();
    rafId = requestAnimationFrame(tick);
  };
  const detach = () => {
    if (rafId == null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  };

  const getSnapshot = () => {
    const fps = avg > 0 ? Math.round(1000 / avg) : 0;
    return { fps, avgFrameMs: avg, maxFrameMs: max, sampleCount: samples.length };
  };

  return { attach, detach, getSnapshot };
}

export function safeSetInterval(cb: () => void, ms: number) {
  const id = window.setInterval(cb, ms);
  return () => window.clearInterval(id);
}

