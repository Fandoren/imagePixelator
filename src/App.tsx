import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function colorDistance(c1: [number, number, number], c2: [number, number, number]) {
  return Math.sqrt(
    Math.pow(c1[0] - c2[0], 2) +
    Math.pow(c1[1] - c2[1], 2) +
    Math.pow(c1[2] - c2[2], 2)
  );
}

const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const sat = (r: number, g: number, b: number) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
};
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  let r = 0, g = 0, b = 0;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

function computeBlockColor(
  oImage: ImageData,
  bounds: { oW: number; oH: number; x0: number; x1: number; y0: number; y1: number },
  method: 'nearest' | 'average' | 'mode' | 'salient',
  opts: { lumThresh: number; satThresh: number }
) {
  const { oW, oH, x0, x1, y0, y1 } = bounds;
  const { lumThresh, satThresh } = opts;
  let rSum = 0, gSum = 0, bSum = 0, cnt = 0;
  const hist = new Map<string, number>();
  let bestModeKey = "";
  let bestModeCount = 0;
  let bestSalient: { r: number; g: number; b: number; L: number; S: number } | null = null;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * oW + x) * 4;
      const r = oImage.data[idx];
      const g = oImage.data[idx + 1];
      const b = oImage.data[idx + 2];
      const a = oImage.data[idx + 3];
      if (a === 0) continue;
      rSum += r; gSum += g; bSum += b; cnt++;
      const key = `${r},${g},${b}`;
      const c = (hist.get(key) || 0) + 1;
      hist.set(key, c);
      if (c > bestModeCount) {
        bestModeCount = c; bestModeKey = key;
      }
      const L = lum(r, g, b);
      const S = sat(r, g, b);
      if ((L > lumThresh || S > satThresh)) {
        if (!bestSalient || L > bestSalient.L || S > bestSalient.S) {
          bestSalient = { r, g, b, L, S };
        }
      }
    }
  }

  let outR = 255, outG = 255, outB = 255;
  if (method === 'nearest') {
    const cx = Math.min(oW - 1, Math.trunc((x0 + x1) / 2));
    const cy = Math.min(oH - 1, Math.trunc((y0 + y1) / 2));
    const idx = (cy * oW + cx) * 4;
    outR = oImage.data[idx]; outG = oImage.data[idx + 1]; outB = oImage.data[idx + 2];
  } else if (method === 'average') {
    if (cnt > 0) {
      outR = Math.round(rSum / cnt); outG = Math.round(gSum / cnt); outB = Math.round(bSum / cnt);
    }
  } else if (method === 'mode') {
    if (bestModeKey) {
      const parts = bestModeKey.split(',').map(Number);
      outR = parts[0]; outG = parts[1]; outB = parts[2];
    } else if (cnt > 0) {
      outR = Math.round(rSum / cnt); outG = Math.round(gSum / cnt); outB = Math.round(bSum / cnt);
    }
  } else if (method === 'salient') {
    if (bestSalient) {
      outR = bestSalient.r; outG = bestSalient.g; outB = bestSalient.b;
    } else if (bestModeKey) {
      const parts = bestModeKey.split(',').map(Number);
      outR = parts[0]; outG = parts[1]; outB = parts[2];
    } else if (cnt > 0) {
      outR = Math.round(rSum / cnt); outG = Math.round(gSum / cnt); outB = Math.round(bSum / cnt);
    }
  }

  return [outR, outG, outB] as [number, number, number];
}

