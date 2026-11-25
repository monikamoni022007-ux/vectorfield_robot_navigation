import React from 'react';
import {
  GreensTheoremAnalysis,
  RobotStatus,
  SimulationState,
  TARGET_POINT,
  distance,
  getMinObstacleDistance,
} from '../math/vectorCalculus';

interface ResultsSectionProps {
  simState: SimulationState;
  greens: GreensTheoremAnalysis;
}

function formatStatusLabel(status: RobotStatus): {
  text: string;
  colorClass: string;
} {
  switch (status) {
    case 'ready':
      return { text: '● Ready at Start', colorClass: 'text-slate-700' };
    case 'navigating':
      return { text: '● Navigating Field', colorClass: 'text-blue-700' };
    case 'paused':
      return { text: '■ Paused', colorClass: 'text-slate-700' };
    case 'reached':
      return { text: '✓ Reached Target', colorClass: 'text-emerald-700' };
    case 'collided':
      return { text: '✕ Collided with Obstacle', colorClass: 'text-rose-700' };
    case 'stuck':
      return { text: '▲ Stuck in Local Minimum', colorClass: 'text-amber-700' };
  }
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  simState,
  greens,
}) => {
  const distToTarget = distance(simState.robot, TARGET_POINT);
  const currentMinObs = getMinObstacleDistance(simState.robot);
  const statusInfo = formatStatusLabel(simState.status);

  return (
    <section
      aria-labelledby="results-heading"
      className="bg-white border border-slate-200 rounded-lg p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div>
          <h2 id="results-heading" className="text-base font-semibold text-slate-900">
            Experiment Results
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live computed telemetry from the navigation trajectory and Green&apos;s theorem integration
          </p>
        </div>
        <div
          data-testid="robot-status-text"
          className={`text-sm font-semibold ${statusInfo.colorClass}`}
        >
          {statusInfo.text}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Navigation Steps</div>
          <div
            data-testid="result-steps"
            className="mt-1 text-xl font-mono tabular-nums font-semibold text-slate-900"
          >
            {simState.steps}
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Final / Current Robot Position</div>
          <div
            data-testid="result-position"
            className="mt-1 text-xl font-mono tabular-nums font-semibold text-slate-900"
          >
            ({simState.robot.x.toFixed(2)}, {simState.robot.y.toFixed(2)})
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Distance to Target</div>
          <div
            data-testid="result-target-distance"
            className="mt-1 text-xl font-mono tabular-nums font-semibold text-slate-900"
          >
            {distToTarget.toFixed(3)}
            <span className="text-xs font-normal text-slate-500 ml-1">units</span>
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Minimum Obstacle Distance</div>
          <div
            data-testid="result-min-obstacle-distance"
            className="mt-1 text-xl font-mono tabular-nums font-semibold text-slate-900"
          >
            {simState.minObstacleDistanceRecorded.toFixed(3)}
            <span className="text-xs font-normal text-slate-500 ml-1">
              (now {currentMinObs.toFixed(2)})
            </span>
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Curl Value (∂Q/∂x − ∂P/∂y)</div>
          <div
            data-testid="result-curl"
            className="mt-1 text-xl font-mono tabular-nums font-semibold text-indigo-700"
          >
            {greens.curlAtCenter.toFixed(4)}
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Line Integral ∮_C (P dx + Q dy)</div>
          <div
            data-testid="result-line-integral"
            className="mt-1 text-xl font-mono tabular-nums font-semibold text-blue-700"
          >
            {greens.lineIntegral.toFixed(4)}
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Double Integral ∬_R Curl dA</div>
          <div
            data-testid="result-double-integral"
            className="mt-1 text-xl font-mono tabular-nums font-semibold text-indigo-700"
          >
            {greens.doubleIntegral.toFixed(4)}
          </div>
        </div>

        <div className="border border-slate-200 rounded p-3 bg-slate-50/70">
          <div className="text-xs text-slate-500">Green&apos;s Theorem Verification</div>
          <div
            data-testid="result-greens-verification"
            className={`mt-1 text-base font-semibold ${
              greens.agreesWithinTolerance ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {greens.agreesWithinTolerance
              ? '✓ Verified (Agree)'
              : '✕ Discrepancy'}
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
            Δ = {greens.absoluteDifference.toExponential(2)}
          </div>
        </div>
      </div>
    </section>
  );
};
