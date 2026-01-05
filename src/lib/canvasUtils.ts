import { processImage, type ImageProcessOptions } from "./imageProcessing";

export type PixelateOptions = {
  resultWidth?: number;
  resultHeight?: number;
  reduceColors: boolean;
  colorsCount: number;
  dithering: boolean;
  dithKern: string | null;
  dithDelta: number;
};

export function pixelate(
  originalCanvas: HTMLCanvasElement | null,
  resultCanvas: HTMLCanvasElement | null,
  options: PixelateOptions
) : HTMLCanvasElement | undefined {
  if (!originalCanvas || !resultCanvas) return;

  const originalContext = originalCanvas.getContext("2d");
  const resultContext = resultCanvas.getContext("2d");
  if (!originalContext || !resultContext) return;

  const targetWidth = options.resultWidth ?? 32;
  const targetHeight = options.resultHeight ?? 32;

  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = targetWidth;
  targetCanvas.height = targetHeight;
  const targetContext = targetCanvas.getContext("2d");
  if (!targetContext) return;
  targetContext.imageSmoothingEnabled = false;
  targetContext.drawImage(originalCanvas, 0, 0, targetWidth, targetHeight);

  try {
    processImage(targetContext, targetWidth, targetHeight, {
      reduceColors: options.reduceColors,
      colorsCount: options.colorsCount,
      dithering: options.dithering,
      dithKern: options.dithering ? options.dithKern : null,
      dithDelta: options.dithDelta,
    } as ImageProcessOptions);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error processing image:", err);
  }

  resultCanvas.width = originalCanvas.width;
  resultCanvas.height = originalCanvas.height;
  resultCanvas.style.imageRendering = "pixelated";
  resultContext.imageSmoothingEnabled = false;
  resultContext.drawImage(targetCanvas, 0, 0, resultCanvas.width, resultCanvas.height);

  return targetCanvas;
}

export function computeMatchSize(
  originalWidth: number,
  originalHeight: number,
  params: { newResultWidth?: number; newResultHeight?: number; resultWidth?: number }
) {
  const aspect = originalHeight / originalWidth;

  if (typeof params.newResultWidth === "number") {
    const h = Math.max(1, Math.round(params.newResultWidth * aspect));
    return { resultHeight: h };
  }

  if (typeof params.newResultHeight === "number") {
    const w = Math.max(1, Math.round(params.newResultHeight / aspect));
    return { resultWidth: w };
  }

  if (typeof params.resultWidth === "number") {
    const h = Math.max(1, Math.round(params.resultWidth * aspect));
    return { resultHeight: h };
  }

  return {};
}
