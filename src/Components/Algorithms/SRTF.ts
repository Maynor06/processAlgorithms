// Definición de un Proceso
export interface Process {
  pid: number;
  name: string;
  arrivalTime: number; // instante de llegada
  burstTime: number;   // tiempo total requerido en CPU
}

// Paso de ejecución en la simulación
export interface ExecutionStep {
  time: number;        // tiempo actual de la simulación
  processId: number;
  processName: string;
  remainingTime: number;
}

// Resultado final por proceso
export interface ProcessResult {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  finishTime: number;
  turnaroundTime: number; // Tr
  waitingTime: number;    // Te
  serviceIndex: number;   // Is
}

// ⚙️ Configuración global
export const TIME_UNIT = 1000; // ms → 1 seg por defecto

// Función principal del algoritmo SRTF
export function runSRTF(processes: Process[]): {
  history: ExecutionStep[];
  results: ProcessResult[];
} {
  let currentTime = 0;
  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  // Copia local de tiempos restantes
  const remainingTime: Record<number, number> = {};
  processes.forEach(p => {
    remainingTime[p.pid] = p.burstTime;
  });

  // Cola de listos
  const readyQueue: Process[] = [];
  const finished: Set<number> = new Set();

  while (finished.size < processes.length) {
    // 1. Añadir procesos que llegan en este instante
    processes.forEach(p => {
      if (p.arrivalTime === currentTime) {
        readyQueue.push(p);
      }
    });

    // 2. Selección de proceso con menor tiempo restante
    let currentProcess: Process | null = null;
    if (readyQueue.length > 0) {
      currentProcess = readyQueue.reduce((prev, curr) => {
        return remainingTime[curr.pid] < remainingTime[prev.pid] ? curr : prev;
      });
    }

    if (currentProcess) {
      // Ejecutar 1 unidad de tiempo
      remainingTime[currentProcess.pid] -= 1;
      history.push({
        time: currentTime,
        processId: currentProcess.pid,
        processName: currentProcess.name,
        remainingTime: remainingTime[currentProcess.pid],
      });

      // Si terminó
      if (remainingTime[currentProcess.pid] === 0) {
        const finishTime = currentTime + 1;
        const turnaroundTime = finishTime - currentProcess.arrivalTime;
        const waitingTime = turnaroundTime - currentProcess.burstTime;
        const serviceIndex = currentProcess.burstTime / turnaroundTime;

        results.push({
          pid: currentProcess.pid,
          name: currentProcess.name,
          arrivalTime: currentProcess.arrivalTime,
          burstTime: currentProcess.burstTime,
          finishTime,
          turnaroundTime,
          waitingTime,
          serviceIndex,
        });

        finished.add(currentProcess.pid);

        // Sacar de la cola
        const idx = readyQueue.findIndex(p => p.pid === currentProcess!.pid);
        if (idx !== -1) readyQueue.splice(idx, 1);
      }
    }

    // 3. Avanzar tiempo
    currentTime++;
  }

  return { history, results };
}









// 🧪 Ejemplo de uso con procesos fijos (luego se reemplaza por inputs)
const exampleProcesses: Process[] = [
  { pid: 1, name: "A", arrivalTime: 0, burstTime: 4 },
  { pid: 2, name: "B", arrivalTime: 2, burstTime: 2 },
  { pid: 3, name: "C", arrivalTime: 3, burstTime: 3 },
];

// Descomenta para probar en consola (Node)
// const { history, results } = runSRTF(exampleProcesses);
// console.log("Historial:", history);
// console.log("Resultados:", results);
