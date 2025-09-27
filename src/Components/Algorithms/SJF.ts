// src/Components/Algorithms/SJF.ts

import type {
  Process,
  ExecutionStep,
  ProcessResult,
  QueueSnapshot,
} from "./common";

import { TIME_UNIT } from "./common";

// ===== Utilidad: comparar procesos SJF (no expropiativo) =====
function betterCandidate(a: Process, b: Process): Process {
  if (a.burstTime < b.burstTime) return a;
  if (b.burstTime < a.burstTime) return b;
  if (a.arrivalTime < b.arrivalTime) return a;
  if (b.arrivalTime < a.arrivalTime) return b;
  return a.pid <= b.pid ? a : b;
}

// ===== Motor "offline" (ejecuta todo de golpe) =====
export function runSJF(
  processes: Process[]
): { history: ExecutionStep[]; results: ProcessResult[] } {
  const procs = processes.map((p) => ({ ...p }));
  const ready: Process[] = [];
  const finished = new Set<number>();
  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  let t = 0;
  let executed = 0;
  const totalBurst = procs.reduce((a, p) => a + p.burstTime, 0);

  while (executed < totalBurst) {
    // Encolar procesos que llegan en este tick
    for (const p of procs) {
      if (p.arrivalTime === t) ready.push(p);
    }

    if (!ready.length) {
      t++;
      continue;
    }

    // Selección por SJF
    const current = ready.reduce((best, p) => betterCandidate(best, p));

    // snapshot de cola ANTES de ejecutar
    const queueBefore: QueueSnapshot = [
      current.pid,
      ...ready.filter((p) => p.pid !== current.pid).map((p) => p.pid),
    ];

    // Ejecutar todo el burst de current
    for (let i = 0; i < current.burstTime; i++) {
      history.push({
        time: t,
        processId: current.pid,
        processName: current.name,
        remainingTime: current.burstTime - i - 1,
        queueBefore,
      });
      t++;
      executed++;
      // Encolar procesos que lleguen mientras ejecuta
      for (const p of procs) {
        if (p.arrivalTime === t) ready.push(p);
      }
    }

    // Termina el proceso
    const finishTime = t;
    const Tr = finishTime - current.arrivalTime;
    const Te = Tr - current.burstTime;
    const Is = Tr > 0 ? current.burstTime / Tr : 0;

    results.push({
      pid: current.pid,
      name: current.name,
      arrivalTime: current.arrivalTime,
      burstTime: current.burstTime,
      finishTime,
      turnaroundTime: Tr,
      waitingTime: Te,
      serviceIndex: Is,
    });

    finished.add(current.pid);
    const idx = ready.findIndex((p) => p.pid === current.pid);
    if (idx !== -1) ready.splice(idx, 1);
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return { history, results };
}

// ===== Motor incremental con addProcess y callbacks =====
type StepCb = (step: ExecutionStep) => void;
type FinishCb = (result: ProcessResult) => void;
type CompleteCb = (finalResults: ProcessResult[]) => void;

export function createSJFEngine(opts?: { startTime?: number }) {
  let t = opts?.startTime ?? 0;
  const ready: Process[] = [];
  const all: Map<number, Process> = new Map();
  const finished = new Set<number>();
  const results: ProcessResult[] = [];

  let executed = 0;
  let totalBurst = 0;
  let current: Process | null = null;
  let remainingTime = 0;

  let onStep: StepCb | null = null;
  let onFinish: FinishCb | null = null;
  let onComplete: CompleteCb | null = null;

  function addProcess(p: Process) {
    if (all.has(p.pid)) return;
    all.set(p.pid, { ...p });
    totalBurst += p.burstTime;
    if (p.arrivalTime <= t) ready.push(p);
  }

  function enqueueArrivalsAt(time: number) {
    for (const p of all.values()) {
      if (p.arrivalTime === time) {
        if (!ready.find((r) => r.pid === p.pid) && !finished.has(p.pid)) {
          ready.push(p);
        }
      }
    }
  }

  function orderedQueueSnapshot(): QueueSnapshot {
    if (current) {
      const curPid = current.pid; // ✅ fix para evitar null
      return [
        curPid,
        ...ready.filter((p) => p.pid !== curPid).map((p) => p.pid),
      ];
    }
    return ready.map((p) => p.pid);
  }

  function tick(): boolean {
    enqueueArrivalsAt(t);

    // Si no hay proceso actual, elegir uno
    if (!current && ready.length > 0) {
      current = ready.reduce((best, p) => betterCandidate(best, p));
      remainingTime = current.burstTime;
    }

    const queueBefore = orderedQueueSnapshot();

    if (current) {
      remainingTime -= 1;
      executed += 1;

      onStep?.({
        time: t,
        processId: current.pid,
        processName: current.name,
        remainingTime,
        queueBefore,
      });

      if (remainingTime === 0) {
        const finishTime = t + 1;
        const Tr = finishTime - current.arrivalTime;
        const Te = Tr - current.burstTime;
        const Is = Tr > 0 ? current.burstTime / Tr : 0;

        const res: ProcessResult = {
          pid: current.pid,
          name: current.name,
          arrivalTime: current.arrivalTime,
          burstTime: current.burstTime,
          finishTime,
          turnaroundTime: Tr,
          waitingTime: Te,
          serviceIndex: Is,
        };

        results.push(res);
        onFinish?.(res);
        finished.add(current.pid);
        const idx = ready.findIndex((p) => p.pid === current!.pid);
        if (idx !== -1) ready.splice(idx, 1);
        current = null;
      }
    }

    t++;

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
