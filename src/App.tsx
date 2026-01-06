import { useRef, useState } from "react";
import GridPanel from "@/components/GridPanel";
import { Separator } from "./components/ui/separator";
import PixelDrawingPanel from "./components/PixelDrawingPanel";
import PixelizationPanel from "./components/PixelizationPanel";

export default function App() {
  const [processedCanvas, setProcessedCanvas] =
    useState<HTMLCanvasElement | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <>
      <PixelizationPanel
        processedCanvas={processedCanvas}
        setProcessedCanvas={setProcessedCanvas}
        resultCanvasRef={resultCanvasRef}
      />

      <div className="flex justify-center">
        <Separator className="my-4 max-w-9/10 bg-black" />
      </div>

      <GridPanel
        processedCanvas={processedCanvas}
        resultCanvasRef={resultCanvasRef}
      />

      <div className="flex justify-center">
        <Separator className="my-4 max-w-9/10 bg-black" />
      </div>

      <PixelDrawingPanel
        processedCanvas={processedCanvas}
        resultCanvasRef={{ current: null }} // Передаем пустой ref, если не используется
      />
    </>
  );
}
