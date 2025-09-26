import React, { useEffect, useMemo, useRef, useState } from "react";
import { createSRTFEngine, TIME_UNIT } from "../Components/Algorithms/SRTF";
import type {
  Process,
  ExecutionStep,
  ProcessResult,
} from "../Components/Algorithms/SRTF";

/** Color estable por PID (HSL) */
function colorForPid(pid: number) {
  const hue = (pid * 67) % 360;
  return `hsl(${hue} 70% 55%)`;
}







export default function Home() {
  // --- Procesos iniciales (sin inputs por ahora) ---
// --- Procesos iniciales (15 procesos) ---



const initial: Process[] = [
  { pid: 1, name: "A", arrivalTime: 0, burstTime: 8 }, // largo, arranca primero
  { pid: 2, name: "B", arrivalTime: 1, burstTime: 4 }, // preempta a A en t=1
  { pid: 3, name: "C", arrivalTime: 2, burstTime: 2 }, // preempta a B en t=2
  { pid: 4, name: "D", arrivalTime: 3, burstTime: 6 }, // entra a cola mientras C termina
  { pid: 5, name: "E", arrivalTime: 4, burstTime: 1 }, // toma CPU en t=4 por ser el más corto
  { pid: 6, name: "F", arrivalTime: 5, burstTime: 3 }, // empate con B (3 vs 3) → nuestro tie-break favorece F (llegó después)
  { pid: 7, name: "G", arrivalTime: 6, burstTime: 2 }, // preempta a F (2 vs 2 → favorece G por llegada más tardía)
];








  

  // Mapa PID -> Nombre (para mostrar filas aunque aún no ejecuten)
  const [procNameMap, setProcNameMap] = useState<Map<number, string>>(
    new Map(initial.map((p) => [p.pid, p.name]))
  );

  // --- Estados de simulación/visualización ---
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const engineRef = useRef<ReturnType<typeof createSRTFEngine> | null>(null);
  const timerRef = useRef<number | null>(null);

  // Crear engine e inscribir callbacks
  useEffect(() => {
    const eng = createSRTFEngine({ startTime: 0 });

    // procesos iniciales
    initial.forEach(eng.addProcess);

    eng.onStep((s) => setSteps((xs) => [...xs, s]));
    eng.onFinish((r) => setResults((rs) => [...rs, r]));
    eng.onComplete(() => setIsComplete(true));

    engineRef.current = eng;
  }, []);

  // Intervalo que avanza tick a tick
  useEffect(() => {
    if (!engineRef.current) return;
    if (!isRunning || isPaused || isComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      const done = engineRef.current!.tick();
      if (done && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, TIME_UNIT);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, isComplete]);








  // --- Derivados para la visualización ---
  const MAX_COLS = 40;

  // t -> pid que ejecutó ese tick
  const runningByTime = useMemo(() => {
    const m = new Map<number, number>();
    steps.forEach((s) => m.set(s.time, s.processId));
    return m;
  }, [steps]);

  // t -> (pid -> posición en cola 1..n)  (ANTES del tick)  — excluye al que correrá
  const queuePosByTime = useMemo(() => {
    const map = new Map<number, Map<number, number>>();
    steps.forEach((s) => {
      const inner = new Map<number, number>();
      s.queueBefore.forEach((pid, idx) => {
        if (idx > 0) inner.set(pid, idx); // idx=1 -> "1", idx=2 -> "2", ...
      });
      map.set(s.time, inner);
    });
    return map;
  }, [steps]);

  // Filas del Gantt: incluir pids que ejecutaron, que estaban en cola o ya terminaron
  const procRows = useMemo(() => {
    const seen = new Set<number>();

    steps.forEach((s) => {
      seen.add(s.processId);
      s.queueBefore.forEach((pid) => seen.add(pid));
    });
    results.forEach((r) => seen.add(r.pid));

    const rows: Array<[number, string]> = Array.from(seen).map((pid) => [
      pid,
      procNameMap.get(pid) ?? `P${pid}`,
    ]);
    rows.sort((a, b) => a[1].localeCompare(b[1]));
    return rows;
  }, [steps, results, procNameMap]);

  // Promedio del índice solo cuando todo finaliza
  const avgService =
    isComplete && results.length
      ? results.reduce((a, r) => a + r.serviceIndex, 0) / results.length
      : null;

  // Tiempo actual (solo informativo)
  const currentTick = steps.length ? steps[steps.length - 1].time + 1 : 0;

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Encabezado */}
      <header className="bg-blue-600 text-white py-4 px-6 shadow">
        <h1 className="text-xl font-bold">Simulador de procesos</h1>
      </header>

      <main className="flex-1 p-4 grid grid-cols-4 gap-4">
        {/* Columna izquierda en blanco */}
        <div className="col-span-1 bg-white shadow rounded-xl p-4" />

        {/* Columna derecha */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* === Visualización (Gantt) === */}
          <div className="flex-1 bg-white shadow rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Visualización</h2>
              <div className="text-xs text-gray-500">
                TIME_UNIT: {TIME_UNIT} ms · Estado:{" "}
                {isComplete ? "Finalizado" : isPaused ? "Pausado" : "Corriendo"}{" "}
                · t={currentTick}
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <table className="text-xs min-w-[1400px]">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 border text-left min-w-[80px]">
                      Proceso
                    </th>
                    {Array.from({ length: MAX_COLS }).map((_, t) => (
                      <th
                        key={t}
                        className={
                          "border px-3 py-1 font-normal " +
                          (t === currentTick - 1 ? "bg-blue-50" : "")
                        }
                      >
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {procRows.map(([pid, name]) => {
                    const color = colorForPid(pid);
                    return (
                      <tr key={pid} className="odd:bg-white even:bg-gray-50">
                        <td className="p-2 border font-medium">{name}</td>
                        {Array.from({ length: MAX_COLS }).map((_, t) => {
                          const runningPid = runningByTime.get(t);
                          const isRunningHere = runningPid === pid;
                          const qpos = queuePosByTime.get(t)?.get(pid) ?? null;

                          return (
                            <td
                              key={t}
                              className={
                                "border text-center align-middle h-7 min-w-[36px] " +
                                (isRunningHere ? "text-white" : "")
                              }
                              style={{
                                background: isRunningHere ? color : undefined,
                              }}
                              title={
                                isRunningHere
                                  ? `t=${t}: ${name} en CPU`
                                  : qpos
                                  ? `t=${t}: ${name} en cola (#${qpos})`
                                  : `t=${t}`
                              }
                            >
                              {isRunningHere ? "■" : qpos ? qpos : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* === Resultados === */}
          <div className="bg-white shadow rounded-xl p-4">
            <h2 className="text-lg font-bold mb-2">Resultados</h2>
            <table className="w-full text-sm border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-1 border">Proceso</th>
                  <th className="p-1 border">Llegada</th>
                  <th className="p-1 border">CPU</th>
                  <th className="p-1 border">Finalización</th>
                  <th className="p-1 border">Retorno</th>
                  <th className="p-1 border">Espera</th>
                  <th className="p-1 border">Índice</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.pid}>
                    <td className="p-1 border">{r.name}</td>
                    <td className="p-1 border">{r.arrivalTime}</td>
                    <td className="p-1 border">{r.burstTime}</td>
                    <td className="p-1 border">{r.finishTime}</td>
                    <td className="p-1 border">{r.turnaroundTime}</td>
                    <td className="p-1 border">{r.waitingTime}</td>
                    <td className="p-1 border">
                      {r.serviceIndex.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="p-1 border text-gray-700">
                    {avgService === null
                      ? "Promedio índice (al finalizar):"
                      : "Promedio índice:"}
                  </td>
                  <td className="p-1 border" colSpan={5}></td>
                  <td className="p-1 border font-semibold">
                    {avgService === null ? "—" : avgService.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-3 text-center"> </footer>
    </div>
  );
}
