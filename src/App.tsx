import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import RgbQuant from "rgbquant";

export default function App() {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageSrc, setImageSrc] = useState<HTMLImageElement | null>(null);
  const [pixelWidth, setPixelWidth] = useState<number | undefined>(32);
  const [pixelHeight, setPixelHeight] = useState<number | undefined>(32);
  const [colorsCount, setColorsCount] = useState<number | undefined>(16);
  const [matchAspectRatio, setMatchAspectRatio] = useState<boolean>(false);
  const [dithKern, setDithKern] = useState<string>("None");
  const [dithDelta, setDithDelta] = useState<number>(0.5);

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

      if (matchAspectRatio) {
        matchRatio(pixelWidth);
      }
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

    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = pw;
    smallCanvas.height = ph;
    const sctx = smallCanvas.getContext("2d")!;
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(originalCanvas, 0, 0, pw, ph);

    try {
      const cc = colorsCount ?? 0;
      if (cc > 0) {
        const imgData = sctx.getImageData(0, 0, pw, ph);
        const reduced = reduceColors(imgData, cc);

        if (
          reduced &&
          (reduced instanceof Uint8Array || Array.isArray(reduced))
        ) {
          const arr = reduced as any;
          // case: RGBA length matches original
          if (arr.length === imgData.data.length) {
            const put = new ImageData(new Uint8ClampedArray(arr), pw, ph);
            sctx.putImageData(put, 0, 0);
          } else if (arr.length === pw * ph * 3) {
            // RGB -> convert to RGBA
            const out = new Uint8ClampedArray(pw * ph * 4);
            for (let i = 0, j = 0; i < pw * ph; i++, j += 3) {
              const k = i * 4;
              out[k] = arr[j];
              out[k + 1] = arr[j + 1];
              out[k + 2] = arr[j + 2];
              out[k + 3] = 255;
            }
            const put = new ImageData(out, pw, ph);
            sctx.putImageData(put, 0, 0);
          } else {
            // unknown format: ignore
            console.warn(
              "reduceColors returned unexpected array length",
              arr.length
            );
          }
        }
      }
    } catch (err) {
      console.error("Color reduction failed:", err);
    }

    pixelCanvas.width = originalCanvas.width;
    pixelCanvas.height = originalCanvas.height;
    pctx.imageSmoothingEnabled = false;
    pctx.drawImage(smallCanvas, 0, 0, pixelCanvas.width, pixelCanvas.height);
  };

  const matchRatio = (newPixelWidth?: number, newPixelHeight?: number) => {
    const originalWidth = originalCanvasRef.current?.width;
    const originalHeight = originalCanvasRef.current?.height;

    if (!originalWidth || !originalHeight) return;

    const aspect = originalHeight / originalWidth;

    if (typeof newPixelWidth === "number") {
      const h = Math.max(1, Math.round(newPixelWidth * aspect));
      setPixelHeight(h);
      return;
    }

    if (typeof newPixelHeight === "number") {
      const w = Math.max(1, Math.round(newPixelHeight / aspect));
      setPixelWidth(w);
      return;
    }

    if (typeof pixelWidth === "number") {
      const h = Math.max(1, Math.round(pixelWidth * aspect));
      setPixelHeight(h);
    }
  };

  const reduceColors = (imageData: ImageData, colorCount: number) => {
    var opts = {
      colors: colorCount,
      dithKern: dithKern === "None" ? null : dithKern,
      dithDelta: dithDelta,
    };

    let q = new RgbQuant(opts);
    q.sample(imageData);
    let palettedData = q.palette(true);
    console.log(palettedData);
    let out = q.reduce(imageData);
    return out;
  };

  useEffect(() => {
    if (imageSrc) {
      pixelate();
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pixelate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [imageSrc, colorsCount, dithKern, dithDelta, pixelWidth, pixelHeight]);

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
                if (val === "") {
                  setPixelWidth(undefined);
                  return;
                }
                let newWidth = parseInt(val);
                setPixelWidth(newWidth);
                if (matchAspectRatio) {
                  matchRatio(newWidth);
                }
              }}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Label>Match height to aspect ratio</Label>
              <Checkbox
                id="matchAspectRatio"
                onCheckedChange={(checked) => {
                  setMatchAspectRatio(!!checked);
                  if (checked) {
                    matchRatio(pixelWidth);
                  }
                }}
              />
            </div>
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
              disabled={matchAspectRatio}
              className={
                matchAspectRatio
                  ? "w-28 bg-gray-200 cursor-not-allowed"
                  : "w-28"
              }
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
        {/* Dithering settings */}
        <div className="flex flex-col md:flex-row items-center gap-4 w-full justify-center mt-2">
          <div className="flex items-center gap-2">
            <Label className="mr-2">Dithering</Label>
            <Select
              defaultValue={dithKern}
              onValueChange={(v) => setDithKern(v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="FloydSteinberg">FloydSteinberg</SelectItem>
                <SelectItem value="FalseFloydSteinberg">
                  FalseFloydSteinberg
                </SelectItem>
                <SelectItem value="Stucki">Stucki</SelectItem>
                <SelectItem value="Atkinson">Atkinson</SelectItem>
                <SelectItem value="Jarvis">Jarvis</SelectItem>
                <SelectItem value="Burkes">Burkes</SelectItem>
                <SelectItem value="Sierra">Sierra</SelectItem>
                <SelectItem value="TwoSierra">TwoSierra</SelectItem>
                <SelectItem value="SierraLite">SierraLite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 w-1/3">
            <div className="flex items-center justify-between">
              <Label>Dither strength</Label>
              <div className="text-sm">{dithDelta.toFixed(2)}</div>
            </div>
            <div className="w-48">
              <Slider
                value={[dithDelta]}
                onValueChange={([v]) => {
                  setDithDelta(v);
                }}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
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
