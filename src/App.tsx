import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function App() {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageSrc, setImageSrc] = useState<HTMLImageElement | null>(null);
  const [pixelWidth, setPixelWidth] = useState<number | undefined>(32);
  const [pixelHeight, setPixelHeight] = useState<number | undefined>(32);
  const [colorsCount, setColorsCount] = useState<number | undefined>(16);

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

    // 1. Пикселизация: простой ресайз с nearest-neighbor (imageSmoothingEnabled = false)
    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = pw;
    smallCanvas.height = ph;
    const sctx = smallCanvas.getContext("2d")!;
    sctx.imageSmoothingEnabled = false; // Ключевой момент для crisp пикселей
    sctx.drawImage(originalCanvas, 0, 0, pw, ph);

    // 2. Уменьшение цветов: возвращаемся к улучшенному median cut (как в оригинале, но с фиксами)
    reduceColors(smallCanvas, colorsCount || 16);

    // 3. Масштабируем обратно с nearest-neighbor
    pixelCanvas.width = originalCanvas.width;
    pixelCanvas.height = originalCanvas.height;
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(smallCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height);
  };

  // Евклидово расстояние
  function colorDistance(
    c1: [number, number, number],
    c2: [number, number, number]
  ) {
    return Math.sqrt(
      Math.pow(c1[0] - c2[0], 2) +
        Math.pow(c1[1] - c2[1], 2) +
        Math.pow(c1[2] - c2[2], 2)
    );
  }

  // Улучшенный median cut (оригинальный, но с фиксом для прозрачности и пустых боксов)
  function createPalette(
    imageData: ImageData,
    numColors: number
  ): [number, number, number][] {
    if (numColors <= 0) return [[0, 0, 0]];

    const pixels: [number, number, number][] = [];
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue; // Пропускаем прозрачные
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    if (pixels.length === 0) return [[255, 255, 255]]; // Если всё прозрачно

    if (pixels.length <= numColors) {
      // Уникальные цвета
      const unique = new Map<string, [number, number, number]>();
      for (const p of pixels) {
        const key = p.join(",");
        if (!unique.has(key)) unique.set(key, p);
      }
      return Array.from(unique.values());
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
      let channel = 0;
      let chMin = 255,
        chMax = 0;
      for (const p of boxToSplit) {
        const val = p[channel];
        chMin = Math.min(chMin, val);
        chMax = Math.max(chMax, val);
      }
      if (
        channel === 0 ||
        chMax - chMin <
          Math.max(
            (() => {
              let m = 255,
                M = 0;
              for (const p of boxToSplit) {
                m = Math.min(m, p[1]);
                M = Math.max(M, p[1]);
              }
              return M - m;
            })(),
            (() => {
              let m = 255,
                M = 0;
              for (const p of boxToSplit) {
                m = Math.min(m, p[2]);
                M = Math.max(M, p[2]);
              }
              return M - m;
            })()
          )
      ) {
        channel =
          chMax - chMin <
          Math.max(
            (() => {
              let m = 255,
                M = 0;
              for (const p of boxToSplit) {
                m = Math.min(m, p[0]);
                M = Math.max(M, p[0]);
              }
              return M - m;
            })(),
            (() => {
              let m = 255,
                M = 0;
              for (const p of boxToSplit) {
                m = Math.min(m, p[2]);
                M = Math.max(M, p[2]);
              }
              return M - m;
            })()
          )
            ? 1
            : 2;
      }

      boxToSplit.sort((a, b) => a[channel] - b[channel]);
      const median = Math.floor(boxToSplit.length / 2);
      const left = boxToSplit.slice(0, median);
      const right = boxToSplit.slice(median);

      if (left.length === 0 || right.length === 0) break;

      boxes.splice(boxIndex, 1, left, right);
    }

    // Средние цвета
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

    return palette;
  }

  function reduceColors(canvas: HTMLCanvasElement, numColors: number) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = createPalette(imgData, numColors);
    if (palette.length === 0) return;

    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const current = [data[i], data[i + 1], data[i + 2]] as [
        number,
        number,
        number
      ];
      let closest = palette[0];
      let minDist = colorDistance(current, closest);
      for (const c of palette.slice(1)) {
        const dist = colorDistance(current, c);
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
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [imageSrc, pixelWidth, pixelHeight, colorsCount]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-8">Image Pixelator</h1>
      <div className="flex flex-col items-center gap-6 w-full max-w-3xl">
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
                setPixelWidth(val === "" ? undefined : parseInt(val));
              }}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Height (px)</Label>
            <Input
              type="number"
              value={pixelHeight ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setPixelHeight(val === "" ? undefined : parseInt(val));
              }}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label>Количество цветов</Label>
            <Input
              type="number"
              value={colorsCount ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setColorsCount(val === "" ? undefined : parseInt(val));
              }}
              className="w-28"
            />
          </div>
        </div>
        {/* Canvas */}
        <div className="flex flex-col md:flex-row gap-12 mt-6 items-start justify-center w-full">
          {/* Original */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">Original</h3>
            {/* Original */}
            <canvas
              ref={originalCanvasRef}
              className="border border-gray-300"
              style={{
                width: "100%",
                height: "auto",
                maxWidth: "700px",
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
                maxWidth: "700px",
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
