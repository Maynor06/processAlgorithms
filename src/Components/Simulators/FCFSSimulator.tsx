import { useEffect, useState } from "react";
import type { Process, ExecutionStep, ProcessResult } from "./common";
import { TIME_UNIT } from "./common";
import { runFCFS } from "../Algorithms/FCFS";
import { useProcesoContext } from "../Context/ProcessContext";

interface Props {
  isRunning: boolean;
  isPaused: boolean;
  resetFlag: boolean;
}

const FCFSSimulator: React.FC<Props> = ({ isRunning, isPaused, resetFlag }) => {
  const { procesos } = useProcesoContext();

  const [history, setHistory] = useState<ExecutionStep[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Reiniciar cuando se cambien procesos o reset
  useEffect(() => {
    const { history, results } = runFCFS(procesos);
    setHistory(history);
    setResults(results);
    setCurrentStep(0);

    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [procesos, resetFlag]);

  // Control de ejecución paso a paso
  useEffect(() => {
    if (isRunning && !isPaused && currentStep < history.length) {
      const id = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < history.length - 1) {
            return prev + 1;
          } else {
            clearInterval(id);
            return prev;
          }
        });
      }, TIME_UNIT);
      setIntervalId(id);

      return () => clearInterval(id);
    } else if (!isRunning || isPaused) {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
  }, [isRunning, isPaused, currentStep, history.length]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Simulación FCFS</h2>

      {/* Diagrama de Gantt */}
      <div className="flex space-x-1 mb-6 overflow-x-auto">
        {history.map((step, index) => (
          <div
            key={index}
            className={`w-12 h-12 flex items-center justify-center border ${
              index === currentStep
                ? "bg-blue-500 text-white"
                : step.runningProcess
                ? "bg-green-300"
                : "bg-gray-200"
            }`}
          >
            {step.runningProcess ? step.runningProcess.NombreProceso : "Idle"}
          </div>
        ))}
      </div>

      {/* Resultados */}
      <h3 className="text-lg font-semibold mb-2">Resultados</h3>
      <table className="table-auto border-collapse border border-gray-400 w-full">
        <thead>
          <tr>
            <th className="border border-gray-400 px-2">Proceso</th>
            <th className="border border-gray-400 px-2">Llegada</th>
            <th className="border border-gray-400 px-2">Duración</th>
            <th className="border border-gray-400 px-2">Finalización</th>
            <th className="border border-gray-400 px-2">Retorno</th>
            <th className="border border-gray-400 px-2">Espera</th>
            <th className="border border-gray-400 px-2">Índice Servicio</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, index) => (
            <tr key={index}>
              <td className="border border-gray-400 px-2">{r.process.NombreProceso}</td>
              <td className="border border-gray-400 px-2">{r.process.InstanteLlegada}</td>
              <td className="border border-gray-400 px-2">{r.process.Duration}</td>
              <td className="border border-gray-400 px-2">{r.completionTime}</td>
              <td className="border border-gray-400 px-2">{r.turnaroundTime}</td>
              <td className="border border-gray-400 px-2">{r.waitingTime}</td>
              <td className="border border-gray-400 px-2">{r.serviceIndex.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FCFSSimulator;
