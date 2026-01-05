export function loadImageToCanvas(file: File, canvas: HTMLCanvasElement | null): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        }
      }
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = URL.createObjectURL(file);
  });
}
