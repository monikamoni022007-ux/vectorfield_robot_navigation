export interface Point2D {
  x: number;
  y: number;
}

export interface NavigationParams {
  kAtt: number;
  kRep: number;
  d0: number;
  stepSize: number;
  obstacleRadius: number;
  goalTolerance: number;
}

export interface PotentialSample {
  uAtt: number;
  uRep: number;
  uTotal: number;
  gradX: number;
  gradY: number;
  forceX: number;
  forceY: number;
  forceMagnitude: number;
  angleDegrees: number;
}

export type RobotStatus =
  | 'ready'
  | 'navigating'
  | 'paused'
  | 'reached'
  | 'collided'
  | 'stuck';

export interface HistoryPoint {
  step: number;
  x: number;
  y: number;
  potential: number;
  distanceToGoal: number;
  minObstacleDistance: number;
}

export interface SimulationState {
  robot: Point2D;
  path: Point2D[];
  steps: number;
  status: RobotStatus;
  minObstacleDistanceRecorded: number;
  history: HistoryPoint[];
}

export interface RectangleBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface EdgeIntegralBreakdown {
  id: 'C1' | 'C2' | 'C3' | 'C4';
  label: string;
  description: string;
  value: number;
}

export interface GreensTheoremAnalysis {
  curlAtCenter: number;
  dQdx: number;
  dPdy: number;
  area: number;
  edges: EdgeIntegralBreakdown[];
  lineIntegral: number;
  doubleIntegral: number;
  absoluteDifference: number;
  tolerance: number;
  agreesWithinTolerance: boolean;
}

export const GRID_MIN = 0;
export const GRID_MAX = 10;

export const INITIAL_ROBOT: Point2D = { x: 1, y: 1 };
export const TARGET_POINT: Point2D = { x: 9, y: 9 };
export const OBSTACLES: Point2D[] = [
  { x: 3, y: 4 },
  { x: 5, y: 6 },
  { x: 7, y: 3 },
];

export const DEFAULT_PARAMS: NavigationParams = {
  kAtt: 1.0,
  kRep: 2.2,
  d0: 1.8,
  stepSize: 0.14,
  obstacleRadius: 0.35,
  goalTolerance: 0.25,
};

export const DEFAULT_RECTANGLE: RectangleBounds = {
  xMin: 2,
  xMax: 7,
  yMin: 2,
  yMax: 6,
};

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getMinObstacleDistance(
  point: Point2D,
  obstacles: Point2D[] = OBSTACLES
): number {
  let minDist = Infinity;
  for (const obs of obstacles) {
    const d = distance(point, obs);
    if (d < minDist) {
      minDist = d;
    }
  }
  return minDist;
}

/**
 * Attractive potential:
 * U_att = 0.5 * k_att * ||p - goal||^2
 */
export function computeAttractivePotential(
  point: Point2D,
  goal: Point2D,
  kAtt: number
): number {
  const dx = point.x - goal.x;
  const dy = point.y - goal.y;
  return 0.5 * kAtt * (dx * dx + dy * dy);
}

/**
 * Repulsive potential summed over all obstacles:
 * U_rep = 0.5 * k_rep * (1/d - 1/d0)^2 for d < d0, else 0.
 * Clamps very small d to avoid Infinity during finite difference evaluation.
 */
export function computeRepulsivePotential(
  point: Point2D,
  obstacles: Point2D[],
  kRep: number,
  d0: number
): number {
  let totalRep = 0;
  const safeMinDist = 0.05;
  for (const obs of obstacles) {
    const rawD = distance(point, obs);
    if (rawD < d0) {
      const d = Math.max(rawD, safeMinDist);
      const term = 1 / d - 1 / d0;
      totalRep += 0.5 * kRep * term * term;
    }
  }
  return totalRep;
}

/**
 * Total potential U = U_att + sum(U_rep)
 */
