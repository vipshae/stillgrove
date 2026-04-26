import React, { useRef, useEffect } from 'react';
import p5 from 'p5';
import { sketch, setTotalHours, setSQS } from "../core/sketch.ts";

interface TreeSketchProps {
  totalHours: number;
  sqs: number;
}

const TreeSketch: React.FC<TreeSketchProps> = ({ totalHours, sqs }) => {
  const sketchRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    if (sketchRef.current && !p5InstanceRef.current) {
      sketchRef.current.innerHTML = '';
      p5InstanceRef.current = new p5(sketch, sketchRef.current);
    }

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
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