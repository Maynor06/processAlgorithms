import React, { useEffect, useMemo, useRef, useState } from "react";
import { runSRTF, TIME_UNIT } from "../Components/Algorithms/SRTF";
import type { Process } from "../Components/Algorithms/SRTF";

export default function Home() {
  const exampleProcesses: Process[] = [
    { pid: 1, name: "A", arrivalTime: 0, burstTime: 4 },
    { pid: 2, name: "B", arrivalTime: 2, burstTime: 2 },
    { pid: 3, name: "C", arrivalTime: 3, burstTime: 3 },
  ];

  const { history, results } = useMemo(() => runSRTF(exampleProcesses), []);

  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTick, setCurrentTick] = useState(0);

  const totalTicks = useMemo(
    () => (history.length ? history[history.length - 1].time + 1 : 0),
    [history]
  );

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning || isPaused || currentTick >= totalTicks) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = window.setInterval(() => {
      setCurrentTick((t) => {
        const nxt = Math.min(t + 1, totalTicks);
        if (nxt >= totalTicks && timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return nxt;
      });
    }, TIME_UNIT);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, isPaused, currentTick, totalTicks]);

  const processRows = useMemo(
    () =>
      [...new Map(exampleProcesses.map((p) => [p.pid, p])).values()].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    [exampleProcesses]
  );

  const byTime = useMemo(() => {
    const m = new Map<number, number>();
    for (const step of history) {
      m.set(step.time, step.processId);
    }
    return m;
  }, [history]);

  const avgService =
    results.length === 0
      ? 0
      : results.reduce((acc, r) => acc + r.serviceIndex, 0) / results.length;

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      <header className="bg-blue-600 text-white py-4 px-6 shadow">
        <h1 className="text-xl font-bold">Simulador de procesos</h1>
      </header>

      <main className="flex-1 p-4 grid grid-cols-4 gap-4">
        {/* Columna izquierda vacía */}
        <div className="col-span-1 bg-white shadow rounded-xl p-4" />

        {/* Columna derecha */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* === Visualización === */}
          <div className="flex-1 bg-white shadow rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">Visualización</h2>
              <div className="text-xs text-gray-500">
                TIME_UNIT: {TIME_UNIT} ms · Estado:{" "}
                {isRunning ? (isPaused ? "Pausado" : "Corriendo") : "Detenido"} ·
                t={currentTick}/{totalTicks}
              </div>
            </div>

            {/* Gantt */}
            <div className="border rounded-lg overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 border text-left min-w-[80px]">Proceso</th>
                    {Array.from({ length: totalTicks }).map((_, t) => (
                      <th
                        key={t}
                        className={
                          "border px-2 py-1 font-normal " +
                          (t === currentTick - 1 ? "bg-blue-50" : "")
                        }
                      >
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {processRows.map((p) => (
                    <tr key={p.pid} className="odd:bg-white even:bg-gray-50">
                      <td className="p-2 border font-medium">{p.name}</td>
                      {Array.from({ length: totalTicks }).map((_, t) => {
                        const runningPid = byTime.get(t);
                        const isFilled = t < currentTick && runningPid === p.pid;
                        const isNow = t === currentTick - 1;

                        return (
                          <td
                            key={t}
                            className={
                              "border text-center align-middle h-6 min-w-[28px] " +
                              (isFilled ? "bg-blue-500/70 text-white" : "") +
                              (!isFilled && isNow ? " bg-blue-50" : "")
                            }
                          >
                            {isFilled ? "■" : ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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
                    <td className="p-1 border">{r.serviceIndex.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="p-1 border text-gray-700">Promedio índice:</td>
                  <td className="p-1 border" colSpan={5}></td>
                  <td className="p-1 border font-semibold">
                    {avgService.toFixed(2)}
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
