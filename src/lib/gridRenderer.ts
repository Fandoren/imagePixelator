export class GridRenderer {
  static createGriddedImage(
    processedCanvas: HTMLCanvasElement | null | undefined,
    resultCanvas: HTMLCanvasElement | null | undefined,
    targetCanvas: HTMLCanvasElement | null | undefined,
    gridThickness = 1,
    gridColor = "black"
  ) {
    if (!processedCanvas || !resultCanvas || !targetCanvas) return;

    const logicalWidth = processedCanvas.width;
    const logicalHeight = processedCanvas.height;

    const targetWidth = resultCanvas.width;
    const targetHeight = resultCanvas.height;

    targetCanvas.width = targetWidth;
    targetCanvas.height = targetHeight;

    const ctx = targetCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = false;

    const scaleX = targetWidth / logicalWidth;
    const scaleY = targetHeight / logicalHeight;
    const scale = Math.floor(Math.min(scaleX, scaleY));

    const drawWidth = logicalWidth * scale;
    const drawHeight = logicalHeight * scale;

    const offsetX = Math.floor((targetWidth - drawWidth) / 2);
    const offsetY = Math.floor((targetHeight - drawHeight) / 2);

    ctx.drawImage(processedCanvas, offsetX, offsetY, drawWidth, drawHeight);

    GridRenderer.drawGridOverlay(
      ctx,
      logicalWidth,
      logicalHeight,
      scale,
      offsetX,
      offsetY,
      gridThickness,
      gridColor
    );

    targetCanvas.style.imageRendering = "pixelated";
  }

  static createGridOnlyCanvas(
    processedCanvas: HTMLCanvasElement | null | undefined,
    resultCanvas: HTMLCanvasElement | null | undefined,
    gridOnlyCanvas: HTMLCanvasElement | null | undefined,
    gridThickness = 1,
    gridColor = "black"
  ) {
    if (!processedCanvas || !resultCanvas || !gridOnlyCanvas) return;

    const logicalWidth = processedCanvas.width;
    const logicalHeight = processedCanvas.height;

    const targetWidth = resultCanvas.width;
    const targetHeight = resultCanvas.height;

    gridOnlyCanvas.width = targetWidth;
    gridOnlyCanvas.height = targetHeight;

    const ctx = gridOnlyCanvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, targetWidth, targetHeight);

    ctx.imageSmoothingEnabled = false;

    const scaleX = targetWidth / logicalWidth;
    const scaleY = targetHeight / logicalHeight;
    const scale = Math.floor(Math.min(scaleX, scaleY));

    const drawWidth = logicalWidth * scale;
    const drawHeight = logicalHeight * scale;

    const offsetX = Math.floor((targetWidth - drawWidth) / 2);
    const offsetY = Math.floor((targetHeight - drawHeight) / 2);

    GridRenderer.drawGridOverlay(
      ctx,
      logicalWidth,
      logicalHeight,
      scale,
      offsetX,
      offsetY,
      gridThickness,
      gridColor
    );

    gridOnlyCanvas.style.imageRendering = "pixelated";
  }

  static drawGridOverlay(
    ctx: CanvasRenderingContext2D,
    pixelsWidth: number,
    pixelsHeight: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    gridThickness = 1,
    gridColor = "black"
  ) {
    ctx.fillStyle = gridColor;

    const gridAreaWidth = pixelsWidth * scale;
    const gridAreaHeight = pixelsHeight * scale;

    for (let x = 0; x <= pixelsWidth; x++) {
      const px = Math.round(offsetX + x * scale);
      ctx.fillRect(px, offsetY, gridThickness, gridAreaHeight);
    }

    for (let y = 0; y <= pixelsHeight; y++) {
      const py = Math.round(offsetY + y * scale);
      ctx.fillRect(offsetX, py, gridAreaWidth, gridThickness);
    }

    if (scale > 1) {
      const rightX = offsetX + gridAreaWidth - gridThickness;
      ctx.fillRect(rightX, offsetY, gridThickness, gridAreaHeight);

      const bottomY = offsetY + gridAreaHeight - gridThickness;
      ctx.fillRect(offsetX, bottomY, gridAreaWidth, gridThickness);
    }
  }

  static downloadGridPNG(gridOnlyCanvas: HTMLCanvasElement | null | undefined) {
    if (!gridOnlyCanvas) return;
    const link = document.createElement("a");
    link.href = gridOnlyCanvas.toDataURL("image/png");
    link.download = "grid.png";
    link.click();
  }
}
