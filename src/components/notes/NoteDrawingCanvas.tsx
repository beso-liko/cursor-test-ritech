"use client";

import { useCallback, useEffect, useRef } from "react";
import getStroke from "perfect-freehand";
import type { DrawingStroke } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function getSvgPath(stroke: number[][]) {
  if (!stroke.length) return "";
  const outline = getStroke(stroke, {
    size: 8,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
  });
  if (!outline.length) return "";
  const d: string[] = [`M${outline[0][0].toFixed(1)} ${outline[0][1].toFixed(1)}`];
  for (let i = 1; i < outline.length; i++) {
    d.push(`L${outline[i][0].toFixed(1)} ${outline[i][1].toFixed(1)}`);
  }
  d.push("Z");
  return d.join(" ");
}

export const DRAWING_COLORS = [
  "#111827",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#9333ea",
];

interface NoteDrawingOverlayProps {
  strokes: DrawingStroke[];
  onChange: (strokes: DrawingStroke[]) => void;
  active: boolean;
  mode: "pen" | "eraser";
  color: string;
  height: number;
  onExtendHeight?: (height: number) => void;
  className?: string;
}

function clientToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): [number, number] | null {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgPt = pt.matrixTransform(ctm.inverse());
  return [svgPt.x, svgPt.y];
}

export function NoteDrawingOverlay({
  strokes,
  onChange,
  active,
  mode,
  color,
  height,
  onExtendHeight,
  className,
}: NoteDrawingOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const previewRef = useRef<SVGPathElement>(null);
  const currentPointsRef = useRef<number[][]>([]);
  const drawingRef = useRef(false);
  const strokesRef = useRef(strokes);
  const modeRef = useRef(mode);
  const colorRef = useRef(color);
  const onChangeRef = useRef(onChange);
  const onExtendHeightRef = useRef(onExtendHeight);
  const heightRef = useRef(height);
  const rafRef = useRef<number | null>(null);

  strokesRef.current = strokes;
  modeRef.current = mode;
  colorRef.current = color;
  onChangeRef.current = onChange;
  onExtendHeightRef.current = onExtendHeight;
  heightRef.current = height;

  const updatePreview = useCallback(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const points = currentPointsRef.current;
    if (points.length > 1 && modeRef.current === "pen") {
      preview.setAttribute("d", getSvgPath(points));
      preview.setAttribute("fill", colorRef.current);
    } else {
      preview.setAttribute("d", "");
    }
  }, []);

  const maybeExtendHeight = useCallback((y: number) => {
    if (!onExtendHeightRef.current) return;
    if (y > heightRef.current - 48) {
      onExtendHeightRef.current(y + 48);
    }
  }, []);

  const finishStroke = useCallback(() => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const points = currentPointsRef.current;
    currentPointsRef.current = [];
    updatePreview();

    if (points.length > 1 && modeRef.current === "pen") {
      onChangeRef.current([
        ...strokesRef.current,
        { points, color: colorRef.current, size: 8 },
      ]);
    }
  }, [updatePreview]);

  const getPoint = useCallback(
    (event: React.PointerEvent<SVGSVGElement> | PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return null;
      return clientToSvgPoint(svg, event.clientX, event.clientY);
    },
    []
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!active) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);

      const point = getPoint(event);
      if (!point) return;

      if (modeRef.current === "eraser") {
        const [x, y] = point;
        const next = strokesRef.current.filter((stroke) => {
          return !stroke.points.some(
            ([px, py]) => Math.hypot(px - x, py - y) < 16
          );
        });
        if (next.length !== strokesRef.current.length) {
          onChangeRef.current(next);
        }
        return;
      }

      drawingRef.current = true;
      currentPointsRef.current = [point];
      maybeExtendHeight(point[1]);
      updatePreview();
    },
    [active, getPoint, maybeExtendHeight, updatePreview]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!drawingRef.current) return;
      event.preventDefault();
      const point = getPoint(event);
      if (!point) return;

      const points = currentPointsRef.current;
      const last = points[points.length - 1];
      if (last && Math.hypot(last[0] - point[0], last[1] - point[1]) < 1.5) {
        return;
      }

      points.push(point);
      maybeExtendHeight(point[1]);

      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          updatePreview();
          rafRef.current = null;
        });
      }
    },
    [getPoint, maybeExtendHeight, updatePreview]
  );

  const handlePointerUp = useCallback(() => {
    finishStroke();
  }, [finishStroke]);

  useEffect(() => {
    if (!active) {
      drawingRef.current = false;
      currentPointsRef.current = [];
      updatePreview();
    }
  }, [active, updatePreview]);

  return (
    <svg
      ref={svgRef}
      className={cn(
        "absolute inset-x-0 top-0 w-full touch-none",
        active ? "pointer-events-auto cursor-crosshair" : "pointer-events-none",
        className
      )}
      style={{ height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {strokes.map((stroke, index) => (
        <path
          key={index}
          d={getSvgPath(stroke.points)}
          fill={stroke.color}
          opacity={0.9}
        />
      ))}
      <path ref={previewRef} opacity={0.9} />
    </svg>
  );
}
