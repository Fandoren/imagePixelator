import RgbQuant from "rgbquant";

export type ImageProcessOptions = {
  reduceColors: boolean;
  colorsCount: number;
  dithering: boolean;
  dithKern: string | null;
  dithDelta: number;
};

export function processImage(
  canvasContext: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number,
  options: ImageProcessOptions
) {
  let imgData = canvasContext.getImageData(0, 0, targetWidth, targetHeight);

  if (options.reduceColors && options.colorsCount > 0) {
    imgData = reduceColors(imgData, options);
  }

  canvasContext.putImageData(imgData, 0, 0);
}

function reduceColors(imageData: ImageData, options: ImageProcessOptions): ImageData {
  const q = new RgbQuant({
    colors: options.colorsCount,
    dithKern: options.dithering ? options.dithKern : null,
    dithDelta: options.dithDelta,
  });

  q.sample(imageData);
  const reduced = q.reduce(imageData);

  return toRGBA(reduced as Uint8Array, imageData.width, imageData.height);
}

function toRGBA(data: Uint8Array | number[], width: number, height: number): ImageData {
  const pixelCount = width * height;

  if (data.length === pixelCount * 4) {
    return new ImageData(new Uint8ClampedArray(data), width, height);
  }

  if (data.length === pixelCount * 3) {
    const out = new Uint8ClampedArray(pixelCount * 4);
    for (let i = 0, j = 0; i < pixelCount; i++, j += 3) {
      const k = i * 4;
      out[k] = (data as any)[j];
      out[k + 1] = (data as any)[j + 1];
      out[k + 2] = (data as any)[j + 2];
      out[k + 3] = 255;
    }
    return new ImageData(out, width, height);
  }

  throw new Error(`Unexpected data length: ${data.length}`);
}
