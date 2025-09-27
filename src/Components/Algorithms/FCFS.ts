// src/Components/Algorithms/FCFS.ts
import type { Process, ExecutionStep, ProcessResult } from "./common";
import { TIME_UNIT } from "./common";

export function runFCFS(processes: Process[]): { history: ExecutionStep[]; results: ProcessResult[] } {
  const sorted = [...processes].sort((a, b) => a.InstanteLlegada - b.InstanteLlegada);

  let currentTime = 0;
  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  for (const process of sorted) {
    if (currentTime < process.InstanteLlegada) {
      // Tiempo ocioso de CPU
      for (let t = currentTime; t < process.InstanteLlegada; t++) {
        history.push({ time: t, runningProcess: null, readyQueue: [] });
      }
      currentTime = process.InstanteLlegada;
    }

    // Ejecutar proceso completo
    for (let t = 0; t < process.Duration; t++) {
      history.push({
        time: currentTime,
        runningProcess: process,
        readyQueue: sorted
          .filter(p => p !== process && p.InstanteLlegada <= currentTime && !results.find(r => r.process === p))
          .map(p => ({ ...p })),
      });
      currentTime++;
    }

    // Calcular métricas
    const completionTime = currentTime;
    const turnaroundTime = completionTime - process.InstanteLlegada;
    const waitingTime = turnaroundTime - process.Duration;
    const serviceIndex = process.Duration / turnaroundTime;

    results.push({
      process,
      completionTime,
      turnaroundTime,
      waitingTime,
      serviceIndex,
    });
  }

  return { history, results };
}