export function computeTotalPotential(
  point: Point2D,
  goal: Point2D,
  obstacles: Point2D[],
  params: NavigationParams
): { uAtt: number; uRep: number; uTotal: number } {
  const uAtt = computeAttractivePotential(point, goal, params.kAtt);
  const uRep = computeRepulsivePotential(
    point,
    obstacles,
    params.kRep,
    params.d0
  );
  return {
    uAtt,
    uRep,
    uTotal: uAtt + uRep,
  };
}

/**
 * Computes potential and numerical gradient via central finite differences:
 * dU/dx ≈ (U(x + h, y) - U(x - h, y)) / (2h)
 * dU/dy ≈ (U(x, y + h) - U(x, y - h)) / (2h)
 * F = -∇U
 */
export function evaluatePotentialField(
  point: Point2D,
  goal: Point2D = TARGET_POINT,
  obstacles: Point2D[] = OBSTACLES,
  params: NavigationParams = DEFAULT_PARAMS
): PotentialSample {
  const h = 1e-4;
  const { uAtt, uRep, uTotal } = computeTotalPotential(
    point,
    goal,
    obstacles,
    params
  );

  const uXPlus = computeTotalPotential(
    { x: point.x + h, y: point.y },
    goal,
    obstacles,
    params
  ).uTotal;
  const uXMinus = computeTotalPotential(
    { x: point.x - h, y: point.y },
    goal,
    obstacles,
    params
  ).uTotal;

  const uYPlus = computeTotalPotential(
    { x: point.x, y: point.y + h },
    goal,
    obstacles,
    params
  ).uTotal;
  const uYMinus = computeTotalPotential(
    { x: point.x, y: point.y - h },
    goal,
    obstacles,
    params
  ).uTotal;

  const gradX = (uXPlus - uXMinus) / (2 * h);
  const gradY = (uYPlus - uYMinus) / (2 * h);

  const forceX = -gradX;
  const forceY = -gradY;
  const forceMagnitude = Math.hypot(forceX, forceY);
  const angleDegrees =
    forceMagnitude > 1e-12
      ? (Math.atan2(forceY, forceX) * 180) / Math.PI
      : 0;

  return {
    uAtt,
    uRep,
    uTotal,
    gradX,
    gradY,
    forceX,
    forceY,
    forceMagnitude,
    angleDegrees,
  };
}

export function createInitialSimulationState(
  params: NavigationParams = DEFAULT_PARAMS
): SimulationState {
  const initialSample = evaluatePotentialField(
    INITIAL_ROBOT,
    TARGET_POINT,
    OBSTACLES,
    params
  );
  const distGoal = distance(INITIAL_ROBOT, TARGET_POINT);
  const minObs = getMinObstacleDistance(INITIAL_ROBOT, OBSTACLES);
  return {
    robot: { ...INITIAL_ROBOT },
    path: [{ ...INITIAL_ROBOT }],
    steps: 0,
    status: 'ready',
    minObstacleDistanceRecorded: minObs,
    history: [
      {
        step: 0,
        x: INITIAL_ROBOT.x,
        y: INITIAL_ROBOT.y,
        potential: initialSample.uTotal,
        distanceToGoal: distGoal,
        minObstacleDistance: minObs,
      },
    ],
  };
}

/**
 * Advances the robot by one discrete step along the normalized negative gradient F = -∇U.
 * Evaluates reached, collided, or stuck (local minimum / oscillation) conditions.
 */
