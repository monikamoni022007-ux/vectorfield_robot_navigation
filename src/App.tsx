import { useEffect, useMemo, useState } from 'react';
import { Play, Pause, RotateCcw, StepForward } from 'lucide-react';
import {
  DEFAULT_PARAMS,
  DEFAULT_RECTANGLE,
  NavigationParams,
  OBSTACLES,
  RectangleBounds,
  SimulationState,
  TARGET_POINT,
  analyzeGreensTheorem,
  createInitialSimulationState,
  evaluatePotentialField,
  stepSimulation,
} from './math/vectorCalculus';
import { FieldMode, SimulationCanvas } from './components/SimulationCanvas';
import { HistoryChartCanvas } from './components/HistoryChartCanvas';
import { ControlAndMathPanel } from './components/ControlAndMathPanel';
import { ResultsSection } from './components/ResultsSection';

export default function App() {
  const [params, setParams] = useState<NavigationParams>(DEFAULT_PARAMS);
  const [simState, setSimState] = useState<SimulationState>(() =>
    createInitialSimulationState(DEFAULT_PARAMS)
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [mode, setMode] = useState<FieldMode>('navigation');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [rectangle, setRectangle] = useState<RectangleBounds>(DEFAULT_RECTANGLE);

  const robotSample = useMemo(
    () =>
      evaluatePotentialField(
        simState.robot,
        TARGET_POINT,
        OBSTACLES,
        params
      ),
    [simState.robot, params]
  );

  const greens = useMemo(
    () => analyzeGreensTheorem(rectangle),
    [rectangle]
  );

  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setSimState((prev) => {
        const next = stepSimulation(prev, params);
        if (
          next.status === 'reached' ||
          next.status === 'collided' ||
          next.status === 'stuck'
        ) {
          setIsRunning(false);
        }
        return next;
      });
    }, 65);

    return () => window.clearInterval(timer);
  }, [isRunning, params]);

  const handleStart = () => {
    setMode('navigation');
    setSimState((prev) => {
      if (
        prev.status === 'reached' ||
        prev.status === 'collided' ||
        prev.status === 'stuck'
      ) {
        return { ...createInitialSimulationState(params), status: 'navigating' };
      }
      return { ...prev, status: 'navigating' };
    });
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    setSimState((prev) =>
      prev.status === 'navigating' ? { ...prev, status: 'paused' } : prev
    );
  };

  const handleReset = () => {
    setIsRunning(false);
    setSimState(createInitialSimulationState(params));
  };

  const handleStep = () => {
    setMode('navigation');
    setIsRunning(false);
    setSimState((prev) => stepSimulation(prev, params));
  };

  const isTerminal =
    simState.status === 'reached' ||
    simState.status === 'collided' ||
    simState.status === 'stuck';

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      data-sim-status={simState.status}
    >
      {/* Clean scientific laboratory header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5 sm:gap-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Vector Field Visualization and Circulation Analysis for Robotic Navigation
          </h1>
          <div className="text-xs text-slate-500 sm:whitespace-nowrap shrink-0">
            Applied Mathematics Lab · Potential Fields, Curl &amp; Green&apos;s Theorem
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Interactive Canvas Stage */}
          <div className="lg:col-span-7 space-y-4">
            <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5">
              {/* Mode switcher & Layer toggles */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
                <div
                  role="tablist"
                  aria-label="Vector field visualization mode"
                  className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md max-w-full"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'navigation'}
                    onClick={() => setMode('navigation')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                      mode === 'navigation'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Potential Field (Navigation)
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'rotational'}
                    onClick={() => setMode('rotational')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 ${
                      mode === 'rotational'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rotational Field (Curl &amp; Green&apos;s)
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  {mode === 'navigation' && (
                    <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={showHeatmap}
                        onChange={(e) => setShowHeatmap(e.target.checked)}
                        className="accent-blue-600 rounded"
                      />
                      Potential Heatmap
                    </label>
                  )}
                  <label className="inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={showVectors}
                      onChange={(e) => setShowVectors(e.target.checked)}
                      className="accent-blue-600 rounded"
                    />
                    Vector Arrows
                  </label>
                </div>
              </div>

              {mode === 'rotational' && (
                <div className="mb-4 rounded bg-indigo-50/70 border border-indigo-200 px-3.5 py-2.5 text-xs text-indigo-950">
                  <span className="font-semibold">Separate Example:</span> Displaying rotational vector field{' '}
                  <span className="font-mono">F(x, y) = (−y, x)</span> and closed rectangular boundary{' '}
                  <span className="font-mono">C</span>. Robot potential-field navigation uses{' '}
                  <span className="font-mono">F = −∇U</span> in the first tab.
                </div>
              )}

              {/* 2D Coordinate Grid Canvas */}
              <SimulationCanvas
                mode={mode}
                simState={simState}
                params={params}
                showHeatmap={showHeatmap}
                showVectors={showVectors}
                rectangle={rectangle}
                robotSample={robotSample}
              />

              {/* Legend */}
              {mode === 'navigation' ? (
                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" aria-hidden="true" />
                    Robot (start 1,1)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" aria-hidden="true" />
                    Target (9,9)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" aria-hidden="true" />
                    Obstacles (3,4), (5,6), (7,3)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-blue-600 inline-block" aria-hidden="true" />
                    Force F = −∇U
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-indigo-600 inline-block" aria-hidden="true" />
                    Robot Path
                  </span>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-blue-600 inline-block" aria-hidden="true" />
                    Rotational Field F(x,y) = (−y, x)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3.5 h-0.5 bg-indigo-600 inline-block" aria-hidden="true" />
                    Closed Boundary C (CCW)
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-indigo-600/15 border border-indigo-400 inline-block" aria-hidden="true" />
                    Enclosed Region R
                  </span>
                </div>
              )}

              {/* Robot Movement Controls */}
              <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isRunning}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    {isTerminal ? 'Run Again' : 'Start'}
                  </button>

                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={!isRunning}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                  >
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    Pause
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleStep}
                    disabled={isRunning || isTerminal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
                  >
                    <StepForward className="w-3.5 h-3.5" aria-hidden="true" />
                    Move One Step
                  </button>
                </div>

                <div className="text-xs font-mono tabular-nums text-slate-600">
                  Step {simState.steps} · Pos ({simState.robot.x.toFixed(2)},{' '}
                  {simState.robot.y.toFixed(2)})
                </div>
              </div>
            </section>

            {/* Live Trajectory Telemetry Graph */}
            <section className="bg-white border border-slate-200 rounded-lg p-5">
              <HistoryChartCanvas history={simState.history} />
            </section>
          </div>

          {/* Right Mathematical Controls & Explanations Deck */}
          <div className="lg:col-span-5">
            <ControlAndMathPanel
              params={params}
              onParamsChange={setParams}
              robot={simState.robot}
              robotSample={robotSample}
              rectangle={rectangle}
              onRectangleChange={setRectangle}
              greens={greens}
            />
          </div>
        </div>

        {/* Dedicated Experiment Results Section */}
        <ResultsSection simState={simState} greens={greens} />
      </main>
    </div>
  );
}
