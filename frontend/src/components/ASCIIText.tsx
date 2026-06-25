import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uEnableWaves;

void main() {
  vUv = uv;
  float time = uTime * 5.0;
  float waveFactor = uEnableWaves;
  vec3 transformed = position;
  transformed.x += sin(time + position.y) * 0.5 * waveFactor;
  transformed.y += cos(time + position.z) * 0.15 * waveFactor;
  transformed.z += sin(time + position.x) * waveFactor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
  float time = uTime;
  vec2 pos = vUv;
  float r = texture2D(uTexture, pos + cos(time + pos.x) * 0.01).r;
  float g = texture2D(uTexture, pos + tan(time * 0.5 + pos.x - time) * 0.01).g;
  float b = texture2D(uTexture, pos - cos(time * 2.0 + pos.y) * 0.01).b;
  float a = texture2D(uTexture, pos).a;
  gl_FragColor = vec4(r, g, b, a);
}
`;

function mapRange(n: number, start: number, stop: number, start2: number, stop2: number) {
  return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
}

class CanvasText {
  canvas = document.createElement('canvas');
  context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
  font: string;
  private text: string;
  private options: { fontSize: number; fontFamily: string; color: string };
  private _texture: THREE.CanvasTexture | null = null;

  constructor(text: string, options: { fontSize: number; fontFamily: string; color: string }) {
    this.text = text;
    this.options = options;
    this.font = `600 ${this.options.fontSize}px ${this.options.fontFamily}`;
    // Always create square canvas so the geometry fits squarely in containers
    this.canvas.width = 512;
    this.canvas.height = 512;
  }

  get texture(): THREE.CanvasTexture | null {
    return this._texture;
  }

  setTexture(tex: THREE.CanvasTexture) {
    this._texture = tex;
  }

  resize() {
    // Fixed square canvas — no-op since we always use 512x512
  }

  render() {
    this.context.clearRect(0, 0, 512, 512);
    this.context.fillStyle = this.options.color;
    this.context.font = this.font;

    const textMetrics = this.context.measureText(this.text);
    // Scale font to fit nicely within the square (80% of canvas)
    const targetWidth = 512 * 0.8;
    let fontSize = this.options.fontSize;
    if (textMetrics.width > targetWidth) {
      fontSize = Math.floor(fontSize * (targetWidth / textMetrics.width));
      this.context.font = `600 ${fontSize}px ${this.options.fontFamily}`;
    }
    const metrics = this.context.measureText(this.text);
    const x = (512 - metrics.width) / 2;
    const y = 512 / 2 + metrics.actualBoundingBoxAscent / 2;
    this.context.fillText(this.text, x, y);

    if (this._texture) {
      this._texture.needsUpdate = true;
    }
  }
}

class AsciiTextScene {
  private camera: THREE.PerspectiveCamera;
  private scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  private texture: THREE.CanvasTexture | null = null;
  private mesh: THREE.Mesh | null = null;
  private canvasText: CanvasText | null = null;
  private frameId = 0;
  private mouse = { x: 0, y: 0 };
  private container: HTMLDivElement;
  private options: Required<ASCIITextProps>;

  constructor(container: HTMLDivElement, options: Required<ASCIITextProps>) {
    this.container = container;
    this.options = options;
    const { width, height } = container.getBoundingClientRect();
    const safeW = Math.max(width, 1);
    const safeH = Math.max(height, 1);
    this.camera = new THREE.PerspectiveCamera(45, safeW / safeH, 1, 1000);
    // Move camera closer so geometry fills the container better
    this.camera.position.z = 22;
    this.mouse = { x: safeW / 2, y: safeH / 2 };
  }

  async init() {
    try {
      await document.fonts.load('600 200px "IBM Plex Mono"');
      await document.fonts.ready;
    } catch {
      // Font loading is best-effort.
    }

    this.canvasText = new CanvasText(this.options.text, {
      fontSize: this.options.textFontSize,
      fontFamily: 'IBM Plex Mono, Courier New, monospace',
      color: this.options.textColor,
    });

    // Create texture from the square canvas
    this.texture = new THREE.CanvasTexture(this.canvasText.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.canvasText.setTexture(this.texture);
    this.canvasText.render();

    // Use square plane geometry so the mesh is always square
    // Derived from the container size — we want the geometry to fill the view
    const size = this.options.planeBaseHeight;
    this.geometry = new THREE.PlaneGeometry(size, size, 36, 36);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: this.texture },
        uEnableWaves: { value: this.options.enableWaves ? 1 : 0 },
      },
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'absolute inset-0 h-full w-full';
    this.container.appendChild(this.renderer.domElement);
    this.resize();
    this.container.addEventListener('mousemove', this.onPointerMove);
    this.container.addEventListener('touchmove', this.onPointerMove, { passive: true });
    this.animate();
  }

  resize = () => {
    if (!this.renderer) return;
    const { width, height } = this.container.getBoundingClientRect();
    const safeW = Math.max(width, 1);
    const safeH = Math.max(height, 1);
    this.camera.aspect = safeW / safeH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(safeW, safeH);
  };

  private onPointerMove = (evt: MouseEvent | TouchEvent) => {
    const point = 'touches' in evt ? evt.touches[0] : evt;
    if (!point) return;
    const bounds = this.container.getBoundingClientRect();
    this.mouse = { x: point.clientX - bounds.left, y: point.clientY - bounds.top };
  };

  private animate = () => {
    this.frameId = requestAnimationFrame(this.animate);
    if (!this.renderer || !this.material || !this.mesh || !this.canvasText || !this.texture) return;
    const { width, height } = this.container.getBoundingClientRect();
    const time = Date.now() * 0.001;
    // Re-render canvas text each frame for the chroma-aberration-style fragment effect
    // The canvas itself doesn't change each frame, so we just update the uniform
    this.material.uniforms.uTime.value = Math.sin(time);
    this.mesh.rotation.x += (
      mapRange(this.mouse.y, 0, Math.max(height, 1), 0.5, -0.5) - this.mesh.rotation.x
    ) * 0.05;
    this.mesh.rotation.y += (
      mapRange(this.mouse.x, 0, Math.max(width, 1), -0.5, 0.5) - this.mesh.rotation.y
    ) * 0.05;
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    cancelAnimationFrame(this.frameId);
    this.container.removeEventListener('mousemove', this.onPointerMove);
    this.container.removeEventListener('touchmove', this.onPointerMove);
    this.geometry?.dispose();
    this.material?.dispose();
    this.texture?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement.parentNode) this.renderer.domElement.remove();
  }
}

interface ASCIITextProps {
  text?: string;
  asciiFontSize?: number;
  textFontSize?: number;
  textColor?: string;
  planeBaseHeight?: number;
  enableWaves?: boolean;
  className?: string;
}

export default function ASCIIText({
  text = 'Sumic!',
  asciiFontSize = 8,
  textFontSize = 200,
  textColor = '#fdf2c0',
  planeBaseHeight = 8,
  enableWaves = true,
  className = '',
}: ASCIITextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AsciiTextScene | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    const scene = new AsciiTextScene(container, {
      text,
      asciiFontSize,
      textFontSize,
      textColor,
      planeBaseHeight,
      enableWaves,
      className,
    });
    sceneRef.current = scene;
    scene.init().then(() => {
      if (cancelled) scene.dispose();
    });

    const ro = new ResizeObserver(() => scene.resize());
    ro.observe(container);

    return () => {
      cancelled = true;
      ro.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, [text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves, className]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ fontSize: asciiFontSize }}
      aria-label={text}
    />
  );
}