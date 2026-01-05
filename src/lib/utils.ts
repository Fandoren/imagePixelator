import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Получение цвета пикселя
export function getPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
) {
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

// Установка цвета пикселя
export function setPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a = 255
) {
  const index = (y * width + x) * 4;
  data[index] = r;
  data[index + 1] = g;
  data[index + 2] = b;
  data[index + 3] = a;
}

export function toGrayscale(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = avg; // R
    data[i + 1] = avg; // G
    data[i + 2] = avg; // B
  }
}

export function copyImageData(
  imageData: ImageData,
  newResultWidth?: number,
  newResultHeight?: number
): ImageData {
  const copy = new Uint8ClampedArray(imageData.data);
  const newWidth = newResultWidth ?? imageData.width;
  const newHeight = newResultHeight ?? imageData.height;
  return new ImageData(copy, newWidth, newHeight);
}
