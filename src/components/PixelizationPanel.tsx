import { useRef, useState, useEffect } from "react";
import TwoCanvasesDisplay from "@/components/TwoCanvasesDisplay";
import {
  pixelate as pixelateCanvas,
  computeMatchSize,
} from "@/lib/canvasUtils";
import { loadImageToCanvas } from "@/lib/imageLoader";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

interface PixelizationPanelProps {
  processedCanvas: HTMLCanvasElement | null;
  setProcessedCanvas: (canvas: HTMLCanvasElement | null) => void;
  resultCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function PixelizationPanel({
  setProcessedCanvas,
  resultCanvasRef,
}: Readonly<PixelizationPanelProps>) {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageSrc, setImageSrc] = useState<HTMLImageElement | null>(null);
  const [isChangeImageDimensions, setIsChangeImageDimensions] =
    useState<boolean>(true);
  const [isImmediateApply, setIsImmediateApply] = useState<boolean>(false);
  const [resultWidth, setResultWidth] = useState<number | undefined>(32);
  const [resultHeight, setResultHeight] = useState<number | undefined>(32);
  const [colorsCount, setColorsCount] = useState<number | undefined>(16);
  const [matchAspectRatio, setMatchAspectRatio] = useState<boolean>(true);
  const [dithKern, setDithKern] = useState<string>("None");
  const [dithDelta, setDithDelta] = useState<number>(0.5);
  const [enableReduceColors, setEnableReduceColors] = useState<boolean>(true);
  const [enableDithering, setEnableDithering] = useState<boolean>(false);

  const loadImage = async (file: File) => {
    try {
      const img = await loadImageToCanvas(file, originalCanvasRef.current);
      setImageSrc(img);
      if (matchAspectRatio) {
        const ow = originalCanvasRef.current?.width;
        const oh = originalCanvasRef.current?.height;
        if (ow && oh) {
          const res = computeMatchSize(ow, oh, {
            resultWidth,
            newResultWidth: undefined,
          });
          if (res.resultWidth !== undefined) setResultWidth(res.resultWidth);
          if (res.resultHeight !== undefined) setResultHeight(res.resultHeight);
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to load image:", err);
    }
  };

  const matchRatio = (newResultWidth?: number, newResultHeight?: number) => {
    const ow = originalCanvasRef.current?.width;
    const oh = originalCanvasRef.current?.height;
    if (!ow || !oh) return;
    const res = computeMatchSize(ow, oh, {
      newResultWidth,
      newResultHeight,
      resultWidth,
    });
    if (res.resultWidth !== undefined) setResultWidth(res.resultWidth);
    if (res.resultHeight !== undefined) setResultHeight(res.resultHeight);
  };

  const handlePixelate = () => {
    if (!imageSrc) return;

    let width = isChangeImageDimensions
      ? resultWidth
      : originalCanvasRef.current?.width;
    let height = isChangeImageDimensions
      ? resultHeight
      : originalCanvasRef.current?.height;

    const processed = pixelateCanvas(
      originalCanvasRef.current,
      resultCanvasRef.current,
      {
        resultWidth: width,
        resultHeight: height,
        reduceColors: enableReduceColors,
        colorsCount: colorsCount ?? 16,
        dithering: enableDithering,
        dithKern: enableDithering && dithKern !== "None" ? dithKern : null,
        dithDelta,
      }
    );
    setProcessedCanvas(processed ?? null);
  };

  const handleDownloadPixelated = () => {
    if (!resultCanvasRef.current) return;

    const link = document.createElement("a");
    link.download = "pixelated-image.png";
    link.href = resultCanvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleClearCanvases = () => {
    const clearCanvas = (c: HTMLCanvasElement | null) => {
      if (!c) return;
      const ctx = c.getContext("2d");
      if (ctx) {
        c.width = 0;
        c.height = 0;
      }
    };

    clearCanvas(originalCanvasRef.current);
    clearCanvas(resultCanvasRef.current);
    setImageSrc(null);
    setProcessedCanvas(null);
  };

  // Автоматическое применение пикселизации при изменении параметров
  useEffect(() => {
    if (isImmediateApply && imageSrc) {
      handlePixelate();
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handlePixelate();
      }
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [
    imageSrc,
    colorsCount,
    dithKern,
    dithDelta,
    resultWidth,
    resultHeight,
    enableReduceColors,
    enableDithering,
  ]);

  return (
    <div className="grid grid-cols-4 gap-2 p-1">
      {/* Настройки */}
      <div className="col-span-1">
        <div>
          Исходный размер изображения:{" "}
          <span className="font-bold">
            {originalCanvasRef.current?.width} x{" "}
            {originalCanvasRef.current?.height}
          </span>
        </div>
        <div className="border-2 border-black text-center mb-2">
          Общие настройки
        </div>
        {/* Загрузка файла */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <Label className="justify-self-center">Загрузить файл</Label>
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

        {/* Применять изменения сразу */}
        <div className="grid grid-cols-2 gap-1 mb-2 items-center">
          <Label className="justify-self-center">
            Применять изменения сразу?
          </Label>
          <Checkbox
            id="isImmediateApply"
            className="justify-self-center border-black"
            checked={isImmediateApply}
            onCheckedChange={(checked) => {
              setIsImmediateApply(!!checked);
            }}
          />
        </div>
        {/* Изменить размеры изображения */}
        <div className="grid grid-cols-2 gap-1 mb-2 items-center">
          <Label className="justify-self-center">
            Изменить размеры изображения?
          </Label>
          <Checkbox
            id="isChangeImageDimensions"
            className="justify-self-center border-black"
            checked={isChangeImageDimensions}
            onCheckedChange={(checked) => {
              setIsChangeImageDimensions(!!checked);
            }}
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
              const newWidth = parseInt(val);
              setResultWidth(newWidth);
              if (matchAspectRatio) matchRatio(newWidth);
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
            onChange={(e) =>
              setResultHeight(
                e.target.value === "" ? undefined : parseInt(e.target.value)
              )
            }
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
          <Label className="justify-self-center">
            Сохранить соотношение сторон?
          </Label>
          <Checkbox
            id="matchAspectRatio"
            className="justify-self-center border-black"
            checked={matchAspectRatio}
            onCheckedChange={(checked) => {
              setMatchAspectRatio(!!checked);
              if (checked) matchRatio(resultWidth);
            }}
          />
        </div>

        {/* Настройка цвета */}
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
            onChange={(e) =>
              setColorsCount(
                e.target.value === "" ? undefined : parseInt(e.target.value)
              )
            }
            className="w-28 justify-self-center"
          />
        </div>

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
              onValueChange={([v]) => setDithDelta(v)}
              min={0}
              max={1}
              step={0.01}
            />
          </div>
        </div>
        <Separator />
        <Button
          className="w-full mb-2"
          variant={"success"}
          onClick={handlePixelate}
        >
          Пиксилизировать
        </Button>
        <Button className="w-full" onClick={handleDownloadPixelated}>
          Скачать пикселизированное изображение
        </Button>
        <Button className="w-full mt-2" variant={"destructive"} onClick={handleClearCanvases}>
          Очистить Canvas'ы
        </Button>
      </div>
      {/* Изображения */}
      <div className="col-span-3">
        <TwoCanvasesDisplay
          leftCanvasRef={originalCanvasRef}
          leftCanvasTitle="Оригинальное изображение"
          rightCanvasRef={resultCanvasRef}
          rightCanvasTitle="Пикселизированное изображение"
        />
      </div>
    </div>
  );
}
