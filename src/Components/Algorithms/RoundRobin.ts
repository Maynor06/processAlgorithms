// src/Components/Algorithms/RoundRobin.ts

import type {
  Process,
  ExecutionStep,
  ProcessResult,
  QueueSnapshot
} from "./common";


// ===== Motor offline (para pruebas rápidas) =====
export function runRoundRobin(
  processes: Process[],
  quantum: number
): { history: ExecutionStep[]; results: ProcessResult[] } {
  const procs = processes.map(p => ({ ...p }));
  const remaining: Record<number, number> = {};
  procs.forEach(p => (remaining[p.pid] = p.burstTime));

  const totalBurst = procs.reduce((a, p) => a + p.burstTime, 0);
  const ready: Process[] = [];
  const finished = new Set<number>();
  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  let t = 0, executed = 0;

  const enqueueArrivals = () => {
    for (const p of procs) if (p.arrivalTime === t) ready.push(p);
  };

  while (executed < totalBurst) {
    enqueueArrivals();

    const queueBefore: QueueSnapshot = ready.map(p => p.pid);
    const current = ready.shift() ?? null;

    if (current) {
      const timeSlice = Math.min(quantum, remaining[current.pid]);
      for (let i = 0; i < timeSlice; i++) {
        history.push({
          time: t,
          processId: current.pid,
          processName: current.name,
          remainingTime: remaining[current.pid] - 1 - i,
          queueBefore
        });
        t++;
        enqueueArrivals();
      }

      remaining[current.pid] -= timeSlice;
      executed += timeSlice;

      if (remaining[current.pid] === 0) {
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
          serviceIndex: Is
        });
        finished.add(current.pid);
      } else {
        ready.push(current);
      }
    } else {
      // No hay procesos listos → avanzar tiempo
      t++;
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name));
  return { history, results };
}

// ===== Motor incremental =====
type StepCb = (step: ExecutionStep) => void;
type FinishCb = (result: ProcessResult) => void;
type CompleteCb = (finalResults: ProcessResult[]) => void;

export function createRoundRobinEngine(
  opts?: { startTime?: number; quantum?: number }
) {
  const quantum = opts?.quantum ?? 2; // Quantum por defecto
  let t = opts?.startTime ?? 0;

  const remaining: Record<number, number> = {};
  const ready: Process[] = [];
  const all: Map<number, Process> = new Map();
  const finished = new Set<number>();
  const results: ProcessResult[] = [];

  let totalBurst = 0;
  let executed = 0;
  let current: Process | null = null;
  let quantumCounter = 0;

  let onStep: StepCb | null = null;
  let onFinish: FinishCb | null = null;
  let onComplete: CompleteCb | null = null;

  function addProcess(p: Process) {
    if (all.has(p.pid)) return;
    all.set(p.pid, { ...p });
    remaining[p.pid] = p.burstTime;
    totalBurst += p.burstTime;
    if (p.arrivalTime <= t) ready.push(p);
  }

  function enqueueArrivalsAt(time: number) {
    for (const p of all.values()) {
      if (p.arrivalTime === time && remaining[p.pid] > 0 && !ready.find(r => r.pid === p.pid)) {
        ready.push(p);
      }
    }
  }

  function orderedQueueSnapshot(): QueueSnapshot {
    return ready.map(p => p.pid);
  }

    function tick(): boolean {
        // 1️⃣ Añadir procesos que llegan en este tick
        enqueueArrivalsAt(t);

        // 2️⃣ Si el proceso actual agotó su quantum → reencolar
        if (current && quantumCounter >= quantum) {
            ready.push(current);
            current = null;
            quantumCounter = 0;
        }

        // 3️⃣ Tomar snapshot de la cola **completa** para este tick
        const queueBefore = orderedQueueSnapshot();

        // 4️⃣ Si no hay proceso actual, tomar el siguiente de la cola
        if (!current && ready.length > 0) {
            current = ready.shift()!;
            quantumCounter = 0;
        }

        // 5️⃣ Ejecutar 1 unidad del proceso actual
        if (current) {
            remaining[current.pid]--;
            executed++;
            quantumCounter++;

            onStep?.({
                time: t,
                processId: current.pid,
                processName: current.name,
                remainingTime: remaining[current.pid],
                queueBefore
            });

            // ✅ Si terminó
            if (remaining[current.pid] === 0) {
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
                    serviceIndex: Is
                };

                results.push(res);
                onFinish?.(res);
                finished.add(current.pid);
                current = null;
                quantumCounter = 0;
            }
        }

        // 6️⃣ Avanzar el reloj
        t++;

        // 7️⃣ Si todos terminaron, notificar
        if (executed >= totalBurst) {
            results.sort((a, b) => a.name.localeCompare(b.name));
            onComplete?.(results.slice());
            return true;
        }

        return false;
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