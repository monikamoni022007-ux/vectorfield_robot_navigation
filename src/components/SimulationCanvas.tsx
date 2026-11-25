import React, { useEffect, useRef, useState } from 'react';
import {
  GRID_MAX,
  GRID_MIN,
  NavigationParams,
  OBSTACLES,
  Point2D,
  PotentialSample,
  RectangleBounds,
  SimulationState,
  TARGET_POINT,
  evaluatePotentialField,
  rotationalField,
} from '../math/vectorCalculus';

export type FieldMode = 'navigation' | 'rotational';

interface SimulationCanvasProps {
  mode: FieldMode;
  simState: SimulationState;
  params: NavigationParams;
  showHeatmap: boolean;
  showVectors: boolean;
  rectangle: RectangleBounds;
  robotSample: PotentialSample;
}

const PADDING = 48;

function worldToCanvas(
  wx: number,
  wy: number,
  plotSize: number
): { cx: number; cy: number } {
  const cx = PADDING + ((wx - GRID_MIN) / (GRID_MAX - GRID_MIN)) * plotSize;
  const cy =
    PADDING +
    plotSize -
    ((wy - GRID_MIN) / (GRID_MAX - GRID_MIN)) * plotSize;
  return { cx, cy };
}

function canvasToWorld(
  cx: number,
  cy: number,
  plotSize: number
): Point2D | null {
  const wx = GRID_MIN + ((cx - PADDING) / plotSize) * (GRID_MAX - GRID_MIN);
  const wy =
    GRID_MIN + ((PADDING + plotSize - cy) / plotSize) * (GRID_MAX - GRID_MIN);
  if (wx < GRID_MIN || wx > GRID_MAX || wy < GRID_MIN || wy > GRID_MAX) {
    return null;
  }
  return { x: wx, y: wy };
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number = 1.5,
  headLength: number = 6
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const angle = Math.atan2(dy, dx);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  mode,
  simState,
  params,
  showHeatmap,
  showVectors,
  rectangle,
  robotSample,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState<number>(560);
  const [hoverPoint, setHoverPoint] = useState<Point2D | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const target = Math.max(260, Math.min(600, Math.floor(rect.width)));
      setCanvasSize(target);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const plotSize = canvasSize - PADDING * 2;

    // Clear crisp white laboratory background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // 1. Optional Potential Heatmap (only in Navigation mode)
    if (mode === 'navigation' && showHeatmap) {
      const cells = 52;
      const cellPx = plotSize / cells;
      const maxReferencePotential = 95;

      for (let ix = 0; ix < cells; ix++) {
        for (let iy = 0; iy < cells; iy++) {
          const wx =
            GRID_MIN + ((ix + 0.5) / cells) * (GRID_MAX - GRID_MIN);
          const wy =
            GRID_MIN + ((iy + 0.5) / cells) * (GRID_MAX - GRID_MIN);

          const sample = evaluatePotentialField(
            { x: wx, y: wy },
            TARGET_POINT,
            OBSTACLES,
            params
          );

          // Log-compressed normalization so both target basin and obstacle spikes are readable
          const normalized = Math.min(
            1,
            Math.log1p(sample.uTotal) / Math.log1p(maxReferencePotential)
          );

          // Cool blue/indigo low-potential valley -> soft slate -> warm coral near obstacles
          let r: number, g: number, b: number;
          if (normalized < 0.55) {
            const t = normalized / 0.55;
            r = Math.round(239 + t * (241 - 239));
            g = Math.round(246 + t * (245 - 246));
            b = Math.round(255 - t * (255 - 249));
          } else {
            const t = (normalized - 0.55) / 0.45;
            r = Math.round(241 + t * (254 - 241));
            g = Math.round(245 - t * (245 - 205));
            b = Math.round(249 - t * (249 - 210));
          }

          const topLeft = worldToCanvas(
            GRID_MIN + (ix / cells) * (GRID_MAX - GRID_MIN),
            GRID_MIN + ((iy + 1) / cells) * (GRID_MAX - GRID_MIN),
            plotSize
          );

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(
            topLeft.cx,
            topLeft.cy,
            Math.ceil(cellPx) + 0.5,
            Math.ceil(cellPx) + 0.5
          );
        }
      }
    }

    // 2. Coordinate Grid Lines (0 to 10)
    ctx.save();
    for (let i = GRID_MIN; i <= GRID_MAX; i++) {
      const pVert = worldToCanvas(i, GRID_MIN, plotSize);
      const pTop = worldToCanvas(i, GRID_MAX, plotSize);
      ctx.strokeStyle = i === 0 || i === 10 ? '#94a3b8' : '#e2e8f0';
      ctx.lineWidth = i === 0 || i === 10 ? 1.25 : 1;
      ctx.beginPath();
      ctx.moveTo(pVert.cx, pVert.cy);
      ctx.lineTo(pTop.cx, pTop.cy);
      ctx.stroke();

      const pHorizLeft = worldToCanvas(GRID_MIN, i, plotSize);
      const pHorizRight = worldToCanvas(GRID_MAX, i, plotSize);
      ctx.beginPath();
      ctx.moveTo(pHorizLeft.cx, pHorizLeft.cy);
      ctx.lineTo(pHorizRight.cx, pHorizRight.cy);
      ctx.stroke();

      // Axis ticks and numeric labels
      ctx.fillStyle = '#475569';
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(i), pVert.cx, PADDING + plotSize + 8);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i), PADDING - 7, pHorizLeft.cy);
    }

    // Axis titles
    ctx.fillStyle = '#334155';
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('x coordinate', PADDING + plotSize / 2, canvasSize - 4);

    ctx.save();
    ctx.translate(6, PADDING + plotSize / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('y coordinate', 0, 0);
    ctx.restore();
    ctx.restore();

    if (mode === 'navigation') {
      // 3. Vector Field Arrows F = -∇U
      if (showVectors) {
        const step = 0.5;
        const maxArrowPx = (plotSize / 10) * 0.42;

        for (let wx = 0.5; wx <= 9.5; wx += step) {
          for (let wy = 0.5; wy <= 9.5; wy += step) {
            // Skip inside obstacle collision cores so arrows remain legible
            const insideObstacle = OBSTACLES.some(
              (o) => Math.hypot(wx - o.x, wy - o.y) < params.obstacleRadius * 0.9
            );
            if (insideObstacle) continue;

            const sample = evaluatePotentialField(
              { x: wx, y: wy },
              TARGET_POINT,
              OBSTACLES,
              params
            );
            if (sample.forceMagnitude < 1e-4) continue;

            const ux = sample.forceX / sample.forceMagnitude;
            const uy = sample.forceY / sample.forceMagnitude;
            const scaleFactor = Math.min(
              1,
              0.48 + 0.52 * Math.tanh(sample.forceMagnitude / 8)
            );
            const len = maxArrowPx * scaleFactor;
            const start = worldToCanvas(wx, wy, plotSize);
            const endX = start.cx + ux * len;
            const endY = start.cy - uy * len;

            drawArrow(
              ctx,
              start.cx,
              start.cy,
              endX,
              endY,
              'rgba(37, 99, 235, 0.72)',
              1.35,
              5
            );
          }
        }
      }

      // 4. Obstacles and Influence Radii
      OBSTACLES.forEach((obs, idx) => {
        const center = worldToCanvas(obs.x, obs.y, plotSize);
        const d0Px = (params.d0 / (GRID_MAX - GRID_MIN)) * plotSize;
        const rPx = (params.obstacleRadius / (GRID_MAX - GRID_MIN)) * plotSize;

        // Influence boundary d0
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.55)';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(center.cx, center.cy, d0Px, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Physical obstacle disc
        ctx.save();
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(center.cx, center.cy, rPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = '600 11px "IBM Plex Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          `O${idx + 1}(${obs.x},${obs.y})`,
          center.cx + rPx + 4,
          center.cy - 2
        );
        ctx.restore();
      });

      // 5. Target at (9, 9)
      const targetPos = worldToCanvas(TARGET_POINT.x, TARGET_POINT.y, plotSize);
      ctx.save();
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(targetPos.cx, targetPos.cy, 13, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(targetPos.cx, targetPos.cy, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#991b1b';
      ctx.font = '600 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Goal (9,9)', targetPos.cx - 12, targetPos.cy - 8);
      ctx.restore();

      // 6. Robot Navigation Path
      if (simState.path.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.beginPath();
        simState.path.forEach((pt, idx) => {
          const c = worldToCanvas(pt.x, pt.y, plotSize);
          if (idx === 0) ctx.moveTo(c.cx, c.cy);
          else ctx.lineTo(c.cx, c.cy);
        });
        ctx.stroke();

        // Subtle breadcrumb step dots every 3 steps
        ctx.fillStyle = '#4f46e5';
        simState.path.forEach((pt, idx) => {
          if (idx % 3 === 0 && idx < simState.path.length - 1) {
            const c = worldToCanvas(pt.x, pt.y, plotSize);
            ctx.beginPath();
            ctx.arc(c.cx, c.cy, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // 7. Start marker at (1, 1)
      const startPos = worldToCanvas(1, 1, plotSize);
      ctx.save();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.rect(startPos.cx - 5, startPos.cy - 5, 10, 10);
      ctx.stroke();
      ctx.fillStyle = '#065f46';
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Start (1,1)', startPos.cx + 8, startPos.cy + 6);
      ctx.restore();

      // 8. Green Robot + Active Negative Gradient Arrow
      const robotPos = worldToCanvas(
        simState.robot.x,
        simState.robot.y,
        plotSize
      );

      if (robotSample.forceMagnitude > 1e-4 && simState.status !== 'reached') {
        const ux = robotSample.forceX / robotSample.forceMagnitude;
        const uy = robotSample.forceY / robotSample.forceMagnitude;
        const vecLen = 30;
        drawArrow(
          ctx,
          robotPos.cx,
          robotPos.cy,
          robotPos.cx + ux * vecLen,
          robotPos.cy - uy * vecLen,
          '#059669',
          2.25,
          7
        );
      }

      ctx.save();
      ctx.fillStyle = '#16a34a';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(robotPos.cx, robotPos.cy, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(robotPos.cx, robotPos.cy, 8.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      // ROTATIONAL FIELD & GREEN'S THEOREM MODE: F(x, y) = (-y, x)
      const xMin = Math.min(rectangle.xMin, rectangle.xMax);
      const xMax = Math.max(rectangle.xMin, rectangle.xMax);
      const yMin = Math.min(rectangle.yMin, rectangle.yMax);
      const yMax = Math.max(rectangle.yMin, rectangle.yMax);

      const topLeft = worldToCanvas(xMin, yMax, plotSize);
      const bottomRight = worldToCanvas(xMax, yMin, plotSize);
      const rectW = bottomRight.cx - topLeft.cx;
      const rectH = bottomRight.cy - topLeft.cy;

      // Shaded enclosed region R
      ctx.save();
      ctx.fillStyle = 'rgba(79, 70, 229, 0.10)';
      ctx.fillRect(topLeft.cx, topLeft.cy, rectW, rectH);
      ctx.restore();

      // Rotational vector arrows F(x, y) = (-y, x)
      if (showVectors) {
        const maxFieldMag = Math.hypot(10, 10);
        const maxArrowPx = (plotSize / 10) * 0.56;
        for (let wx = 0.5; wx <= 9.5; wx += 1.0) {
          for (let wy = 0.5; wy <= 9.5; wy += 1.0) {
            const { P, Q } = rotationalField(wx, wy);
            const mag = Math.hypot(P, Q);
            if (mag < 1e-4) continue;
            const ux = P / mag;
            const uy = Q / mag;
            const len = maxArrowPx * (0.35 + 0.65 * (mag / maxFieldMag));
            const start = worldToCanvas(wx, wy, plotSize);
            drawArrow(
              ctx,
              start.cx,
              start.cy,
              start.cx + ux * len,
              start.cy - uy * len,
              'rgba(37, 99, 235, 0.78)',
              1.5,
              5.5
            );
          }
        }
      }

      // Closed rectangular boundary C with counterclockwise orientation arrows
      const bl = worldToCanvas(xMin, yMin, plotSize);
      const br = worldToCanvas(xMax, yMin, plotSize);
      const tr = worldToCanvas(xMax, yMax, plotSize);
      const tl = worldToCanvas(xMin, yMax, plotSize);

      drawArrow(ctx, bl.cx, bl.cy, br.cx, br.cy, '#4f46e5', 2.5, 9);
      drawArrow(ctx, br.cx, br.cy, tr.cx, tr.cy, '#4f46e5', 2.5, 9);
      drawArrow(ctx, tr.cx, tr.cy, tl.cx, tl.cy, '#4f46e5', 2.5, 9);
      drawArrow(ctx, tl.cx, tl.cy, bl.cx, bl.cy, '#4f46e5', 2.5, 9);

      // Edge labels C1..C4 and Region R label
      ctx.save();
      ctx.fillStyle = '#312e81';
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('C1 →', (bl.cx + br.cx) / 2, bl.cy + 6);
      ctx.textBaseline = 'bottom';
      ctx.fillText('← C3', (tl.cx + tr.cx) / 2, tl.cy - 6);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('↑ C2', br.cx + 6, (br.cy + tr.cy) / 2);

      ctx.textAlign = 'right';
      ctx.fillText('C4 ↓', bl.cx - 6, (bl.cy + tl.cy) / 2);

      const midX = (bl.cx + br.cx) / 2;
      const midY = (bl.cy + tl.cy) / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.strokeStyle = 'rgba(199, 210, 254, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(midX - 66, midY - 22, 132, 44, 4);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#3730a3';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `Region R (${(xMax - xMin).toFixed(1)} × ${(yMax - yMin).toFixed(1)})`,
        midX,
        midY - 8
      );
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.fillText('Curl = 2.00', midX, midY + 9);
      ctx.restore();
    }
  }, [
    canvasSize,
    mode,
    simState,
    params,
    showHeatmap,
    showVectors,
    rectangle,
    robotSample,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const plotSize = canvasSize - PADDING * 2;
    setHoverPoint(canvasToWorld(cx, cy, plotSize));
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center">
      <div className="relative w-full flex flex-col items-center">
        <canvas
          ref={canvasRef}
          data-testid="simulation-canvas"
          style={{ width: canvasSize, height: canvasSize }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverPoint(null)}
          className="cursor-crosshair rounded border border-slate-200 bg-white block"
        />
        <div
          aria-live="polite"
          className="mt-2 flex flex-wrap items-center justify-between gap-2 w-full text-xs text-slate-600 font-mono tabular-nums px-0.5"
          style={{ maxWidth: canvasSize }}
        >
          <span>
            {hoverPoint
              ? `Cursor: (${hoverPoint.x.toFixed(2)}, ${hoverPoint.y.toFixed(2)})`
              : 'Hover grid to inspect coordinates (0–10)'}
          </span>
          {mode === 'navigation' ? (
            <span>
              Robot: ({simState.robot.x.toFixed(2)}, {simState.robot.y.toFixed(2)})
            </span>
          ) : (
            <span>F(x, y) = (-y, x) · CCW boundary C</span>
          )}
        </div>
      </div>
    </div>
  );
};
