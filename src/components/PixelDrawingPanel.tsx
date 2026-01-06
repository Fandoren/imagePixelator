import {
  Dotting,
  useBrush,
  BrushTool,
  useDotting,
  type DottingRef,
} from "dotting";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { getPixelArrayFromCanvas } from "@/lib/pixelDrawingUtils";
import { Label } from "@radix-ui/react-label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface PixelDrawingPanelProps {
  processedCanvas: HTMLCanvasElement | null;
  resultCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function PixelDrawingPanel({
  processedCanvas,
  resultCanvasRef,
}: Readonly<PixelDrawingPanelProps>) {
  const ref = useRef<DottingRef | null>(null);

  const { clear, colorPixels, downloadImage } = useDotting(ref);
  const { changeBrushColor, brushColor, changeBrushTool, brushTool } =
    useBrush(ref);

  const [gridHeight, setGridHeight] = useState<number>(800);
  const [palette, setPalette] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [tempColor, setTempColor] = useState<string>(brushColor ?? "#FFFFFF");

  const toggleColorPicker = () => {
    setTempColor(brushColor ?? "#FFFFFF");
    setShowColorPicker((v) => !v);
  };

  const applyTempColor = () => {
    changeBrushColor(tempColor);
    setShowColorPicker(false);
  };

  const onPaletteClick = (color: string) => {
    changeBrushColor(color);
  };

  useEffect(() => {
    let currentResultCanvas = resultCanvasRef.current;
    let height = currentResultCanvas?.clientHeight ?? 300;
    setGridHeight(Math.max(height, 800));
  }, [resultCanvasRef]);

  useEffect(() => {
    if (!brushTool) {
      changeBrushTool(BrushTool.DOT);
    }
  }, [brushTool, changeBrushTool]);

  const handleFillPixels = () => {
    let { pixelArray, palette } = getPixelArrayFromCanvas(processedCanvas!);

    clear();
    colorPixels(pixelArray);
    setPalette(palette);
  };

  const handleDownloadImage = () => {
    downloadImage({ type: "png" });
  };

  return (
    <div className="grid grid-cols-4 gap-2 p-1">
      <div className="col-span-1">
        <div className="grid grid-cols-1">
          <Button
            className="mt-2"
            variant={"success"}
            onClick={() => handleFillPixels()}
          >
            Создать полотно для рисования
          </Button>
          <Button className="my-2" onClick={() => handleDownloadImage()}>
            Скачать изображение
          </Button>
          <Button
            className="my-2"
            variant={"destructive"}
            onClick={() => clear()}
          >
            Очистить
          </Button>

          <div className="border-2 border-black text-center mb-2">
            Настройки цвета и кисти
          </div>
          <div className="grid grid-cols-2 gap-1 mb-2">
            <Label className="justify-self-center">Кисть</Label>
            <Select
              defaultValue={brushTool ?? BrushTool.DOT}
              onValueChange={(v) => changeBrushTool(v as BrushTool)}
            >
              <SelectTrigger className="min-w-40 justify-self-center">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BrushTool.DOT}>Точка</SelectItem>
                <SelectItem value={BrushTool.ERASER}>Ластик</SelectItem>
                <SelectItem value={BrushTool.PAINT_BUCKET}>Заливка</SelectItem>
                <SelectItem value={BrushTool.SELECT}>Выделение</SelectItem>
                <SelectItem value={BrushTool.NONE}>Ничего</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-1 mb-2">
            <Label className="justify-self-center">Текущий цвет</Label>
            <button
              onClick={toggleColorPicker}
              className="w-12 h-12 border border-gray-300"
              style={{ backgroundColor: brushColor ?? "#FFFFFF" }}
              aria-label="current color"
            />
          </div>
          {showColorPicker && (
            <div className="p-2 border rounded bg-white shadow-md mb-2">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  aria-label="color input"
                />
                <input
                  className="border px-2 py-1"
                  value={tempColor}
                  onChange={(e) => setTempColor(e.target.value)}
                  aria-label="hex input"
                />
                <Button onClick={applyTempColor}>Применить</Button>
                <Button onClick={() => setShowColorPicker(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          )}
          <div className="border-2 border-black text-center mb-2">
            Палитра оригинального изображения
          </div>
          <div className="flex flex-wrap gap-1">
            {palette.map((color) => {
              const rgb = parseInt(color.slice(1), 16);
              const brightness =
                ((rgb >> 16) & 255) * 0.299 +
                ((rgb >> 8) & 255) * 0.587 +
                (rgb & 255) * 0.114;
              const borderColor = brightness < 64 ? "white" : "black";

              return (
                <button
                  key={`index_color_${color}`}
                  className={`w-12 h-12 ${
                    color === brushColor
                      ? `border-2 border-dashed border-[${borderColor}]`
                      : "border border-gray-300"
                  }`}
                  style={{
                    backgroundColor: color,
                    borderColor: color === brushColor ? borderColor : undefined,
                  }}
                  onClick={() => onPaletteClick(color)}
                  aria-label={`palette ${color}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="col-span-3">
        <div className="flex flex-col items-center">
          <Dotting
            ref={ref}
            width={"100%"}
            height={gridHeight}
            isGridFixed={false} // TODO: разобраться с размерами сетки
            zoomSensitivity={700}
            backgroundColor="#FFFFFF"
          />
        </div>
      </div>
    </div>
  );
}
