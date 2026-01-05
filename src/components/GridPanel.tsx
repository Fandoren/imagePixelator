import { useRef } from "react";
import TwoCanvasesDisplay from "@/components/TwoCanvasesDisplay";
import { Button } from "./ui/button";
import { GridRenderer } from "@/lib/gridRenderer";

interface GridPanelProps {
  processedCanvas: HTMLCanvasElement | null;
  resultCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function GridPanel({ processedCanvas, resultCanvasRef }: GridPanelProps) {
  const imageWithGridRef = useRef<HTMLCanvasElement | null>(null);
  const gridOnlyRef = useRef<HTMLCanvasElement | null>(null);

  const handleCreateGridded = () => {
    GridRenderer.createGriddedImage(
      processedCanvas,
      resultCanvasRef.current ?? null,
      imageWithGridRef.current,
      1,
      "black"
    );
  };

  const handleCreateGridOnly = () => {
    GridRenderer.createGridOnlyCanvas(
      processedCanvas,
      resultCanvasRef.current ?? null,
      gridOnlyRef.current,
      1,
      "black"
    );
  };

  const handleDownloadGrid = () => {
    GridRenderer.downloadGridPNG(gridOnlyRef.current);
  };

  return (
    <div className="grid grid-cols-4 gap-2 p-1">
      <div className="col-span-1">
        <div className="grid grid-cols-1">
          <Button className="mb-4" onClick={handleCreateGridded}>
            Создать изображение с сеткой
          </Button>
          <Button className="mb-4" onClick={handleCreateGridOnly}>
            Создать сетку
          </Button>
          <Button onClick={handleDownloadGrid}>Скачать сетку PNG</Button>
        </div>
      </div>
      <div className="col-span-3">
        <TwoCanvasesDisplay
          leftCanvasRef={imageWithGridRef}
          leftCanvasTitle="Изображение с сеткой"
          rightCanvasRef={gridOnlyRef}
          rightCanvasTitle="Сетка отдельно"
        />
      </div>
    </div>
  );
}
