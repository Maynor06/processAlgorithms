// src/Components/Algorithms/FCFS.ts

import type {
  Process,
  ExecutionStep,
  ProcessResult,
  QueueSnapshot,
} from "./common";

import { TIME_UNIT } from "./common";

// ===== Motor "offline" (ejecuta todo de golpe) =====
export function runFCFS(
  processes: Process[]
): { history: ExecutionStep[]; results: ProcessResult[] } {
  const procs = processes.map((p) => ({ ...p }));
  // ordenar por llegada (FIFO)
  procs.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid - b.pid);

  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  let t = 0;

  for (const p of procs) {
    if (t < p.arrivalTime) {
      // CPU ociosa hasta que llegue
      t = p.arrivalTime;
    }

    // la cola antes de empezar este proceso
    const queueBefore: QueueSnapshot = [p.pid];

    for (let i = 0; i < p.burstTime; i++) {
      history.push({
        time: t,
        processId: p.pid,
        processName: p.name,
        remainingTime: p.burstTime - (i + 1),
        queueBefore,
      });
      t++;
    }

    const finishTime = t;
    const Tr = finishTime - p.arrivalTime;
    const Te = Tr - p.burstTime;
    const Is = Tr > 0 ? p.burstTime / Tr : 0;

    results.push({
      pid: p.pid,
      name: p.name,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      finishTime,
      turnaroundTime: Tr,
      waitingTime: Te,
      serviceIndex: Is,
    });
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return { history, results };
}

// ===== Motor incremental con "addProcess" y callbacks =====
type StepCb = (step: ExecutionStep) => void;
type FinishCb = (result: ProcessResult) => void;
type CompleteCb = (finalResults: ProcessResult[]) => void;

export function createFCFSEngine(opts?: { startTime?: number }) {
  let t = opts?.startTime ?? 0;
  const queue: Process[] = [];
  const all: Map<number, Process> = new Map();
  const results: ProcessResult[] = [];

  let current: Process | null = null;
  let remaining = 0;

  let onStep: StepCb | null = null;
  let onFinish: FinishCb | null = null;
  let onComplete: CompleteCb | null = null;

  function addProcess(p: Process) {
    if (all.has(p.pid)) return;
    all.set(p.pid, { ...p });
    queue.push(p);
    // mantener cola ordenada por llegada
    queue.sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid - b.pid);
  }

  function tick(): boolean {
    // si no hay proceso actual, tomar el siguiente en la cola que ya haya llegado
    if (!current) {
      const next = queue.find((p) => p.arrivalTime <= t);
      if (next) {
        current = next;
        remaining = current.burstTime;
        // quitarlo de la cola
        const idx = queue.indexOf(next);
        if (idx !== -1) queue.splice(idx, 1);
      }
    }

    if (current) {
      remaining -= 1;

      onStep?.({
        time: t,
        processId: current.pid,
        processName: current.name,
        remainingTime: remaining,
        queueBefore: [current.pid, ...queue.map((p) => p.pid)],
      });

      if (remaining === 0) {
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
        current = null;
      }
    }

    t++;

    const done = !current && queue.length === 0 && results.length === all.size;
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
    onStep: (cb: StepCb | null) => (onStep = cb),
    onFinish: (cb: FinishCb | null) => (onFinish = cb),
    onComplete: (cb: CompleteCb | null) => (onComplete = cb),
  };
}
