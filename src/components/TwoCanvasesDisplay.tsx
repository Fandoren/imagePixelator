import React from "react";

interface CanvasDisplayProps {
  leftCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  leftCanvasTitle: string;
  rightCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  rightCanvasTitle: string;
}

export default function TwoCanvasesDisplay({
  leftCanvasRef,
  leftCanvasTitle,
  rightCanvasRef,
  rightCanvasTitle
}: Readonly<CanvasDisplayProps>) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">{leftCanvasTitle}</h3>
        <canvas
          ref={leftCanvasRef}
          style={{
            width: "100%",
            height: "auto",
          }}
        />
      </div>
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-2">{rightCanvasTitle}</h3>
        <canvas
          ref={rightCanvasRef}
          style={{
            width: "100%",
            height: "auto"
          }}
        />
      </div>
    </div>
  );
}
