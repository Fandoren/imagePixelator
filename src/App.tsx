import { useRef, useState, useEffect } from "react";
import Controls from "@/components/Controls";
import TwoCanvasesDisplay from "@/components/TwoCanvasesDisplay";
import {
  pixelate as pixelateCanvas,
  computeMatchSize,
} from "@/lib/canvasUtils";
import { loadImageToCanvas } from "@/lib/imageLoader";
import GridPanel from "@/components/GridPanel";
import { Separator } from "./components/ui/separator";

export default function App() {
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [processedCanvas, setProcessedCanvas] =
    useState<HTMLCanvasElement | null>(null);

  const [imageSrc, setImageSrc] = useState<HTMLImageElement | null>(null);

  const [resultWidth, setResultWidth] = useState<number | undefined>(32);
  const [resultHeight, setResultHeight] = useState<number | undefined>(32);

  const [colorsCount, setColorsCount] = useState<number | undefined>(16);
  const [matchAspectRatio, setMatchAspectRatio] = useState<boolean>(false);

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

  const pixelate = () => {
    if (!imageSrc) return;
    let processedCanvas = pixelateCanvas(
      originalCanvasRef.current,
      resultCanvasRef.current,
      {
        resultWidth,
        resultHeight,
        reduceColors: enableReduceColors,
        colorsCount: colorsCount ?? 16,
        dithering: enableDithering,
        dithKern: enableDithering && dithKern !== "None" ? dithKern : null,
        dithDelta,
      }
    );
    setProcessedCanvas(processedCanvas ?? null);
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
    <>
      {/* Пикселизация, работа с цветом */}
      <div className="grid grid-cols-4 gap-2 p-1">
        <div className="col-span-1">
          <Controls
            loadImage={loadImage}
            resultWidth={resultWidth}
            setResultWidth={setResultWidth}
            resultHeight={resultHeight}
            setResultHeight={setResultHeight}
            matchAspectRatio={matchAspectRatio}
            setMatchAspectRatio={setMatchAspectRatio}
            matchRatio={matchRatio}
            enableReduceColors={enableReduceColors}
            setEnableReduceColors={setEnableReduceColors}
            colorsCount={colorsCount}
            setColorsCount={setColorsCount}
            enableDithering={enableDithering}
            setEnableDithering={setEnableDithering}
            dithKern={dithKern}
            setDithKern={setDithKern}
            dithDelta={dithDelta}
            setDithDelta={setDithDelta}
          />
        </div>
        <div className="col-span-3">
          <TwoCanvasesDisplay
            leftCanvasRef={originalCanvasRef}
            leftCanvasTitle="Оргинальное изображение"
            rightCanvasRef={resultCanvasRef}
            rightCanvasTitle="Обработанное изображение"
          />
        </div>
      </div>

      {/* Разделитель */}
      <div className="flex justify-center">
        <Separator className="my-4 max-w-9/10 bg-black" />
      </div>

      {/* Добавление сетки */}
      <GridPanel
        processedCanvas={processedCanvas}
        resultCanvasRef={resultCanvasRef}
      />
    </>
  );
}
