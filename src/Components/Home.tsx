// imports iguales…
import React from "react";
import { runSRTF } from "../Components/Algorithms/SRTF";
import type { Process } from "../Components/Algorithms/SRTF";

export default function Home() {
  const exampleProcesses: Process[] = [
    { pid: 1, name: "A", arrivalTime: 0, burstTime: 4 },
    { pid: 2, name: "B", arrivalTime: 2, burstTime: 2 },
    { pid: 3, name: "C", arrivalTime: 3, burstTime: 3 },
  ];

  const { history, results } = runSRTF(exampleProcesses);

  // ⬇️ promedio de la última columna (serviceIndex)
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


        {/* Columna izquierda */}
        <div className="col-span-1 flex flex-col bg-white shadow rounded-xl p-4">
          <h2 className="text-lg font-bold mb-2">Lista de Procesos</h2>


          {/* Placeholder: aquí luego pondremos QueueProcess */}
          <div className="flex-1 border rounded-lg flex items-center justify-center text-gray-400">
            (Aquí irá la lista de procesos)
          </div>

          

            {/* Selector de algoritmo */}
            <label className="text-sm font-medium mb-1">Algoritmo:</label>
            <select
            className="mb-4 p-2 border rounded-lg w-full text-sm"
            defaultValue=""
            >
            <option value="" disabled>
                Selecciona un algoritmo
            </option>
            <option value="fcfs">FCFS (First Come, First Served)</option>
            <option value="sjf">SJF (Shortest Job First)</option>
            <option value="srtf">SRTF (Shortest Remaining Time First)</option>
            <option value="roundrobin">Round Robin</option>
            <option value="priority">Por Prioridad</option>
            </select>


          {/* Placeholder: aquí luego pondremos Controls */}
          <div className="mt-4">
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg">
              Simular Procesos
            </button>
          </div>
        </div>







        {/* Columna derecha */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Visualización */}
          <div className="flex-1 bg-white shadow rounded-xl p-4">
            <h2 className="text-lg font-bold mb-2">Visualización</h2>
            <div className="text-sm font-mono whitespace-pre">
              {history.map((step) => (
                <div key={step.time}>
                  t={step.time}: Proceso {step.processName} (resta {step.remainingTime})
                </div>
              ))}
            </div>
          </div>

          {/* Resultados */}
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

              {/* ⬇️ Fila de promedio, discreta y sin estorbar */}
              <tfoot>
                <tr className="bg-gray-50">
                  <td className="p-1 border text-gray-700">
                    Promedio índice:
                  </td>
                  <td className="p-1 border text-gray-500" colSpan={5}></td>
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
