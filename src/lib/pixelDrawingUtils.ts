import type { PixelModifyItem } from "dotting";

/**
 * Конвертирует RGB значения в HEX строку
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b)
        .toString(16)
        .slice(1)
        .toUpperCase()}`;
}

/**
 * Получает массив PixelModifyItem из canvas
 * @param canvas - HTMLCanvasElement
 * @param ignoreTransparent - игнорировать полностью прозрачные пиксели
 * @returns Массив объектов PixelModifyItem
 */
export function getPixelArrayFromCanvas(
    canvas: HTMLCanvasElement,
    ignoreTransparent: boolean = true
): { pixelArray: PixelModifyItem[], palette: string[] } {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Не удалось получить контекст canvas');
    }

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const palette = new Set<string>();
    
    const pixelArray: PixelModifyItem[] = [];

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const index = (row * width + col) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];

            // Пропускаем полностью прозрачные пиксели, если нужно
            if (ignoreTransparent && a === 0) {
                continue;
            }
            let colorHex = a === 0 ? '#000000' : rgbToHex(r, g, b);
            palette.add(colorHex);

            const pixel: PixelModifyItem = {
                rowIndex: row,
                columnIndex: col,
                color: colorHex
            };

            pixelArray.push(pixel);
        }
    }

    return {pixelArray, palette: Array.from(palette)};
}