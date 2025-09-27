// src/Components/Algorithms/SRTF.ts

import type {
  Process,
  ExecutionStep,
  ProcessResult,
  QueueSnapshot
} from "./common";

import { TIME_UNIT } from "./common";

export function runFCFS(processes: Process[]) {
  const queue = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  let currentTime = 0;

  for (const process of queue) {
    if (currentTime < process.arrivalTime) {
      currentTime = process.arrivalTime;
    }

    for (let i = 0; i < process.burstTime; i++) {
      history.push({
        time: currentTime,
        processId: process.pid,
        processName: process.name,
        remainingTime: process.burstTime - (i + 1),
        queueBefore: queue.map((p) => p.pid),
      });
      currentTime++;
    }

    const finishTime = currentTime;
    const turnaroundTime = finishTime - process.arrivalTime;
    const waitingTime = turnaroundTime - process.burstTime;
    const serviceIndex = process.burstTime / turnaroundTime;

    results.push({
      pid: process.pid,
      name: process.name,
      arrivalTime: process.arrivalTime,
      burstTime: process.burstTime,
      finishTime,
      turnaroundTime,
      waitingTime,
      serviceIndex,
    });
  }

  return { history, results };
}

export function createFCFSEngine(
  processes: Process[],
  onStep: (step: ExecutionStep) => void,
  onFinish?: (res: ProcessResult[]) => void,
  onComplete?: () => void
) {
  const queue = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  let currentTime = 0;
  let index = 0;
  let running: Process | null = null;
  let remaining = 0;
  const results: ProcessResult[] = [];

  function tick() {
    if (!running && index < queue.length && queue[index].arrivalTime <= currentTime) {
      running = queue[index];
      remaining = running.burstTime;
      index++;
    }

    if (running) {
      onStep({
        time: currentTime,
        processId: running.pid,
        processName: running.name,
        remainingTime: remaining - 1,
        queueBefore: queue.slice(index).map((p) => p.pid),
      });

      remaining--;

      if (remaining === 0) {
        const finishTime = currentTime + 1;
        const turnaroundTime = finishTime - running.arrivalTime;
        const waitingTime = turnaroundTime - running.burstTime;
        const serviceIndex = running.burstTime / turnaroundTime;

        results.push({
          pid: running.pid,
          name: running.name,
          arrivalTime: running.arrivalTime,
          burstTime: running.burstTime,
          finishTime,
          turnaroundTime,
          waitingTime,
          serviceIndex,
        });

        running = null;

        if (index >= queue.length) {
          onFinish?.(results);
          onComplete?.();
          return;
        }
      }
    }

    currentTime++;
  }

  return { tick };
}
