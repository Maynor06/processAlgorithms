// src/Components/Algorithms/SRTF.ts

// ===== Tipos =====
export interface Process {
  pid: number;          // identificador único
  name: string;         // nombre del proceso (A, B, C, ...)
  arrivalTime: number;  // instante de llegada (unidad de tiempo)
  burstTime: number;    // tiempo total requerido en CPU (unidades)
}

export interface ExecutionStep {
  time: number;         // tiempo (tick) en el que se ejecuta este paso
  processId: number;    // pid del proceso que corrió en este tick
  processName: string;  // nombre del proceso
  remainingTime: number;// tiempo restante DESPUÉS de ejecutar este tick
}

export interface ProcessResult {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  finishTime: number;      // cf
  turnaroundTime: number;  // Tr = cf - ti
  waitingTime: number;     // Te = Tr - τ
  serviceIndex: number;    // Is = τ / Tr
}

// ===== Config global (usada por la UI para la animación) =====
export const TIME_UNIT = 1000; // ms → 1 seg por defecto

// ===== Algoritmo SRTF =====
// - Preemptivo: si llega un proceso con MENOR tiempo restante, interrumpe.
// - Desempate (remainingTime iguales):
//   1) favorece al que llegó más tarde (preempte en empate)
//   2) si sigue el empate, favorece PID mayor (estable y determinista)
export function runSRTF(processes: Process[]): {
  history: ExecutionStep[];
  results: ProcessResult[];
} {
  // Copias inmutables de entrada
  const procs = processes.map(p => ({ ...p }));

  // Tiempos restantes por PID
  const remainingTime: Record<number, number> = {};
  procs.forEach(p => (remainingTime[p.pid] = p.burstTime));

  // Estructuras de control
  let currentTime = 0;
  const finished = new Set<number>();
  const readyQueue: Process[] = [];
  const history: ExecutionStep[] = [];
  const results: ProcessResult[] = [];

  // Para saber cuándo parar más rápido
  const totalBurst = procs.reduce((acc, p) => acc + p.burstTime, 0);
  let executedTicks = 0;

  // Helper: añadir recién llegados al tick actual
  const enqueueArrivals = () => {
    for (const p of procs) {
      if (p.arrivalTime === currentTime) {
        readyQueue.push(p);
      }
    }
  };

  // Helper: elegir siguiente proceso bajo SRTF con desempate
  const pickNext = (): Process | null => {
    if (readyQueue.length === 0) return null;
    return readyQueue.reduce((best, p) => {
      const rb = remainingTime[best.pid];
      const rp = remainingTime[p.pid];

      if (rp < rb) return p;
      if (rp === rb) {
        // 1) llegó más tarde → prioridad
        if (p.arrivalTime > best.arrivalTime) return p;
        // 2) si siguen empatados → PID mayor
        if (p.arrivalTime === best.arrivalTime && p.pid > best.pid) return p;
      }
      return best;
    });
  };

  while (executedTicks < totalBurst) {
    // 1) Encolar procesos que llegan en el tiempo actual
    enqueueArrivals();

    // 2) Elegir SRTF
    const currentProcess = pickNext();

    if (currentProcess) {
      // Ejecutar 1 unidad
      remainingTime[currentProcess.pid] -= 1;
      executedTicks += 1;

      history.push({
        time: currentTime,
        processId: currentProcess.pid,
        processName: currentProcess.name,
        remainingTime: remainingTime[currentProcess.pid],
      });

      // ¿Terminó?
      if (remainingTime[currentProcess.pid] === 0) {
        const finishTime = currentTime + 1; // termina al cerrar este tick
        const turnaroundTime = finishTime - currentProcess.arrivalTime;
        const waitingTime = turnaroundTime - currentProcess.burstTime;
        const serviceIndex =
          turnaroundTime > 0
            ? currentProcess.burstTime / turnaroundTime
            : 0;

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
        // Sacarlo de la cola de listos
        const idx = readyQueue.findIndex(p => p.pid === currentProcess.pid);
        if (idx !== -1) readyQueue.splice(idx, 1);
      }
    }

    // 3) Avanzar el tiempo
    currentTime += 1;

    // Si la cola está vacía y aún faltan procesos por llegar,
    // podemos seguir avanzando el tiempo hasta la próxima llegada.
    if (readyQueue.length === 0 && executedTicks < totalBurst) {
      const nextArrival = procs
        .filter(p => !finished.has(p.pid) && p.arrivalTime > currentTime - 1)
        .reduce<number | null>((min, p) => {
          return min === null ? p.arrivalTime : Math.min(min, p.arrivalTime);
        }, null);

      if (nextArrival !== null && nextArrival > currentTime) {
        // saltar directo al siguiente instante con llegadas
        while (currentTime < nextArrival) {
          enqueueArrivals(); // no encolará hasta que coincida
          currentTime += 1;
        }
      }
    }
  }

  // Ordenar resultados por nombre (opcional, coherente con UI)
  results.sort((a, b) => a.name.localeCompare(b.name));

  return { history, results };
}
