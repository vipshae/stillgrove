import React, { useRef, useEffect } from 'react';
import { initCanvas, setTotalHours, setSQS, CanvasTreeSketch } from "../core/sketch.ts";

interface TreeSketchProps {
  totalHours: number;
  sqs: number;
}

const TreeSketch: React.FC<TreeSketchProps> = ({ totalHours, sqs }) => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const canvasInstanceRef = useRef<CanvasTreeSketch | null>(null);

  useEffect(() => {
    if (sketchRef.current && !canvasInstanceRef.current) {
      sketchRef.current.innerHTML = '';
      canvasInstanceRef.current = initCanvas(sketchRef.current);
    }

    return () => {
      if (canvasInstanceRef.current) {
        canvasInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setTotalHours(totalHours);
    setSQS(sqs);
  }, [totalHours, sqs]);

  return <div ref={sketchRef} />;
};

export default TreeSketch;