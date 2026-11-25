import React, { useEffect, useRef } from 'react';
import { HistoryPoint } from '../math/vectorCalculus';

interface HistoryChartCanvasProps {
  history: HistoryPoint[];
}

export const HistoryChartCanvas: React.FC<HistoryChartCanvasProps> = ({
  history,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth || 520;
    const height = 160;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 44;
    const padRight = 44;
    const padTop = 18;
    const padBottom = 26;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Grid baseline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padTop + (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    const maxSteps = Math.max(10, history[history.length - 1]?.step ?? 10);
    const maxPotential = Math.max(
      10,
      ...history.map((h) => Math.min(200, h.potential))
    );
    const maxDist = Math.max(12, ...history.map((h) => h.distanceToGoal));

    // Left Y-axis ticks (Potential U)
    ctx.fillStyle = '#2563eb';
    ctx.font = '500 10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(maxPotential.toFixed(0), padLeft - 6, padTop);
    ctx.fillText('0', padLeft - 6, padTop + plotH);

    // Right Y-axis ticks (Distance to Target)
    ctx.fillStyle = '#4f46e5';
    ctx.textAlign = 'left';
    ctx.fillText(maxDist.toFixed(0), padLeft + plotW + 6, padTop);
    ctx.fillText('0', padLeft + plotW + 6, padTop + plotH);

    // X-axis label
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Step 0', padLeft + 14, padTop + plotH + 6);
    ctx.fillText(
      `Step ${history[history.length - 1]?.step ?? 0}`,
      padLeft + plotW - 18,
      padTop + plotH + 6
    );

    if (history.length > 0) {
      // Potential U trace
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      history.forEach((pt, idx) => {
        const x = padLeft + (pt.step / maxSteps) * plotW;
        const clampedU = Math.min(maxPotential, pt.potential);
        const y = padTop + plotH - (clampedU / maxPotential) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Distance to Target trace
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      history.forEach((pt, idx) => {
        const x = padLeft + (pt.step / maxSteps) * plotW;
        const y = padTop + plotH - (pt.distanceToGoal / maxDist) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [history]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-slate-900">
          Potential Energy & Target Distance Over Steps
        </h3>
        <div className="flex items-center gap-4 text-xs text-slate-600 font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 bg-blue-600" aria-hidden="true" />
            Potential U
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-0.5 border-t-2 border-dashed border-indigo-600"
              aria-hidden="true"
            />
            Target Distance
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        data-testid="history-chart-canvas"
        className="w-full h-40 rounded border border-slate-200 bg-white block"
      />
    </div>
  );
};