export function stepSimulation(
  state: SimulationState,
  params: NavigationParams = DEFAULT_PARAMS,
  goal: Point2D = TARGET_POINT,
  obstacles: Point2D[] = OBSTACLES
): SimulationState {
  if (
    state.status === 'reached' ||
    state.status === 'collided' ||
    state.status === 'stuck'
  ) {
    return state;
  }

  const currentDistToGoal = distance(state.robot, goal);
  if (currentDistToGoal <= params.goalTolerance) {
    return { ...state, status: 'reached' };
  }

  const currentMinObs = getMinObstacleDistance(state.robot, obstacles);
  if (currentMinObs <= params.obstacleRadius) {
    return { ...state, status: 'collided' };
  }

  const sample = evaluatePotentialField(state.robot, goal, obstacles, params);

  // Detect vanishing gradient (local minimum) away from target
  if (sample.forceMagnitude < 1e-3) {
    return { ...state, status: 'stuck' };
  }

  // Move along negative gradient direction; cap step by remaining distance to goal
  const stepLength = Math.min(params.stepSize, currentDistToGoal);
  const dirX = sample.forceX / sample.forceMagnitude;
  const dirY = sample.forceY / sample.forceMagnitude;

  const nextX = Math.max(
    GRID_MIN,
    Math.min(GRID_MAX, state.robot.x + dirX * stepLength)
  );
  const nextY = Math.max(
    GRID_MIN,
    Math.min(GRID_MAX, state.robot.y + dirY * stepLength)
  );
  const nextRobot: Point2D = { x: nextX, y: nextY };
  const nextSteps = state.steps + 1;
  const nextPath = [...state.path, nextRobot];

  const nextDistGoal = distance(nextRobot, goal);
  const nextMinObs = getMinObstacleDistance(nextRobot, obstacles);
  const nextMinRecorded = Math.min(state.minObstacleDistanceRecorded, nextMinObs);
  const nextSample = evaluatePotentialField(nextRobot, goal, obstacles, params);

  let nextStatus: RobotStatus =
    state.status === 'paused' ? 'paused' : 'navigating';

  if (nextMinObs <= params.obstacleRadius) {
    nextStatus = 'collided';
  } else if (nextDistGoal <= params.goalTolerance) {
    nextStatus = 'reached';
  } else if (nextSample.forceMagnitude < 1e-3) {
    nextStatus = 'stuck';
  } else if (nextPath.length >= 20) {
    // Detect tight oscillation / trapped state over recent 16 steps
    const recentAnchor = nextPath[nextPath.length - 16];
    const netProgress = distance(nextRobot, recentAnchor);
    if (netProgress < params.stepSize * 0.5) {
      nextStatus = 'stuck';
    }
  } else if (nextSteps >= 600) {
    nextStatus = 'stuck';
  }

  return {
    robot: nextRobot,
    path: nextPath,
    steps: nextSteps,
    status: nextStatus,
    minObstacleDistanceRecorded: nextMinRecorded,
    history: [
      ...state.history,
      {
        step: nextSteps,
        x: nextRobot.x,
        y: nextRobot.y,
        potential: nextSample.uTotal,
        distanceToGoal: nextDistGoal,
        minObstacleDistance: nextMinObs,
      },
    ],
  };
}

/**
 * Separate rotational vector field: F(x, y) = (P(x, y), Q(x, y)) = (-y, x)
 */
export function rotationalField(x: number, y: number): { P: number; Q: number } {
  return {
    P: -y,
    Q: x,
  };
}

/**
 * Numerical curl at (x, y) via central finite differences:
 * Curl = ∂Q/∂x - ∂P/∂y
 */
export function computeNumericalCurl(x: number, y: number): {
  dQdx: number;
  dPdy: number;
  curl: number;
} {
  const h = 1e-4;
  const dQdx = (rotationalField(x + h, y).Q - rotationalField(x - h, y).Q) / (2 * h);
  const dPdy = (rotationalField(x, y + h).P - rotationalField(x, y - h).P) / (2 * h);
  return {
    dQdx,
    dPdy,
    curl: dQdx - dPdy,
  };
}

/**
 * Computes Green's theorem verification on the rotational field F(x, y) = (-y, x)
 * over a closed counterclockwise rectangular boundary [xMin, xMax] x [yMin, yMax]:
 * ∮_C (P dx + Q dy) = ∬_R (∂Q/∂x - ∂P/∂y) dA
 */
