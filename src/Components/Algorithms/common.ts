// src/Components/Algorithms/common.ts

// ===== Config global usada por la UI =====
export const TIME_UNIT = 500; // ms (1s por defecto)

// ===== Tipos comunes a todos los algoritmos =====

// Proceso de entrada
export interface Process {
  pid: number;
  name: string;
  arrivalTime: number;  // unidad de tiempo
  burstTime: number;    // unidades de CPU requeridas
  priority?: number;    // opcional (para algoritmos de prioridad)
}

// Cola en un tick: pids en orden (índice 0 = 1° en cola)
export type QueueSnapshot = number[];

// Paso de ejecución (timeline / Gantt)
export interface ExecutionStep {
  time: number;             // tick ejecutado
  processId: number;        // PID que corrió en este tick
  processName: string;
  remainingTime: number;    // restante DESPUÉS de este tick
  queueBefore: QueueSnapshot; // snapshot de la ready queue ANTES de ejecutar el tick
}

// Resultado final por proceso
export interface ProcessResult {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  finishTime: number;        // cf
  turnaroundTime: number;    // Tr = cf - ti
  waitingTime: number;       // Te = Tr - τ
  serviceIndex: number;      // Is = τ / Tr
}