export default function App() {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageSrc, setImageSrc] = useState<HTMLImageElement | null>(null);
  const [pixelWidth, setPixelWidth] = useState<number | undefined>(32);
  const [pixelHeight, setPixelHeight] = useState<number | undefined>(32);
  const [colorsCount, setColorsCount] = useState<number | undefined>(16);

  // Pixelation method and saliency controls
  const [pixelationMethod, setPixelationMethod] = useState<'nearest' | 'average' | 'mode' | 'salient'>('mode');
  const [luminanceThreshold, setLuminanceThreshold] = useState<number>(200);
  const [saturationThreshold, setSaturationThreshold] = useState<number>(0.6);
  const [applyPaletteReduction, setApplyPaletteReduction] = useState<boolean>(true);
  const [preferVibrant, setPreferVibrant] = useState<boolean>(true);
  const [preserveSalientCount, setPreserveSalientCount] = useState<number>(3);
  const [pickMode, setPickMode] = useState<boolean>(false);
  const [preservedColors, setPreservedColors] = useState<[number, number, number][]>([]);

  // Helpers for aspect / ratio preserving
  const gcd = (a: number, b: number) => {
    a = Math.abs(a);
    b = Math.abs(b);
    if (!a || !b) return 1;
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  };

  const simplifyRatio = (w: number, h: number) => {
    const g = gcd(Math.round(w), Math.round(h));
    return `${Math.round(w / g)}:${Math.round(h / g)}`;
  };



  const fitHeightToWidth = () => {
    if (!imageSrc) return;
    if (pixelWidth) {
      const newH = Math.max(1, Math.round((pixelWidth * imageSrc.height) / imageSrc.width));
      setPixelHeight(newH);
    } else if (pixelHeight) {
      // If width is empty but height exists, compute width from height instead
      const newW = Math.max(1, Math.round((pixelHeight * imageSrc.width) / imageSrc.height));
      setPixelWidth(newW);
    }
  };

  const loadImage = (file: File) => {
    const img = new Image();
    img.onload = () => {
      const canvas = originalCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setImageSrc(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const pixelate = () => {
    if (!imageSrc) return;
    const originalCanvas = originalCanvasRef.current;
    const pixelCanvas = pixelCanvasRef.current;
    if (!originalCanvas || !pixelCanvas) return;
    const octx = originalCanvas.getContext("2d");
    const pctx = pixelCanvas.getContext("2d");
    if (!octx || !pctx) return;

    const pw = pixelWidth || 32;
    const ph = pixelHeight || 32;

    // Pixelation (nearest/average/mode/salient)
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = pw;
    smallCanvas.height = ph;
    const sctx = smallCanvas.getContext("2d")!;
    sctx.imageSmoothingEnabled = false; // Ключевой момент для crisp пикселей

    // Read source pixels
    const oW = originalCanvas.width;
    const oH = originalCanvas.height;
    // used for color picking
    const oImage = octx.getImageData(0, 0, oW, oH);
    const smallImage = sctx.createImageData(pw, ph);

    for (let by = 0; by < ph; by++) {
      for (let bx = 0; bx < pw; bx++) {
        const x0 = Math.floor((bx * oW) / pw);
        const x1 = Math.min(oW, Math.floor(((bx + 1) * oW) / pw));
        const y0 = Math.floor((by * oH) / ph);
        const y1 = Math.min(oH, Math.floor(((by + 1) * oH) / ph));
        const [outR, outG, outB] = computeBlockColor(oImage, { oW, oH, x0, x1, y0, y1 }, pixelationMethod, { lumThresh: luminanceThreshold, satThresh: saturationThreshold });
        const si = (by * pw + bx) * 4;
        smallImage.data[si] = outR;
        smallImage.data[si + 1] = outG;
        smallImage.data[si + 2] = outB;
        smallImage.data[si + 3] = 255;
      }
    }

    sctx.putImageData(smallImage, 0, 0);

    // Optional palette reduction
    if (applyPaletteReduction)
      reduceColors(smallCanvas, colorsCount || 16, {
        preferVibrant,
        preserveSalientCount,
        luminanceThreshold,
        saturationThreshold,
        forcedColors: preservedColors,
      });

    // Upscale to original size
    pixelCanvas.width = originalCanvas.width;
    pixelCanvas.height = originalCanvas.height;
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(smallCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height);
  };

  // Улучшенный median cut (оригинальный, но с фиксом для прозрачности и пустых боксов)
  function createPalette(
    imageData: ImageData,
    numColors: number,
    options?: {
      preferVibrant?: boolean;
      preserveSalientCount?: number;
      luminanceThreshold?: number;
      saturationThreshold?: number;
      forcedColors?: [number, number, number][];
    }
  ): [number, number, number][] {
    if (numColors <= 0) return [[0, 0, 0]];

    // options
    const preferVibrant = options?.preferVibrant ?? false;
    const preserveCount = Math.max(0, options?.preserveSalientCount ?? 0);
    const lumThresh = options?.luminanceThreshold ?? 200;
    const satThresh = options?.saturationThreshold ?? 0.6;

    // build color histogram
    const data = imageData.data;
    const totalPixels = Math.floor(data.length / 4);
    const colorCount = new Map<string, { r: number; g: number; b: number; count: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue; // Пропускаем прозрачные
      const k = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      const cur = colorCount.get(k);
      if (cur) cur.count++;
      else colorCount.set(k, { r: data[i], g: data[i + 1], b: data[i + 2], count: 1 });
    }

    if (colorCount.size === 0) return [[255, 255, 255]]; // all transparent

    // Если уникальных цветов не больше запрошенного, используем их напрямую
    if (colorCount.size <= numColors) {
      return Array.from(colorCount.values()).map((v) => [v.r, v.g, v.b] as [number, number, number]);
    }

    // sample for median cut (frequency-weighted)
    const pixels: [number, number, number][] = [];
    const MAX_REP = 40; // максимальное повторение уникального цвета в выборке
    for (const v of colorCount.values()) {
      const reps = Math.min(MAX_REP, Math.max(1, Math.round((v.count / totalPixels) * MAX_REP)));
      for (let j = 0; j < reps; j++) pixels.push([v.r, v.g, v.b]);
    }

    // Median cut
    let boxes: [number, number, number][][] = [pixels];

    while (boxes.length < numColors) {
      let maxRange = -1;
      let boxIndex = -1;

      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (box.length <= 1) continue;

        let rMin = 255,
          rMax = 0,
          gMin = 255,
          gMax = 0,
          bMin = 255,
          bMax = 0;
        for (const p of box) {
          rMin = Math.min(rMin, p[0]);
          rMax = Math.max(rMax, p[0]);
          gMin = Math.min(gMin, p[1]);
          gMax = Math.max(gMax, p[1]);
          bMin = Math.min(bMin, p[2]);
          bMax = Math.max(bMax, p[2]);
        }

        const range = Math.max(rMax - rMin, gMax - gMin, bMax - bMin);
        if (range > maxRange) {
          maxRange = range;
          boxIndex = i;
        }
      }

      if (boxIndex === -1) break; // Нет больше для разделения

      const boxToSplit = boxes[boxIndex];
      // Choose channel with largest range (r, g, b)
      let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
      for (const p of boxToSplit) {
        rMin = Math.min(rMin, p[0]); rMax = Math.max(rMax, p[0]);
        gMin = Math.min(gMin, p[1]); gMax = Math.max(gMax, p[1]);
        bMin = Math.min(bMin, p[2]); bMax = Math.max(bMax, p[2]);
      }
      const ranges = [rMax - rMin, gMax - gMin, bMax - bMin];
      let channel = ranges.indexOf(Math.max(...ranges));

      boxToSplit.sort((a, b) => a[channel] - b[channel]);
      const median = Math.floor(boxToSplit.length / 2);
      const left = boxToSplit.slice(0, median);
      const right = boxToSplit.slice(median);

      if (left.length === 0 || right.length === 0) break;

      boxes.splice(boxIndex, 1, left, right);
    }

    // compute averages
    const palette: [number, number, number][] = [];
    for (const box of boxes) {
      if (box.length === 0) continue;
      let r = 0,
        g = 0,
        b = 0;
      for (const p of box) {
        r += p[0];
        g += p[1];
        b += p[2];
      }
      palette.push([
        Math.round(r / box.length),
        Math.round(g / box.length),
        Math.round(b / box.length),
      ]);
    }

    // Preserve rare bright/saturated colors


    const rareThreshold = Math.max(1, Math.floor(totalPixels * 0.05)); // редкие: <5% пикселей
    const candidates: { r: number; g: number; b: number; count: number }[] = [];
    for (const v of colorCount.values()) {
      const L = lum(v.r, v.g, v.b);
      const S = sat(v.r, v.g, v.b);
      // Кандидат: яркий или насыщенный и при этом редкий (порог из опций)
      if ((L > lumThresh || S > satThresh) && v.count <= rareThreshold) candidates.push(v);
    }

    // sort candidates by luminance and count
    candidates.sort((a, b) => (lum(b.r, b.g, b.b) + Math.log(1 + b.count)) - (lum(a.r, a.g, a.b) + Math.log(1 + a.count)));

    if (candidates.length === 0) return palette.slice(0, numColors);

    // build preserve list (forced + top-N candidates)
    const forced = options?.forcedColors ?? [];
    const fromCandidates = preferVibrant ? candidates.slice(0, Math.min(preserveCount, candidates.length)) : [];
    const preserveMap = new Map<string, { r: number; g: number; b: number; count: number }>();
    for (const f of forced) preserveMap.set(`${f[0]},${f[1]},${f[2]}`, { r: f[0], g: f[1], b: f[2], count: 1 });
    for (const c of fromCandidates) preserveMap.set(`${c.r},${c.g},${c.b}`, c);
    const preserve = Array.from(preserveMap.values());

    // score palette slots by assigned pixels
    const assigned = new Array(palette.length).fill(0);
    for (const v of colorCount.values()) {
      let minI = 0;
      let minD = colorDistance([v.r, v.g, v.b], palette[0]);
      for (let i = 1; i < palette.length; i++) {
        const d = colorDistance([v.r, v.g, v.b], palette[i]);
        if (d < minD) {
          minD = d;
          minI = i;
        }
      }
      assigned[minI] += v.count;
    }

    // insert forced/preserved colors and protect slots
    for (const p of preserve) {
      let already = false;
      for (const entry of palette) {
        if (colorDistance([p.r, p.g, p.b], entry) <= 24) {
          already = true;
          break;
        }
      }
      if (already) continue;
      let minScore = Infinity;
      let minIdx = 0;
      for (let i = 0; i < palette.length; i++) {
        const [pr, pg, pb] = palette[i];
        const score = assigned[i] - (lum(pr, pg, pb) < 80 ? 1000 : 0) - (sat(pr, pg, pb) < 0.15 ? 500 : 0);
        if (score < minScore) {
          minScore = score;
          minIdx = i;
        }
      }
      palette[minIdx] = [p.r, p.g, p.b];
      assigned[minIdx] = 1e9; // сильно защищаем этот слот, чтобы он не заменялся далее
    }

    const REPRESENT_DIST = 24; // consider close colors represented
    for (const c of candidates) {
      // уже представлен?
      let closestDist = Infinity;
      for (const entry of palette) {
        const d = colorDistance([c.r, c.g, c.b], entry);
        if (d < closestDist) closestDist = d;
      }
      if (closestDist <= REPRESENT_DIST) continue;

      // replace least important slot
      let minAssigned = Infinity;
      let minIdx = 0;
      for (let i = 0; i < assigned.length; i++) {
        if (assigned[i] < minAssigned) {
          minAssigned = assigned[i];
          minIdx = i;
        }
      }
      palette[minIdx] = [c.r, c.g, c.b];
      assigned[minIdx] = c.count; // грубая оценка новой важности
    }

    // boost palette saturation if preferVibrant
    if (preferVibrant) {
      for (let i = 0; i < palette.length; i++) {
        const [r, g, b] = palette[i];
        let [h, s, l] = rgbToHsl(r, g, b);
        s = Math.min(1, s * 1.25);
        palette[i] = hslToRgb(h, s, l);
      }
    }

    return palette.slice(0, numColors);
  }

  function reduceColors(canvas: HTMLCanvasElement, numColors: number, options?: { preferVibrant?: boolean; preserveSalientCount?: number; luminanceThreshold?: number; saturationThreshold?: number; forcedColors?: [number, number, number][] }) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = createPalette(imgData, numColors, options);
    if (palette.length === 0) return;

    const data = imgData.data;
    const forced = options?.forcedColors ?? [];
    const FORCED_MAP_DIST = 48; // if pixel close enough to a forced/picked color, map to it directly
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const current = [data[i], data[i + 1], data[i + 2]] as [number, number, number];

      // 1) if close to a forced/picked color, map directly to it (keeps picked colors sharp)
      let forcedClosest: [number, number, number] | null = null;
      let forcedDist = Infinity;
      for (const f of forced) {
        const d = colorDistance(current, f);
        if (d < forcedDist) {
          forcedDist = d;
          forcedClosest = f;
        }
      }
      if (forcedClosest && forcedDist <= FORCED_MAP_DIST) {
        data[i] = forcedClosest[0];
        data[i + 1] = forcedClosest[1];
        data[i + 2] = forcedClosest[2];
        continue;
      }

      // 2) otherwise, map to nearest palette color, but optionally bias towards vibrant palette entries
      let closest = palette[0];
      let minDist = colorDistance(current, closest);
      const isPixelVibrant = (lum(current[0], current[1], current[2]) > (options?.luminanceThreshold ?? 200)) || (sat(current[0], current[1], current[2]) > (options?.saturationThreshold ?? 0.6));
      for (const c of palette.slice(1)) {
        let dist = colorDistance(current, c);
        if (options?.preferVibrant && isPixelVibrant) {
          // if palette color itself is vibrant, reduce effective distance to it slightly so it's preferred
          const pcLum = lum(c[0], c[1], c[2]);
          const pcSat = sat(c[0], c[1], c[2]);
          if (pcLum > (options?.luminanceThreshold ?? 200) || pcSat > (options?.saturationThreshold ?? 0.6)) {
            dist *= 0.75; // bias towards vibrant palette colors for vibrant pixels
          }
        }
        if (dist < minDist) {
          minDist = dist;
          closest = c;
        }
      }
      data[i] = closest[0];
      data[i + 1] = closest[1];
      data[i + 2] = closest[2];
    }
    ctx.putImageData(imgData, 0, 0);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pixelate();
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [imageSrc, pixelWidth, pixelHeight, colorsCount, pixelationMethod, luminanceThreshold, saturationThreshold, applyPaletteReduction]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">Image Pixelator</h1>
      <div className="flex flex-col items-center gap-6 w-full max-w-6xl">
        {/* Загрузка и кнопка */}
        <div className="flex flex-col md:flex-row items-center gap-4 w-full">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadImage(file);
            }}
            className="flex-1 cursor-pointer"
          />
          <div className="flex items-center gap-2">
            <Button onClick={() => setPickMode((s) => !s)} className={pickMode ? 'bg-blue-600 text-white h-9' : 'h-9'}>
              {pickMode ? 'Picking...' : 'Pick color'}
            </Button>
            <div className="flex items-center gap-2">
              {preservedColors.map((c) => {
                const key = `${c[0]},${c[1]},${c[2]}`;
                return (
                  <div key={key} className="flex items-center gap-1">
                    <div style={{ width: 20, height: 20, background: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, border: '1px solid #ddd' }} />
                    <button className="text-sm text-red-500" onClick={() => setPreservedColors(pc => pc.filter(p => `${p[0]},${p[1]},${p[2]}` !== key))}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            onClick={() => {
              pixelate();
            }}
            className="cursor-pointer"
          >
            Pixelate
          </Button>
        </div>
        {/* Настройки размеров */}
        <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center">
          <div className="flex flex-col gap-1">
            <Label>Width (px)</Label>
            <Input
              type="number"
              value={pixelWidth ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setPixelWidth(val === "" ? undefined : Number.parseInt(val));
              }}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Height (px)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={pixelHeight ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setPixelHeight(val === "" ? undefined : Number.parseInt(val));
                }}
                className="w-28"
              />
              <Button
                onClick={fitHeightToWidth}
                disabled={!imageSrc || (!pixelWidth && !pixelHeight)}
                className="h-9"
              >
                Match
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Количество цветов</Label>
            <Input
              type="number"
              value={colorsCount ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setColorsCount(val === "" ? undefined : Number.parseInt(val));
              }}
              className="w-28"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Method</Label>
            <select
              value={pixelationMethod}
              onChange={(e) => setPixelationMethod(e.target.value as any)}
              className="w-36 h-9 border rounded px-2"
            >
              <option value="nearest">Nearest</option>
              <option value="average">Average</option>
              <option value="mode">Mode</option>
              <option value="salient">Salient</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Palette reduction</Label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={applyPaletteReduction}
                onChange={(e) => setApplyPaletteReduction(e.target.checked)}
              />
              <span className="text-sm">Apply</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={preferVibrant} onChange={(e)=>setPreferVibrant(e.target.checked)} />
                <span className="text-sm">Prefer vibrant colors</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm">Preserve</span>
                <Input type="number" value={preserveSalientCount} onChange={(e)=>{ const v = e.target.value; setPreserveSalientCount(v === '' ? 0 : Number.parseInt(v)); }} className="w-20" />
                <span className="text-sm">colors</span>
              </label>
            </div>
          </div>
        </div>
        {/* Saliency controls */}
        {pixelationMethod === 'salient' && (
          <div className="flex gap-4 items-center w-full justify-center mt-2">
            <div className="flex flex-col gap-1">
              <Label>Luminance threshold</Label>
              <Input
                type="number"
                value={luminanceThreshold}
                onChange={(e) => { const v = e.target.value; setLuminanceThreshold(v === '' ? 0 : Number(v)); }}
                className="w-28"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Saturation threshold</Label>
              <Input
                type="number"
                value={saturationThreshold}
                step="0.01"
                onChange={(e) => { const v = e.target.value; setSaturationThreshold(v === '' ? 0 : Number(v)); }}
                className="w-28"
              />
            </div>
          </div>
        )}
        {imageSrc && (
          <div className="text-sm text-muted-foreground mt-2">
            Aspect: {imageSrc.width}×{imageSrc.height} — {simplifyRatio(imageSrc.width, imageSrc.height)} ({(imageSrc.width / imageSrc.height).toFixed(2)}:1)
          </div>
        )}
        {/* Canvas */}
        <div className="flex flex-col md:flex-row gap-12 mt-6 items-start justify-center w-full">
          {/* Original */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">Original</h3>
            {/* Original */}
            <canvas
              ref={originalCanvasRef}
              className="border border-gray-300 cursor-crosshair"
              onClick={(e) => {
                if (!pickMode) return;
                const canvas = originalCanvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const x = Math.floor((e.clientX - rect.left) * scaleX);
                const y = Math.floor((e.clientY - rect.top) * scaleY);
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                const d = ctx.getImageData(Math.min(canvas.width-1, Math.max(0,x)), Math.min(canvas.height-1, Math.max(0,y)), 1, 1).data;
                if (d[3] === 0) return; // transparent
                const color: [number, number, number] = [d[0], d[1], d[2]];
                setPreservedColors((pc) => {
                  const exists = pc.some((c) => c[0] === color[0] && c[1] === color[1] && c[2] === color[2]);
                  if (exists) return pc;
                  return [...pc, color];
                });
                // остаёмся в режиме выбора — пользователь может выбрать несколько точек; для выхода нужно нажать кнопку Pick color снова
              }}
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "1100px",
                imageRendering: "pixelated",
              }}
            />
          </div>
          {/* Pixelated */}
          <div className="relative flex flex-col items-center pl-12">
            <h3 className="text-lg font-semibold mb-2">Pixelated</h3>
            {/* Height label */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 rotate-[-90deg] text-sm">
              Height: {pixelHeight}px
            </div>
            <canvas
              ref={pixelCanvasRef}
              className="border border-gray-300"
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "1100px",
                imageRendering: "pixelated",
              }}
            />
            {/* Width label */}
            <div className="text-center text-sm mt-1">
              Width: {pixelWidth}px
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
