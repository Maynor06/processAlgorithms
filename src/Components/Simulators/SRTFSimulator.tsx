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
import { jsPDF } from "jspdf";

/* ========= helpers de color / PDF ========= */
function colorForPid(pid: number) {
  const hue = (pid * 67) % 360;
  return `hsl(${hue} 70% 55%)`;
}
function hslStringToRgb(hsl: string): [number, number, number] {
  const m =
    hsl.match(
      /hsl\(\s*([\d.]+)\s*(?:,|\s)\s*([\d.]+)%\s*(?:,|\s)\s*([\d.]+)%\s*\)/i
    ) || [];
  let h = parseFloat(m[1] ?? "0");
  let s = parseFloat(m[2] ?? "0") / 100;
  let l = parseFloat(m[3] ?? "0") / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m2 = l - c / 2;
  const r = Math.round((r1 + m2) * 255);
  const g = Math.round((g1 + m2) * 255);
  const b = Math.round((b1 + m2) * 255);
  return [r, g, b];
}
function mmTextCentered(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  w: number
) {
  const tw = pdf.getTextWidth(text);
  pdf.text(text, x + (w - tw) / 2, y);
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
    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
        <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          📊 Visualización SRTF
        </h2>
        <div className="text-xs text-slate-500">
          ⏱ {TIME_UNIT} ms ·{" "}
          {isComplete
            ? "✅ Finalizado"
            : isPaused
            ? "⏸ Pausado"
            : isRunning
            ? "▶ Corriendo"
            : "⏹ Detenido"}{" "}
          · t={currentTick}
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white">
        <table className="text-xs min-w-[1200px]">
          <thead className="bg-slate-100 text-slate-700 sticky top-0">
            <tr>
              <th className="p-2 border border-slate-600 bg-slate-400 text-left min-w-[80px] font-medium">
                PROCESO
              </th>
              {Array.from({ length: MAX_COLS }).map((_, t) => (
                <th
                  key={t}
                  className={
                    "border border-slate-600 bg-slate-400 px-3 py-1 font-normal " +
                    (t === currentTick - 1
                      ? "bg-slate-200 text-slate-900 font-bold"
                      : "")
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
                <tr
                  key={pid}
                  className="odd:bg-white even:bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <td className="p-2 border border-slate-200 font-medium text-slate-700">
                    {name}
                  </td>
                  {Array.from({ length: MAX_COLS }).map((_, t) => {
                    const runningPid = runningByTime.get(t);
                    const isRunningHere = runningPid === pid;
                    const qpos = queuePosByTime.get(t)?.get(Number(pid)) ?? null;

                    return (
                      <td
                        key={t}
                        className={
                          "border border-slate-200 text-center align-middle h-7 min-w-[36px] " +
                          (isRunningHere
                            ? "text-white font-bold"
                            : "text-slate-400")
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
                        {isRunningHere ? "●" : qpos ? qpos : ""}
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
    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center gap-2">
        📑 Resultados
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-slate-100 text-slate-700 uppercase text-xs tracking-wider">
              <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">Proceso</th>
              <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">Llegada</th>
              <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">CPU</th>
              <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">Finalización</th>
              <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">Retorno</th>
              <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">Espera</th>
              <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">Índice</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr
                key={r.pid}
                className="odd:bg-white even:bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <td className="px-3 py-2 border border-slate-200 font-medium text-slate-700">
                  {r.name}
                </td>
                <td className="px-3 py-2 border border-slate-200 text-center">
                  {r.arrivalTime}
                </td>
                <td className="px-3 py-2 border border-slate-200 text-center">
                  {r.burstTime}
                </td>
                <td className="px-3 py-2 border border-slate-200 text-center">
                  {r.finishTime}
                </td>
                <td className="px-3 py-2 border border-slate-200 text-center">
                  {r.turnaroundTime}
                </td>
                <td className="px-3 py-2 border border-slate-200 text-center">
                  {r.waitingTime}
                </td>
                <td className="px-3 py-2 border border-slate-200 text-center">
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                    {r.serviceIndex.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="px-3 py-2 border border-slate-200 text-slate-700 font-medium">
                {avgService === null
                  ? "Promedio índice (al finalizar):"
                  : "Promedio índice:"}
              </td>
              <td className="px-3 py-2 border border-slate-200 text-center" colSpan={5}></td>
              <td className="px-3 py-2 border border-slate-200 text-center">
                {avgService === null ? (
                  "—"
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-slate-300 text-slate-800">
                    {avgService.toFixed(2)}
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
        {/* Botón Exportar PDF – dentro del contenedor gris, alineado a la izquierda */}
        <div className="mt-4 flex justify-start">
          <button
            onClick={exportPdfPure}
            aria-label="Exportar visualización y resultados a PDF"
            className="
              inline-flex items-center gap-2
              px-5 py-2.5 rounded-lg
              bg-slate-800 text-white
              font-semibold tracking-wide
              shadow-md shadow-slate-300/60
              hover:bg-slate-700
              active:scale-[0.98]
              focus:outline-none focus:ring-4 focus:ring-slate-300
              transition
            "
            title="Exportar visualización y resultados a PDF"
          >
            ⬇️ Exportar PDF
          </button>
        </div>
      </div>
    </div>
  </div>
);





}
