// src/Components/Simulators/FCFSSimulator.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createFCFSEngine } from "../Algorithms/FCFS";
import {
  TIME_UNIT,
  type Process,
  type ExecutionStep,
  type ProcessResult,
} from "../Algorithms/common";
import { useProcesoContext } from "../../Context/ProcessContext";
import { jsPDF } from "jspdf";

/** Color estable por PID (HSL) para las celdas en CPU del Gantt */
function colorForPid(pid: number) {
  const hue = (pid * 67) % 360;
  return `hsl(${hue} 70% 55%)`;
}

/** Utilidad para centrar texto en una celda (PDF) */
function mmTextCentered(pdf: jsPDF, text: string, x: number, y: number, w: number) {
  const tw = pdf.getTextWidth(text);
  pdf.text(text, x + (w - tw) / 2, y);
}

interface Props {
  isRunning: boolean;
  isPaused: boolean;
  resetFlag: boolean;
}

export default function FCFSSimulator({ isRunning, isPaused, resetFlag }: Props) {
  const { procesos } = useProcesoContext();

  // Adaptar procesos del contexto al formato interno del motor FCFS
  // (en FCFS usábamos pid = índice+1 para tener IDs consecutivos)
  const data: Process[] = procesos.map((p, idx) => ({
    pid: idx + 1,
    name: p.NombreProceso,
    arrivalTime: p.InstanteLlegada,
    burstTime: p.Duration,
  }));

  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  /** -------------------- Overlay de carga sincronizado a TIME_UNIT -------------------- */
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafId = useRef<number | null>(null);

  const startOverlay = (durationMs: number) => {
    setShowOverlay(true);
    setProgress(0);
    const t0 = performance.now();
    const tick = (t: number) => {
      const ratio = Math.min(1, (t - t0) / durationMs);
      setProgress(Math.round(ratio * 100));
      if (ratio < 1) {
        rafId.current = requestAnimationFrame(tick) as unknown as number;
      }
    };
    rafId.current = requestAnimationFrame(tick) as unknown as number;
  };

  const stopOverlay = () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current as unknown as number);
      rafId.current = null;
    }
    setProgress(100);
    setShowOverlay(false);
  };
  /** ------------------------------------------------------------------------------- */

  const engineRef = useRef<ReturnType<typeof createFCFSEngine> | null>(null);

  // (Re)inicializar el motor cuando cambien procesos o reset
  useEffect(() => {
    setSteps([]);
    setResults([]);
    setIsComplete(false);
    stopOverlay();

    if (data.length === 0) {
      engineRef.current = null;
      return;
    }

    const eng = createFCFSEngine({ startTime: 0 });
    data.forEach(eng.addProcess);

    engineRef.current = eng;
  }, [resetFlag, data.length]);

  // Arranque: calcular todo “de golpe”, mostrar overlay durante TIME_UNIT y luego volcar resultados
  useEffect(() => {
    if (!engineRef.current) return;

    if (isRunning && !isPaused && !isComplete) {
      const eng = engineRef.current;
      const bufSteps: ExecutionStep[] = [];
      const bufResults: ProcessResult[] = [];

      const onStep = (s: ExecutionStep) => {
        bufSteps.push(s);
      };
      const onFinish = (r: ProcessResult) => {
        bufResults.push(r);
      };

      eng.onStep(onStep);
      eng.onFinish(onFinish);
      eng.onComplete(() => { /* se marcará al volcar buffers */ });

      // Ejecutar todo el timeline sin intervalos
      let done = false;
      while (!done) {
        done = eng.tick();
      }

      // Mostrar overlay exactamente TIME_UNIT ms y luego setear resultados
      startOverlay(TIME_UNIT);
      const t = window.setTimeout(() => {
        setSteps(bufSteps);
        // Mantener orden alfabético por nombre como en la versión original
        setResults(bufResults.sort((a, b) => a.name.localeCompare(b.name)));
        setIsComplete(true);
        stopOverlay();
        window.clearTimeout(t);
      }, TIME_UNIT);
    }
  }, [isRunning, isPaused, isComplete]);

  /** =================== Datos para la visualización =================== */
  const MAX_COLS = 100;

  const runningByTime = useMemo(() => {
    const m = new Map<number, number>();
    steps.forEach((s) => m.set(s.time, s.processId));
    return m;
  }, [steps]);

  // Mapa: t -> (pid -> posición en cola, excluyendo el que corre en CPU)
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

  /** =================== Exportación PDF (tabla sin fill, bordes y texto negros) =================== */
  function exportPdfPure() {
    const pdf = new jsPDF({ unit: "mm", format: "legal", orientation: "landscape" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;

    // Encabezado
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Simulador FCFS", margin, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    const status = isComplete ? "Finalizado" : isPaused ? "Pausado" : isRunning ? "Corriendo" : "Detenido";
    pdf.text(`Estado: ${status} · t=${currentTick}`, margin, 25);

    // Tabla resultados en nueva página
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("Resultados", margin, 18);

    const headers = ["Proceso", "Llegada", "CPU", "Finalización", "Retorno", "Espera", "Índice"];
    const colWidths = [48, 24, 20, 38, 24, 24, 24];
    const tableX = margin;
    let y = 24;

    // Encabezados: solo borde negro, sin relleno; texto negro
    pdf.setDrawColor(0);
    pdf.setTextColor(0);
    let x = tableX;
    headers.forEach((h, i) => {
      pdf.rect(x, y, colWidths[i], 11, "S");
      mmTextCentered(pdf, h, x, y + 7.2, colWidths[i]);
      x += colWidths[i];
    });
    y += 11;

    pdf.setFont("helvetica", "normal");
    const rowH = 9.5;
    const pageHInner = pageH - margin;

    results.forEach((r) => {
      if (y + rowH > pageHInner) {
        pdf.addPage();
        y = margin;
      }
      x = tableX;
      const rowVals = [
        r.name,
        String(r.arrivalTime),
        String(r.burstTime),
        String(r.finishTime),
        String(r.turnaroundTime),
        String(r.waitingTime),
        r.serviceIndex.toFixed(2),
      ];
      rowVals.forEach((val, i) => {
        pdf.rect(x, y, colWidths[i], rowH, "S"); // sólo borde
        pdf.text(String(val), x + 2, y + rowH - 2.6);
        x += colWidths[i];
      });
      y += rowH;
    });

    if (results.length) {
      if (y + rowH > pageHInner) {
        pdf.addPage();
        y = margin;
      }
      pdf.setFont("helvetica", "bold");
      pdf.text(
        `Promedio índice de servicio: ${(results.reduce((a, r) => a + r.serviceIndex, 0) / results.length).toFixed(2)}`,
        tableX,
        y + rowH
      );
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    pdf.save(`FCFS_${ts}.pdf`);
  }
  /** ============================================================================================ */

  return (
    <div className="flex flex-col h-full gap-4 relative">
      {/* ========= Overlay de carga ========= */}
      {showOverlay && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-700/70 backdrop-blur-sm rounded-xl" />
          <div className="relative z-10 flex flex-col items-center gap-4 text-white">
            <div className="relative w-40 h-40">
              <svg viewBox="0 0 120 120" className="w-full h-full">
                <circle cx="60" cy="60" r="52" stroke="rgba(255,255,255,0.25)" strokeWidth="10" fill="none" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  stroke="white"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${(progress / 100) * 326} 326`}
                  transform="rotate(-90 60 60)"
                />
                <text
                  x="60"
                  y="65"
                  textAnchor="middle"
                  fontSize="28"
                  fontFamily="Inter, system-ui, Arial"
                  fill="#fff"
                >
                  {progress}%
                </text>
              </svg>
            </div>
            <div className="text-sm tracking-widest opacity-90">CALCULANDO…</div>
          </div>
        </div>
      )}

      {/* === Visualización (Gantt) === */}
      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-4 overflow-y-auto">
        <div className="flex itemscenter justify-between mb-3 border-b border-slate-200 pb-2">
          <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            📊 Visualización FCFS
          </h2>
          <div className="text-xs text-slate-500">
            ⏱ {TIME_UNIT} ms ·{" "}
            {isComplete ? "✅ Finalizado" : isPaused ? "⏸ Pausado" : isRunning ? "▶ Corriendo" : "⏹ Detenido"} · t=
            {currentTick}
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
                      (t === currentTick - 1 ? "bg-slate-200 text-slate-900 font-bold" : "")
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
                    <td className="p-2 border border-slate-200 font-medium text-slate-700">{name}</td>
                    {Array.from({ length: MAX_COLS }).map((_, t) => {
                      const runningPid = runningByTime.get(t);
                      const isRunningHere = runningPid === pid;
                      const qpos = queuePosByTime.get(t)?.get(Number(pid)) ?? null;

                      // Sólo mostrar número de cola si ya llegó al sistema
                      const procArrival =
                        data.find((p) => p.pid === pid)?.arrivalTime ?? Number.POSITIVE_INFINITY;
                      const inQueue = qpos && t >= procArrival;

                      return (
                        <td
                          key={t}
                          className={
                            "border border-slate-200 text-center align-middle h-7 min-w-[36px] " +
                            (isRunningHere ? "text-white font-bold" : inQueue ? "text-slate-600" : "text-slate-300")
                          }
                          style={{ background: isRunningHere ? color : undefined }}
                          title={
                            isRunningHere
                              ? `t=${t}: ${name} en CPU`
                              : inQueue
                              ? `t=${t}: ${name} en cola (#${qpos})`
                              : `t=${t}`
                          }
                        >
                          {isRunningHere ? "●" : inQueue ? qpos : ""}
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
                <tr key={r.pid} className="odd:bg-white even:bg-slate-50 hover:bg-slate-100 transition-colors">
                  <td className="px-3 py-2 border border-slate-200 font-medium text-slate-700">{r.name}</td>
                  <td className="px-3 py-2 border border-slate-200 text-center">{r.arrivalTime}</td>
                  <td className="px-3 py-2 border border-slate-200 text-center">{r.burstTime}</td>
                  <td className="px-3 py-2 border border-slate-200 text-center">{r.finishTime}</td>
                  <td className="px-3 py-2 border border-slate-200 text-center">{r.turnaroundTime}</td>
                  <td className="px-3 py-2 border border-slate-200 text-center">{r.waitingTime}</td>
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
                  {avgService === null ? "Promedio índice (al finalizar):" : "Promedio índice:"}
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
        </div>

        {/* Botón Exportar PDF – dentro del contenedor gris */}
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
  );
}
