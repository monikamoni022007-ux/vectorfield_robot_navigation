import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PARAMS,
  DEFAULT_RECTANGLE,
  INITIAL_ROBOT,
  OBSTACLES,
  TARGET_POINT,
  analyzeGreensTheorem,
  computeAttractivePotential,
  computeNumericalCurl,
  computeRepulsivePotential,
  createInitialSimulationState,
  distance,
  evaluatePotentialField,
  stepSimulation,
} from './vectorCalculus';

test('attractive potential matches 0.5 * k_att * d^2', () => {
  const u = computeAttractivePotential({ x: 6, y: 5 }, { x: 9, y: 9 }, 2.0);
  // dx = -3, dy = -4 => d^2 = 25 => 0.5 * 2 * 25 = 25
  assert.equal(u, 25);
});

test('repulsive potential is zero outside influence distance d0 and positive inside', () => {
  const obs = [{ x: 3, y: 4 }];
  assert.equal(computeRepulsivePotential({ x: 3, y: 6 }, obs, 2.0, 1.5), 0);
  const d = 1.0;
  const d0 = 2.0;
  const expected = 0.5 * 3.0 * Math.pow(1 / d - 1 / d0, 2);
  const actual = computeRepulsivePotential({ x: 3, y: 5 }, obs, 3.0, d0);
  assert.ok(Math.abs(actual - expected) < 1e-12);
});

test('numerical gradient matches analytical gradient away from obstacles', () => {
  const p = { x: 1, y: 1 };
  const sample = evaluatePotentialField(p, TARGET_POINT, OBSTACLES, DEFAULT_PARAMS);
  // At (1, 1), all obstacles are > 2.8 away (> d0 = 1.8), so only U_att contributes.
  // dU/dx = kAtt * (1 - 9) = -8, dU/dy = kAtt * (1 - 9) = -8
  assert.ok(Math.abs(sample.gradX - -8 * DEFAULT_PARAMS.kAtt) < 1e-6);
  assert.ok(Math.abs(sample.gradY - -8 * DEFAULT_PARAMS.kAtt) < 1e-6);
  assert.ok(Math.abs(sample.forceX - 8 * DEFAULT_PARAMS.kAtt) < 1e-6);
  assert.ok(Math.abs(sample.forceY - 8 * DEFAULT_PARAMS.kAtt) < 1e-6);
});

test('robot successfully navigates from (1,1) to (9,9) avoiding all 3 obstacles with default parameters', () => {
  let sim = createInitialSimulationState(DEFAULT_PARAMS);
  assert.deepEqual(sim.robot, INITIAL_ROBOT);

  for (let i = 0; i < 200; i++) {
    if (sim.status === 'reached' || sim.status === 'collided' || sim.status === 'stuck') {
      break;
    }
    sim = stepSimulation(sim, DEFAULT_PARAMS);
  }

  assert.equal(sim.status, 'reached');
  assert.ok(distance(sim.robot, TARGET_POINT) <= DEFAULT_PARAMS.goalTolerance);
  assert.ok(sim.minObstacleDistanceRecorded > DEFAULT_PARAMS.obstacleRadius);
  assert.ok(sim.steps > 10 && sim.steps < 150);
});

test('robot detects collision when repulsive force is disabled (kRep = 0) and obstacle is on path', () => {
  const noRepParams = { ...DEFAULT_PARAMS, kRep: 0 };
  let sim = createInitialSimulationState(noRepParams);
  // Move straight toward (9,9) from (2.8, 3.8) near obstacle (3,4)
  sim = {
    ...sim,
    robot: { x: 2.8, y: 3.8 },
    path: [{ x: 2.8, y: 3.8 }],
  };
  for (let i = 0; i < 20; i++) {
    sim = stepSimulation(sim, noRepParams);
    if (sim.status === 'collided') break;
  }
  assert.equal(sim.status, 'collided');
});

test('rotational field F(x, y) = (-y, x) has curl = 2 everywhere', () => {
  const c1 = computeNumericalCurl(0, 0);
  const c2 = computeNumericalCurl(4.2, 7.8);
  assert.ok(Math.abs(c1.dQdx - 1) < 1e-6);
  assert.ok(Math.abs(c1.dPdy - -1) < 1e-6);
  assert.ok(Math.abs(c1.curl - 2) < 1e-6);
  assert.ok(Math.abs(c2.curl - 2) < 1e-6);
});

test('Greens theorem line integral and double integral agree for F(x,y)=(-y,x)', () => {
  const result = analyzeGreensTheorem(DEFAULT_RECTANGLE);
  const expectedArea = (7 - 2) * (6 - 2); // 20
  assert.equal(result.area, expectedArea);
  assert.ok(Math.abs(result.lineIntegral - 2 * expectedArea) < 1e-6);
  assert.ok(Math.abs(result.doubleIntegral - 2 * expectedArea) < 1e-6);
  assert.equal(result.agreesWithinTolerance, true);
});
