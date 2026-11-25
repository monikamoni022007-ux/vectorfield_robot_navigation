import React from 'react';
import {
  GreensTheoremAnalysis,
  NavigationParams,
  Point2D,
  PotentialSample,
  RectangleBounds,
} from '../math/vectorCalculus';

interface ControlAndMathPanelProps {
  params: NavigationParams;
  onParamsChange: (next: NavigationParams) => void;
  robot: Point2D;
  robotSample: PotentialSample;
  rectangle: RectangleBounds;
  onRectangleChange: (next: RectangleBounds) => void;
  greens: GreensTheoremAnalysis;
}

export const ControlAndMathPanel: React.FC<ControlAndMathPanelProps> = ({
  params,
  onParamsChange,
  robot,
  robotSample,
  rectangle,
  onRectangleChange,
  greens,
}) => {
  const updateRect = (field: keyof RectangleBounds, value: number) => {
    const next = { ...rectangle, [field]: value };
    if (next.xMax - next.xMin < 1) {
      if (field === 'xMin') next.xMin = next.xMax - 1;
      else next.xMax = next.xMin + 1;
    }
    if (next.yMax - next.yMin < 1) {
      if (field === 'yMin') next.yMin = next.yMax - 1;
      else next.yMax = next.yMin + 1;
    }
    onRectangleChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Potential Field Parameters & Forces */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">
          1. Potential Field Parameters
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          The attractive force pulls the robot toward the target at (9,9) like a ball rolling into a valley. The repulsive force pushes the robot away from obstacles whenever distance <span className="font-mono">d &lt; d₀</span>.
        </p>

        <div className="mt-3 rounded bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-mono text-slate-700 space-y-1">
          <div>U_att = 0.5 · k_att · d_goal²</div>
          <div>U_rep = 0.5 · k_rep · (1/d − 1/d₀)²  (d &lt; d₀)</div>
          <div>U = U_att + Σ U_rep ,   F = −∇U</div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="slider-k-att" className="font-medium text-slate-700">
                Attractive Gain (k_att)
              </label>
              <span className="font-mono tabular-nums text-slate-900 font-semibold">
                {params.kAtt.toFixed(1)}
              </span>
            </div>
            <input
              id="slider-k-att"
              type="range"
              min={0.2}
              max={3.0}
              step={0.1}
              value={params.kAtt}
              onChange={(e) =>
                onParamsChange({ ...params, kAtt: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="slider-k-rep" className="font-medium text-slate-700">
                Repulsive Gain (k_rep)
              </label>
              <span className="font-mono tabular-nums text-slate-900 font-semibold">
                {params.kRep.toFixed(1)}
              </span>
            </div>
            <input
              id="slider-k-rep"
              type="range"
              min={0.0}
              max={6.0}
              step={0.2}
              value={params.kRep}
              onChange={(e) =>
                onParamsChange({ ...params, kRep: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor="slider-d0" className="font-medium text-slate-700">
                Obstacle Influence Radius (d₀)
              </label>
              <span className="font-mono tabular-nums text-slate-900 font-semibold">
                {params.d0.toFixed(1)} units
              </span>
            </div>
            <input
              id="slider-d0"
              type="range"
              min={0.8}
              max={3.0}
              step={0.1}
              value={params.d0}
              onChange={(e) =>
                onParamsChange({ ...params, d0: parseFloat(e.target.value) })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Gradient Demonstration */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            2. Live Gradient Demonstration
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            at ({robot.x.toFixed(2)}, {robot.y.toFixed(2)})
          </span>
        </div>

        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          The gradient <span className="font-mono">∇U = (∂U/∂x, ∂U/∂y)</span> points toward the steepest increase in potential. Taking its negative, <span className="font-mono">F = −∇U</span>, points downhill so the robot moves toward lower potential energy.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Total Potential U</div>
            <div
              data-testid="gradient-potential-value"
              className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900"
            >
              {robotSample.uTotal.toFixed(3)}
            </div>
            <div className="mt-1 text-xs font-mono tabular-nums text-slate-500">
              U_att {robotSample.uAtt.toFixed(2)} · U_rep {robotSample.uRep.toFixed(2)}
            </div>
          </div>

          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Negative Gradient (−∇U)</div>
            <div
              data-testid="negative-gradient-direction"
              className="mt-0.5 font-mono tabular-nums font-semibold text-indigo-700"
            >
              ({robotSample.forceX.toFixed(2)}, {robotSample.forceY.toFixed(2)})
            </div>
            <div className="mt-1 text-xs font-mono tabular-nums text-slate-500">
              Heading: {robotSample.angleDegrees.toFixed(1)}°
            </div>
          </div>

          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Gradient X (∂U/∂x)</div>
            <div
              data-testid="gradient-x-value"
              className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900"
            >
              {robotSample.gradX.toFixed(4)}
            </div>
          </div>

          <div className="rounded bg-slate-50 border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Gradient Y (∂U/∂y)</div>
            <div
              data-testid="gradient-y-value"
              className="mt-0.5 font-mono tabular-nums font-semibold text-slate-900"
            >
              {robotSample.gradY.toFixed(4)}
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Curl & Green's Theorem (Separate Rotational Field) */}
      <section className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900">
          3. Curl & Green&apos;s Theorem
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
          Separate rotational example: <span className="font-mono font-medium text-slate-800">F(x, y) = (−y, x)</span>. Unlike the potential-gradient navigation field (which has zero curl), this rotational field swirls counterclockwise.
        </p>

        <div className="mt-3 rounded bg-slate-50 border border-slate-200 p-3 text-xs font-mono tabular-nums text-slate-800 space-y-1">
          <div>P(x, y) = −y ,   Q(x, y) = x</div>
          <div>
            Curl = ∂Q/∂x − ∂P/∂y = {greens.dQdx.toFixed(4)} − ({greens.dPdy.toFixed(4)}) ={' '}
            <span className="font-semibold text-indigo-700">
              {greens.curlAtCenter.toFixed(4)}
            </span>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="rect-xmin" className="text-slate-600 font-medium">
                x_min
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {rectangle.xMin.toFixed(1)}
              </span>
            </div>
            <input
              id="rect-xmin"
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={rectangle.xMin}
              onChange={(e) => updateRect('xMin', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="rect-xmax" className="text-slate-600 font-medium">
                x_max
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {rectangle.xMax.toFixed(1)}
              </span>
            </div>
            <input
              id="rect-xmax"
              type="range"
              min={2}
              max={9}
              step={0.5}
              value={rectangle.xMax}
              onChange={(e) => updateRect('xMax', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="rect-ymin" className="text-slate-600 font-medium">
                y_min
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {rectangle.yMin.toFixed(1)}
              </span>
            </div>
            <input
              id="rect-ymin"
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={rectangle.yMin}
              onChange={(e) => updateRect('yMin', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="rect-ymax" className="text-slate-600 font-medium">
                y_max
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {rectangle.yMax.toFixed(1)}
              </span>
            </div>
            <input
              id="rect-ymax"
              type="range"
              min={2}
              max={9}
              step={0.5}
              value={rectangle.yMax}
              onChange={(e) => updateRect('yMax', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Step-by-step Green's theorem breakdown */}
        <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
          <div className="font-semibold text-slate-800">
            Step 1 — Line Integral ∮_C (P dx + Q dy)
          </div>
          <div className="space-y-1 font-mono tabular-nums text-slate-700">
            {greens.edges.map((edge) => (
              <div
                key={edge.id}
                className="flex items-center justify-between gap-2 py-0.5"
              >
                <span className="text-slate-600">
                  {edge.id} ({edge.description})
                </span>
                <span className="font-medium text-slate-900">
                  {edge.value >= 0 ? '+' : ''}
                  {edge.value.toFixed(4)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 font-semibold text-blue-700">
              <span>Sum ∮_C (P dx + Q dy)</span>
              <span>{greens.lineIntegral.toFixed(4)}</span>
            </div>
          </div>

          <div className="font-semibold text-slate-800 pt-2">
            Step 2 — Double Integral ∬_R (∂Q/∂x − ∂P/∂y) dA
          </div>
          <div className="font-mono tabular-nums text-slate-700 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                Area A = {(rectangle.xMax - rectangle.xMin).toFixed(1)} ×{' '}
                {(rectangle.yMax - rectangle.yMin).toFixed(1)}
              </span>
              <span>{greens.area.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-indigo-700">
              <span>∬_R (2.0000) dA</span>
              <span>{greens.doubleIntegral.toFixed(4)}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-mono tabular-nums">
            <span className="text-slate-600">
              |Line − Double| = {greens.absoluteDifference.toExponential(2)}
            </span>
            <span
              className={
                greens.agreesWithinTolerance
                  ? 'font-sans font-semibold text-emerald-700'
                  : 'font-sans font-semibold text-rose-700'
              }
            >
              {greens.agreesWithinTolerance
                ? '✓ Agrees (tol < 1e-4)'
                : '✕ Differs'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
