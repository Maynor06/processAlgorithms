// src/Components/FCFSSimulator.tsx
import React, { useEffect, useState } from "react";
import { createFCFSEngine } from "../Algorithms/FCFS";
import type { Process, ExecutionStep, ProcessResult } from "../Algorithms/common";
import { TIME_UNIT } from "../Algorithms/common";
import { useProcesoContext } from "../Context/ProcessContext";

interface FCFSSimulatorProps {
  procesos: Process[];
}

const FCFSSimulator: React.FC<FCFSSimulatorProps> = ({ procesos }) => {
  const [history, setHistory] = useState<ExecutionStep[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [time, setTime] = useState(0);

  useEffect(() => {
    if (procesos.length === 0) return;

    setHistory([]);
    setResults([]);
    setTime(0);

    const engine = createFCFSEngine(
      procesos,
      (step) => setHistory((prev) => [...prev, step]),
      (res) => setResults(res)
    );

    const interval = setInterval(() => {
      engine.tick();
      setTime((prev) => prev + 1);
    }, TIME_UNIT);

    return () => clearInterval(interval);
  }, [procesos]);

  return (
    <div className="p-4">
      <h2 className="font-bold text-xl">Simulación FCFS</h2>

      <div className="mt-4">
        <h3 className="font-bold">Diagrama de Gantt</h3>
        <div className="flex space-x-1 mt-2">
          {history.map((h, i) => (
            <div
              key={i}
              className="w-10 h-10 flex items-center justify-center border rounded"
              style={{ backgroundColor: h.processId ? "#60a5fa" : "#d1d5db" }}
            >
              {h.processName}
            </div>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold">Resultados</h3>
          <table className="table-auto border-collapse border border-gray-300 mt-2">
            <thead>
              <tr>
                <th className="border px-2">Proceso</th>
                <th className="border px-2">Turnaround</th>
                <th className="border px-2">Espera</th>
                <th className="border px-2">Índice de servicio</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.pid}>
                  <td className="border px-2">{r.name}</td>
                  <td className="border px-2">{r.turnaroundTime}</td>
                  <td className="border px-2">{r.waitingTime}</td>
                  <td className="border px-2">{r.serviceIndex.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4">
            <p>
              <strong>Tiempo promedio de retorno:</strong>{" "}
              {(results.reduce((acc, r) => acc + r.turnaroundTime, 0) / results.length).toFixed(2)}
            </p>
            <p>
              <strong>Tiempo promedio de espera:</strong>{" "}
              {(results.reduce((acc, r) => acc + r.waitingTime, 0) / results.length).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FCFSSimulator;