export function analyzeGreensTheorem(
  rect: RectangleBounds = DEFAULT_RECTANGLE,
  segmentsPerEdge: number = 200,
  gridSamplesPerAxis: number = 40,
  tolerance: number = 1e-4
): GreensTheoremAnalysis {
  const xMin = Math.min(rect.xMin, rect.xMax);
  const xMax = Math.max(rect.xMin, rect.xMax);
  const yMin = Math.min(rect.yMin, rect.yMax);
  const yMax = Math.max(rect.yMin, rect.yMax);

  const dx = (xMax - xMin) / segmentsPerEdge;
  const dy = (yMax - yMin) / segmentsPerEdge;

  // C1: Bottom edge (xMin -> xMax, y = yMin, dy = 0)
  let c1 = 0;
  for (let i = 0; i < segmentsPerEdge; i++) {
    const xMid = xMin + (i + 0.5) * dx;
    c1 += rotationalField(xMid, yMin).P * dx;
  }

  // C2: Right edge (x = xMax, yMin -> yMax, dx = 0)
  let c2 = 0;
  for (let i = 0; i < segmentsPerEdge; i++) {
    const yMid = yMin + (i + 0.5) * dy;
    c2 += rotationalField(xMax, yMid).Q * dy;
  }

  // C3: Top edge (xMax -> xMin, y = yMax, dy = 0)
  let c3 = 0;
  for (let i = 0; i < segmentsPerEdge; i++) {
    const xMid = xMax - (i + 0.5) * dx;
    c3 += rotationalField(xMid, yMax).P * -dx;
  }

  // C4: Left edge (x = xMin, yMax -> yMin, dx = 0)
  let c4 = 0;
  for (let i = 0; i < segmentsPerEdge; i++) {
    const yMid = yMax - (i + 0.5) * dy;
    c4 += rotationalField(xMin, yMid).Q * -dy;
  }

  const lineIntegral = c1 + c2 + c3 + c4;

  // Double integral of curl over R using 2D midpoint quadrature
  const cellDx = (xMax - xMin) / gridSamplesPerAxis;
  const cellDy = (yMax - yMin) / gridSamplesPerAxis;
  const cellArea = cellDx * cellDy;
  let doubleIntegral = 0;

  for (let ix = 0; ix < gridSamplesPerAxis; ix++) {
    const xMid = xMin + (ix + 0.5) * cellDx;
    for (let iy = 0; iy < gridSamplesPerAxis; iy++) {
      const yMid = yMin + (iy + 0.5) * cellDy;
      doubleIntegral += computeNumericalCurl(xMid, yMid).curl * cellArea;
    }
  }

  const centerCurl = computeNumericalCurl((xMin + xMax) / 2, (yMin + yMax) / 2);
  const area = (xMax - xMin) * (yMax - yMin);
  const absoluteDifference = Math.abs(lineIntegral - doubleIntegral);

  return {
    curlAtCenter: centerCurl.curl,
    dQdx: centerCurl.dQdx,
    dPdy: centerCurl.dPdy,
    area,
    edges: [
      {
        id: 'C1',
        label: 'Bottom Edge',
        description: `y = ${yMin.toFixed(1)}, x: ${xMin.toFixed(1)} → ${xMax.toFixed(1)}`,
        value: c1,
      },
      {
        id: 'C2',
        label: 'Right Edge',
        description: `x = ${xMax.toFixed(1)}, y: ${yMin.toFixed(1)} → ${yMax.toFixed(1)}`,
        value: c2,
      },
      {
        id: 'C3',
        label: 'Top Edge',
        description: `y = ${yMax.toFixed(1)}, x: ${xMax.toFixed(1)} → ${xMin.toFixed(1)}`,
        value: c3,
      },
      {
        id: 'C4',
        label: 'Left Edge',
        description: `x = ${xMin.toFixed(1)}, y: ${yMax.toFixed(1)} → ${yMin.toFixed(1)}`,
        value: c4,
      },
    ],
    lineIntegral,
    doubleIntegral,
    absoluteDifference,
    tolerance,
    agreesWithinTolerance: absoluteDifference <= tolerance,
  };
}
