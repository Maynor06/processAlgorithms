// src/Components/Simulators/SRTFSimulator.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createSRTFEngine } from "../Algorithms/SRTF";
import {
  TIME_UNIT,
  type Process,
  type ExecutionStep,
  type ProcessResult,
} from "../Algorithms/common";
import { useProcesoContext } from "../../Context/ProcessContext";

function colorForPid(pid: number) {
  const hue = (pid * 67) % 360;
  return `hsl(${hue} 70% 55%)`;
}

interface Props {
  isRunning: boolean;
  isPaused: boolean;
  resetFlag: boolean;
}

export default function SRTFSimulator({
  isRunning,
  isPaused,
  resetFlag,
}: Props) {
  const { procesos } = useProcesoContext();

  // Adaptar procesos del contexto al formato del motor
  const data: Process[] = procesos.map((p) => ({
    pid: p.PID,
    name: p.NombreProceso,
    burstTime: p.Duration,
    arrivalTime: p.InstanteLlegada,
  }));

  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const engineRef = useRef<ReturnType<typeof createSRTFEngine> | null>(null);
  const timerRef = useRef<number | null>(null);

  // Reiniciar motor siempre que cambien procesos (cantidad) o se pida reset
  useEffect(() => {
    if (data.length === 0) {
      engineRef.current = null;
      setSteps([]);
      setResults([]);
      setIsComplete(false);
      return;
    }

    const eng = createSRTFEngine({ startTime: 0 });
    data.forEach(eng.addProcess);

    eng.onStep((s) => setSteps((xs) => [...xs, s]));
    eng.onFinish((r) => setResults((rs) => [...rs, r]));
    eng.onComplete(() => setIsComplete(true));

    engineRef.current = eng;

    // reset solo aquí
    setSteps([]);
    setResults([]);
    setIsComplete(false);
  }, [resetFlag, data.length]);

  // Intervalo controlado desde Home
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

  // === Preparar datos para la visualización ===
  const MAX_COLS = 100;

  const runningByTime = useMemo(() => {
    const m = new Map<number, number>();
    steps.forEach((s) => m.set(s.time, s.processId));
    return m;
  }, [steps]);

  const queuePosByTime = useMemo(() => {
    const map = new Map<number, Map<number, number>>();
    steps.forEach((s) => {
      const inner = new Map<number, number>();
      s.queueBefore.forEach((pid, idx) => {
        if (idx > 0) inner.set(pid, idx);
      });
      map.set(s.time, inner);
    });
    return map;
  }, [steps]);

  const procRows = useMemo(() => {
    const seen = new Set<number>();
    steps.forEach((s) => {
      seen.add(s.processId);
      s.queueBefore.forEach((pid) => seen.add(pid));
    });
    results.forEach((r) => seen.add(r.pid));

    return Array.from(seen).map((pid) => [
      pid,
      data.find((p) => p.pid === pid)?.name ?? `P${pid}`,
    ]);
  }, [steps, results, data]);

  const avgService =
    isComplete && results.length
      ? results.reduce((a, r) => a + r.serviceIndex, 0) / results.length
      : null;

  const currentTick = steps.length ? steps[steps.length - 1].time + 1 : 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* === Visualización (Gantt) === */}
      <div className="flex-1 bg-white shadow rounded-xl p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold">Visualización SRTF</h2>
          <div className="text-xs text-gray-500">
            TIME_UNIT: {TIME_UNIT} ms · Estado:{" "}
            {isComplete
              ? "Finalizado"
              : isPaused
              ? "Pausado"
              : isRunning
              ? "Corriendo"
              : "Detenido"}{" "}
            · t={currentTick}
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <table className="text-xs min-w-[1400px]">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 border text-left min-w-[80px]">Proceso</th>
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
                const color = colorForPid(Number(pid));
                return (
                  <tr key={pid} className="odd:bg-white even:bg-gray-50">
                    <td className="p-2 border font-medium">{name}</td>
                    {Array.from({ length: MAX_COLS }).map((_, t) => {
                      const runningPid = runningByTime.get(t);
                      const isRunningHere = runningPid === pid;
                      const qpos =
                        queuePosByTime.get(t)?.get(Number(pid)) ?? null;

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
      <div className="flex-1 bg-white shadow rounded-xl p-4 overflow-y-auto">
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
  );
}
