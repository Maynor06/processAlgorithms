// src/Components/Algorithms/SJF.ts
// ===== SJF (Shortest Job First, NO expropiativo) =====

import type {
  Process,
  ExecutionStep,
  ProcessResult,
  QueueSnapshot
} from "./common";

import { TIME_UNIT } from "./common";

// ===== Utilidad: criterio SJF (no expropiativo) =====
// Elige el más corto; en empate: llegada más temprana, luego PID menor.
function betterCandidate(a: Process, b: Process, remaining: Record<number, number>): Process {
  const ra = remaining[a.pid];
  const rb = remaining[b.pid];
  if (ra < rb) return a;
  if (rb < ra) return b;
  if (a.arrivalTime < b.arrivalTime) return a;
  if (b.arrivalTime < a.arrivalTime) return b;
  return a.pid <= b.pid ? a : b;
}

// ===== Motor "offline" (pruebas rápidas) =====
export function runSJF(processes: Process[]): { history: ExecutionStep[]; results: ProcessResult[] } {
  const procs = processes.map(p => ({ ...p }));
  const remaining: Record<number, number> = {};
  procs.forEach(p => (remaining[p.pid] = p.burstTime));

  const totalBurst = procs.reduce((a, p) => a + p.burstTime, 0);
  const ready: Process[] = [];
  const finished = new Set<number>();
  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  let t = 0, executed = 0;
  let current: Process | null = null; // ✅ mantiene el proceso hasta acabar

  const enqueueArrivals = () => {
    for (const p of procs) if (p.arrivalTime === t) ready.push(p);
  };

  while (executed < totalBurst) {
    enqueueArrivals();

    // snapshot ordenado de la cola ANTES de correr el tick (criterio SJF)
    const ordered = [...ready].sort((a, b) => {
      const ra = remaining[a.pid], rb = remaining[b.pid];
      if (ra !== rb) return ra - rb;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.pid - b.pid;
    });
    const queueBefore: QueueSnapshot = ordered.map(p => p.pid);

    // Elegir SOLO si no hay proceso actual (no expropiativo)
    if (!current && ready.length) {
      current = ready.reduce((best, p) => betterCandidate(best, p, remaining));
    }

    if (current) {
      // Ejecuta un tick del proceso actual
      remaining[current.pid] -= 1;
      executed += 1;

      history.push({
        time: t,
        processId: current.pid,
        processName: current.name,
        remainingTime: remaining[current.pid],
        queueBefore
      });

      // ¿Terminó?
      if (remaining[current.pid] === 0) {
        const finishTime = t + 1;
        const Tr = finishTime - current.arrivalTime;
        const Te = Tr - current.burstTime;
        const Is = Tr > 0 ? current.burstTime / Tr : 0;
        results.push({
          pid: current.pid, name: current.name,
          arrivalTime: current.arrivalTime, burstTime: current.burstTime,
          finishTime, turnaroundTime: Tr, waitingTime: Te, serviceIndex: Is
        });
        finished.add(current.pid);
        const idx = ready.findIndex(p => p.pid === current!.pid);
        if (idx !== -1) ready.splice(idx, 1);
        current = null; // ✅ libera CPU para elegir el siguiente
      }

      t += 1;
    } else {
      // CPU ociosa: saltar al próximo arribo
      const nextArrival = procs
        .filter(p => !finished.has(p.pid) && remaining[p.pid] > 0 && p.arrivalTime >= t)
        .reduce<number | null>((min, p) => (min === null ? p.arrivalTime : Math.min(min, p.arrivalTime)), null);
      if (nextArrival === null) break;
      if (nextArrival > t) t = nextArrival;
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return { history, results };
}

// ===== Motor incremental con "addProcess" y callbacks =====
type StepCb = (step: ExecutionStep) => void;
type FinishCb = (result: ProcessResult) => void;
type CompleteCb = (finalResults: ProcessResult[]) => void;

export function createSJFEngine(opts?: { startTime?: number }) {
  let t = opts?.startTime ?? 0;
  const remaining: Record<number, number> = {};
  const ready: Process[] = [];
  const all: Map<number, Process> = new Map();
  const finished = new Set<number>();
  const results: ProcessResult[] = [];

  let totalBurst = 0;
  let executed = 0;

  let onStep: StepCb | null = null;
  let onFinish: FinishCb | null = null;
  let onComplete: CompleteCb | null = null;

  let current: Process | null = null; // ✅ proceso en ejecución (no expropiativo)

  function addProcess(p: Process) {
    if (all.has(p.pid)) return;
    all.set(p.pid, { ...p });
    remaining[p.pid] = p.burstTime;
    totalBurst += p.burstTime;
    if (p.arrivalTime <= t) ready.push(p);
  }

  function enqueueArrivalsAt(time: number) {
    for (const p of all.values()) {
      if (p.arrivalTime === time) {
        if (!ready.find(r => r.pid === p.pid) && remaining[p.pid] > 0) {
          ready.push(p);
        }
      }
    }
  }

  function orderedQueueSnapshot(): QueueSnapshot {
    const ordered = [...ready].sort((a, b) => {
      const ra = remaining[a.pid], rb = remaining[b.pid];
      if (ra !== rb) return ra - rb;
      if (a.arrivalTime !== b.arrivalTime) return a.arrivalTime - b.arrivalTime;
      return a.pid - b.pid;
    });
    return ordered.map(p => p.pid);
  }

  function pick(): Process | null {
    if (!ready.length) return null;
    return ready.reduce((best, p) => betterCandidate(best, p, remaining));
  }

  function tick(): boolean {
    enqueueArrivalsAt(t);

    const queueBefore = orderedQueueSnapshot();

    // Elegir sólo si no hay actual
    if (!current) current = pick();

    if (current) {
      remaining[current.pid] -= 1;
      executed += 1;

      onStep?.({
        time: t,
        processId: current.pid,
        processName: current.name,
        remainingTime: remaining[current.pid],
        queueBefore
      });

      if (remaining[current.pid] === 0) {
        const finishTime = t + 1;
        const Tr = finishTime - current.arrivalTime;
        const Te = Tr - current.burstTime;
        const Is = Tr > 0 ? current.burstTime / Tr : 0;
        const res: ProcessResult = {
          pid: current.pid, name: current.name,
          arrivalTime: current.arrivalTime, burstTime: current.burstTime,
          finishTime, turnaroundTime: Tr, waitingTime: Te, serviceIndex: Is
        };
        results.push(res);
        onFinish?.(res);
        finished.add(current.pid);
        const idx = ready.findIndex(p => p.pid === current!.pid);
        if (idx !== -1) ready.splice(idx, 1);
        current = null; // ✅ listo para elegir el siguiente
      }

      t += 1;
    } else {
      // Saltar al próximo arribo si no hay listos
      const nextArrival = Array.from(all.values())
        .filter(p => !finished.has(p.pid) && remaining[p.pid] > 0 && p.arrivalTime >= t)
        .reduce<number | null>((min, p) => (min === null ? p.arrivalTime : Math.min(min, p.arrivalTime)), null);
      if (nextArrival !== null && nextArrival > t) t = nextArrival;
    }

    const done = executed >= totalBurst;
    if (done) {
      results.sort((a, b) => a.name.localeCompare(b.name));
      onComplete?.(results.slice());
    }
    return done;
  }

  return {
    addProcess,
    tick,
    now: () => t,
    stats: () => ({ executed, totalBurst }),
    onStep: (cb: StepCb | null) => (onStep = cb),
    onFinish: (cb: FinishCb | null) => (onFinish = cb),
    onComplete: (cb: CompleteCb | null) => (onComplete = cb),
  };
}
