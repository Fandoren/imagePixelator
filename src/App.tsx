import { useRef, useState, useEffect } from "react";
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
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageSrc, setImageSrc] = useState<HTMLImageElement | null>(null);

  const [resultWidth, setResultWidth] = useState<number | undefined>(32);
  const [resultHeight, setResultHeight] = useState<number | undefined>(32);

  const [colorsCount, setColorsCount] = useState<number | undefined>(16);
  const [matchAspectRatio, setMatchAspectRatio] = useState<boolean>(false);

  const [dithKern, setDithKern] = useState<string>("None");
  const [dithDelta, setDithDelta] = useState<number>(0.5);

  const [enableReduceColors, setEnableReduceColors] = useState<boolean>(true);
  const [enableDithering, setEnableDithering] = useState<boolean>(false);

  type ImageProcessOptions = {
    reduceColors: boolean;
    colorsCount: number;
    dithering: boolean;
    dithKern: string | null;
    dithDelta: number;
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

      if (matchAspectRatio) {
        matchRatio(resultWidth);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const pixelate = () => {
    if (!imageSrc) return;

    const originalCanvas = originalCanvasRef.current;
    const resultCanvas = resultCanvasRef.current;
    if (!originalCanvas || !resultCanvas) return;

    const originalContext = originalCanvas.getContext("2d");
    const resultContext = resultCanvas.getContext("2d");
    if (!originalContext || !resultContext) return;

    const targetWidth = resultWidth || 32;
    const targetHeight = resultHeight || 32;

    // 1. Уменьшаем изображение до нужного размера без сглаживания. Пикселизируем его
    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;
    const targetContext = targetCanvas.getContext("2d")!;
    targetContext.imageSmoothingEnabled = false;
    targetContext.drawImage(originalCanvas, 0, 0, targetWidth, targetHeight);

    // 2. Обрабатываем изображение (Уменьшаем цвета, добавляем шум)
    try {
      processImage(targetContext, targetWidth, targetHeight, {
        reduceColors: enableReduceColors,
        colorsCount: colorsCount ?? 16,
        dithering: enableDithering,
        dithKern: enableDithering && dithKern !== "None" ? dithKern : null,
        dithDelta,
      });
    } catch (err) {
      console.error("Error processsingImage:", err);
    }

    // 3. Растягиваем промежуточное изображение до размеров оригинального. Вставляем в canvas на интерфейсе
    resultCanvas.width = originalCanvas.width;
    resultCanvas.height = originalCanvas.height;
    resultContext.imageSmoothingEnabled = false;
    resultContext.drawImage(
      targetCanvas,
      0,
      0,
      resultCanvas.width,
      resultCanvas.height
    );
  };

  const matchRatio = (newResultWidth?: number, newResultHeight?: number) => {
    const originalWidth = originalCanvasRef.current?.width;
    const originalHeight = originalCanvasRef.current?.height;

    if (!originalWidth || !originalHeight) return;

    const aspect = originalHeight / originalWidth;

    if (typeof newResultWidth === "number") {
      const h = Math.max(1, Math.round(newResultWidth * aspect));
      setResultHeight(h);
      return;
    }

    if (typeof newResultHeight === "number") {
      const w = Math.max(1, Math.round(newResultHeight / aspect));
      setResultWidth(w);
      return;
    }

    if (typeof resultWidth === "number") {
      const h = Math.max(1, Math.round(resultWidth * aspect));
      setResultHeight(h);
    }
  };

  const processImage = (
    canvasContext: CanvasRenderingContext2D,
    targetWidth: number,
    targetHeight: number,
    options: ImageProcessOptions
  ) => {
    let imgData = canvasContext.getImageData(0, 0, targetWidth, targetHeight);

    if (options.reduceColors && options.colorsCount > 0) {
      imgData = reduceColors(imgData, options);
    }

    canvasContext.putImageData(imgData, 0, 0);
  };

  const reduceColors = (
    imageData: ImageData,
    options: ImageProcessOptions
  ): ImageData => {
    const q = new RgbQuant({
      colors: options.colorsCount,
      dithKern: options.dithering ? options.dithKern : null,
      dithDelta: options.dithDelta,
    });

    q.sample(imageData);
    const reduced = q.reduce(imageData);

    return toRGBA(reduced as Uint8Array, imageData.width, imageData.height);
  };

  const toRGBA = (
    data: Uint8Array | number[],
    width: number,
    height: number
  ): ImageData => {
    const pixelCount = width * height;

    // RGBA
    if (data.length === pixelCount * 4) {
      return new ImageData(new Uint8ClampedArray(data), width, height);
    }

    // RGB → RGBA
    if (data.length === pixelCount * 3) {
      const out = new Uint8ClampedArray(pixelCount * 4);
      for (let i = 0, j = 0; i < pixelCount; i++, j += 3) {
        const k = i * 4;
        out[k] = data[j];
        out[k + 1] = data[j + 1];
        out[k + 2] = data[j + 2];
        out[k + 3] = 255;
      }
      return new ImageData(out, width, height);
    }

    throw new Error(`Unexpected data length: ${data.length}`);
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
  }, [imageSrc, colorsCount, dithKern, dithDelta, resultWidth, resultHeight, enableReduceColors, enableDithering]);

  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="col-span-1 p-1">
        <div className="border-2 border-black text-center mb-2">
          Общие настройки
        </div>
        {/* Загрузка изображения */}
        <div className="flex flex-row items-center gap-4 w-full">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadImage(file);
            }}
            className="flex-1 cursor-pointer border-black"
          />
        </div>
        {/* Ширина */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <Label className="justify-self-center">Ширина (px)</Label>
          <Input
            type="number"
            min={1}
            value={resultWidth ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") {
                setResultWidth(undefined);
                return;
              }
              let newWidth = parseInt(val);
              setResultWidth(newWidth);
              if (matchAspectRatio) {
                matchRatio(newWidth);
              }
            }}
            className="w-28 justify-self-center"
          />
        </div>
        {/* Высота */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <Label className="justify-self-center">Высота (px)</Label>
          <Input
            type="number"
            min={1}
            value={resultHeight ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setResultHeight(val === "" ? undefined : parseInt(val));
            }}
            disabled={matchAspectRatio}
            className={
              matchAspectRatio
                ? "w-28 bg-gray-200 cursor-not-allowed justify-self-center"
                : "w-28 justify-self-center"
            }
          />
        </div>
        {/* Сохранить соотношение сторон */}
        <div className="grid grid-cols-2 gap-1 mb-2 items-center">
          <Label className="text-center">Сохранить соотношение сторон?</Label>
          <Checkbox
            id="matchAspectRatio"
            className="justify-self-center border-black"
            onCheckedChange={(checked) => {
              setMatchAspectRatio(!!checked);
              if (checked) {
                matchRatio(resultWidth);
              }
            }}
          />
        </div>
        <div className="border-2 border-black text-center mb-2">
          Настройка цвета
        </div>
        {/* Уменьшить количество цветов */}
        <div className="grid grid-cols-2 gap-1 mb-2 items-center">
          <Label className="text-center">Уменьшить количество цветов?</Label>
          <Checkbox
            id="reduceColors"
            className="justify-self-center border-black"
            checked={enableReduceColors}
            onCheckedChange={(checked) => setEnableReduceColors(!!checked)}
          />
        </div>
        {/* Количество цветов */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <Label className="justify-self-center">Количество цветов</Label>
          <Input
            type="number"
            min={0}
            disabled={!enableReduceColors}
            value={colorsCount ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setColorsCount(val === "" ? undefined : parseInt(val));
            }}
            className="w-28 justify-self-center"
          />
        </div>
        {/* Добавить шум */}
        <div className="grid grid-cols-2 gap-1 mb-2 items-center">
          <Label className="justify-self-center">Добавить шум?</Label>
          <Checkbox
            id="addDithering"
            className="justify-self-center border-black"
            disabled={!enableReduceColors}
            checked={enableDithering}
            onCheckedChange={(checked) => setEnableDithering(!!checked)}
          />
        </div>
        {/* Алгоритм шума */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <Label className="justify-self-center">Алгоритм шума</Label>
          <Select
            disabled={!enableDithering || !enableReduceColors}
            defaultValue={dithKern}
            onValueChange={(v) => setDithKern(v)}
          >
            <SelectTrigger className="min-w-40 justify-self-center">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="None">Никакой</SelectItem>
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
        {/* Сила шума */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <Label className="justify-self-center">Сила шума</Label>
          <div>
            <div className="text-center">{dithDelta.toFixed(2)}</div>
            <Slider
              value={[dithDelta]}
              disabled={!enableDithering || !enableReduceColors}
              onValueChange={([v]) => {
                setDithDelta(v);
              }}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        </div>
      </div>
      <div className="col-span-3">
        <div className="grid grid-cols-2 gap-6">
          {/* Оргинальное изображение */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">
              Оргинальное изображение
            </h3>
            <canvas
              ref={originalCanvasRef}
              style={{
                width: "100%",
                height: "auto",
              }}
            />
          </div>
          {/* Обработанное изображение */}
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-2">
              Обработанное изображение
            </h3>
            <canvas
              ref={resultCanvasRef}
              style={{
                width: "100%",
                height: "auto",
                imageRendering: "pixelated",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
