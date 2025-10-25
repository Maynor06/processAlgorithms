// src/Components/Simulators/RoundRobinSimulator.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoundRobinEngine } from "../Algorithms/RoundRobin";
import {
  TIME_UNIT,
  type Process,
  type ProcessResult,
  type ExecutionStep,
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
/* ========= UI: Overlay de carga ========= */
function LoadingOverlay({
  visible,
  percent,
}: {
  visible: boolean;
  percent: number;
}) {
  if (!visible) return null;
  return (
    <div className="absolute bottom-0 left-0 w-full h-1/2 z-20 flex items-center justify-center bg-slate-700/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-40 h-40 rounded-full border-8 border-slate-600/40">
          <div
            className="absolute inset-0 rounded-full border-8"
            style={{
              borderColor: "#cbd5e1 transparent #cbd5e1 transparent",
              borderStyle: "solid",
              animation: "rr_spin 1.1s linear infinite",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white text-4xl font-extrabold">
            {Math.min(100, Math.max(0, Math.floor(percent)))}%
          </div>
        </div>
        <div className="text-slate-200 tracking-widest">CALCULANDO…</div>
      </div>
      <style>{`
        @keyframes rr_spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }
      `}</style>
    </div>
  );
}
/* ========= Props ========= */
interface Props {
  isRunning: boolean;
  isPaused: boolean;
  resetFlag: boolean;
  /** Quantum recibido desde el componente padre */
  quantum: number;
}

/* ========= Constantes locales ========= */
const MAX_COLS = 100;

export default function RoundRobinSimulator({
  isRunning,
  isPaused,
  resetFlag,
  quantum,
}: Props) {
  const { procesos } = useProcesoContext();

  // Adaptar datos desde el contexto
  const data: Process[] = procesos.map((p) => ({
    pid: p.PID,
    name: p.NombreProceso,
    burstTime: p.Duration,
    arrivalTime: p.InstanteLlegada,
  }));

  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Progreso / overlay de carga
  const [progressPct, setProgressPct] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  const engineRef = useRef<ReturnType<typeof createRoundRobinEngine> | null>(
    null
  );
  const timerRef = useRef<number | null>(null);

  /* ========= Crear / resetear motor ========= */
  useEffect(() => {
    if (data.length === 0) {
      engineRef.current = null;
      setSteps([]);
      setResults([]);
      setIsComplete(false);
      setShowOverlay(false);
      setProgressPct(0);
      return;
    }

    const eng = createRoundRobinEngine({ startTime: 0, quantum });

    // Arrancamos overlay/progreso cada vez que se re-crea el motor
    setShowOverlay(true);
    setProgressPct(0);

    data.forEach(eng.addProcess);

    // cada "tick" notificado actualiza steps + progreso
    eng.onStep((s) => {
      setSteps((xs) => [...xs, s]);
      const { executed, totalBurst } = eng.stats();
      const pct =
        totalBurst > 0 ? Math.min(99, Math.round((executed / totalBurst) * 100)) : 0;
      setProgressPct(pct);
    });

    eng.onFinish((r) => setResults((rs) => [...rs, r]));

    eng.onComplete(() => {
      setIsComplete(true);
      setProgressPct(100);
      // pequeño delay para que se vea el 100%
      setTimeout(() => setShowOverlay(false), TIME_UNIT);
    });

    engineRef.current = eng;

    // limpiar estados visibles
    setSteps([]);
    setResults([]);
    setIsComplete(false);
  }, [resetFlag, data.length, quantum]); // reconstruye motor cuando cambia cantidad/quantum/reset

  /* ========= Bucle de reloj controlado por Home ========= */
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

  /* ========= Derivados para la visualización ========= */
  const runningByTime = useMemo(() => {
    const m = new Map<number, number>();
    steps.forEach((s) => m.set(s.time, s.processId));
    return m;
  }, [steps]);

  // posiciones 1-based excluyendo el que está en CPU
  const queuePosByTime = useMemo(() => {
    const map = new Map<number, Map<number, number>>(); // t -> (pid -> pos)
    steps.forEach((s) => {
      const inner = new Map<number, number>();
      let pos = 1;
      s.queueBefore
        .filter((pid) => pid !== s.processId)
        .forEach((pid) => {
          inner.set(pid, pos++);
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

  /* ========= Exportación PDF (legal landscape) ========= */
  function exportPdfPure() {
    const pdf = new jsPDF({
      unit: "mm",
      format: "legal",
      orientation: "landscape",
    });
    const pageW = pdf.internal.pageSize.getWidth(); // ~356
    const pageH = pdf.internal.pageSize.getHeight(); // ~216
    const margin = 12;

    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Simulador Round Robin", margin, 18);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    const status = isComplete
      ? "Finalizado"
      : isPaused
      ? "Pausado"
      : isRunning
      ? "Corriendo"
      : "Detenido";
    pdf.text(
      `Quantum: ${quantum} · Estado: ${status} · t=${currentTick}`,
      margin,
      25
    );

    // -------- Gantt ----------
    const procColW = 40;
    const cellW = 10;
    const cellH = 8.8;
    const headH = 11;
    const top = 34;

    const usableW = pageW - margin * 2 - procColW;
    const colsPerPage = Math.max(1, Math.floor(usableW / cellW));
    const maxTime = Math.min(
      MAX_COLS,
      Math.max(currentTick, ...Array.from(runningByTime.keys(), (k) => k + 1))
    );

    const drawGanttPage = (tStart: number) => {
      const tEnd = Math.min(maxTime, tStart + colsPerPage);

      pdf.setDrawColor(120);
      pdf.setLineWidth(0.2);

      // header
      pdf.setFillColor(200, 208, 220);
      pdf.rect(margin, top, procColW, headH, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 0, 0);
      mmTextCentered(pdf, "PROCESO", margin, top + headH / 2 + 3, procColW);

      for (let t = tStart; t < tEnd; t++) {
        const x = margin + procColW + (t - tStart) * cellW;
        pdf.setFillColor(200, 208, 220);
        pdf.rect(x, top, cellW, headH, "FD");
        pdf.setFont("helvetica", "normal");
        mmTextCentered(pdf, String(t), x, top + headH / 2 + 3, cellW);
      }

      // filas
      let y = top + headH;
      for (const [pid, name] of procRows) {
        pdf.setFillColor(245, 247, 250);
        pdf.rect(margin, y, procColW, cellH, "FD");
        pdf.setTextColor(60);
        pdf.text(String(name), margin + 2, y + cellH - 2);

        for (let t = tStart; t < tEnd; t++) {
          const x = margin + procColW + (t - tStart) * cellW;
          pdf.setDrawColor(220);
          pdf.setFillColor(255, 255, 255);
          pdf.rect(x, y, cellW, cellH, "S");

          const runningPid = runningByTime.get(t);
          const isRunningHere = runningPid === pid;
          const qpos = queuePosByTime.get(t)?.get(Number(pid)) ?? null;

          if (isRunningHere) {
            const [r, g, b] = hslStringToRgb(colorForPid(Number(pid)));
            pdf.setFillColor(r, g, b);
            const cx = x + cellW / 2;
            const cy = y + cellH / 2;
            const radius = Math.min(cellW, cellH) * 0.33;
            pdf.circle(cx, cy, radius, "F");
          } else if (qpos !== null) {
            pdf.setTextColor(80);
            mmTextCentered(pdf, String(qpos), x, y + cellH - 2.6, cellW);
          }
        }
        y += cellH;
      }

      pdf.setDrawColor(120);
      pdf.rect(
        margin,
        top,
        procColW + (tEnd - tStart) * cellW,
        headH + procRows.length * cellH,
        "S"
      );
    };

    let first = true;
    for (let tStart = 0; tStart < maxTime; tStart += colsPerPage) {
      if (!first) pdf.addPage();
      first = false;
      drawGanttPage(tStart);
    }

    // -------- Tabla de resultados (fondo transparente, bordes negros, texto negro) ----------
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Resultados", margin, 18);

    const headers = [
      "Proceso",
      "Llegada",
      "CPU",
      "Finalización",
      "Retorno",
      "Espera",
      "Índice",
    ];
    const colWidths = [48, 24, 20, 38, 24, 24, 24];
    const tableX = margin;
    const rowH = 9.5;
    const headH2 = 11;
    const pageHInner = pageH - margin;
    let y = 24;

    // dibujar cabecera sin relleno (transparente), texto negro, bordes negros
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.setDrawColor(0, 0, 0);
    let x = tableX;
    headers.forEach((h, i) => {
      pdf.rect(x, y, colWidths[i], headH2, "S"); // solo borde
      mmTextCentered(pdf, h, x, y + 7, colWidths[i]);
      x += colWidths[i];
    });
    y += headH2;

    // filas
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    results.forEach((r) => {
      if (y + rowH > pageHInner) {
        pdf.addPage();
        y = margin;
        // reimprimir cabecera en nueva página
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.setDrawColor(0, 0, 0);
        x = tableX;
        headers.forEach((h, i) => {
          pdf.rect(x, y, colWidths[i], headH2, "S");
          mmTextCentered(pdf, h, x, y + 7, colWidths[i]);
          x += colWidths[i];
        });
        y += headH2;
        pdf.setFont("helvetica", "normal");
      }

      x = tableX;
      const vals = [
        r.name,
        String(r.arrivalTime),
        String(r.burstTime),
        String(r.finishTime),
        String(r.turnaroundTime),
        String(r.waitingTime),
        r.serviceIndex.toFixed(2),
      ];
      vals.forEach((val, i) => {
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(x, y, colWidths[i], rowH, "S"); // solo borde
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
      pdf.setTextColor(0, 0, 0);
      const avg =
        results.reduce((a, r) => a + r.serviceIndex, 0) / results.length;
      pdf.text(
        `Promedio índice de servicio: ${avg.toFixed(2)}`,
        tableX,
        y + rowH
      );
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    pdf.save(`RoundRobin_${ts}.pdf`);
  }

  /* ========= Render ========= */
  return (
    <div className="relative flex flex-col h-full gap-4">
      {/* Overlay de carga */}
      <LoadingOverlay visible={showOverlay} percent={progressPct} />

      {/* === Visualización (Gantt) === */}
      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
          <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            📊 Visualización Round Robin
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
                    className="border border-slate-600 bg-slate-400 px-3 py-1 font-normal"
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
                      const qpos =
                        queuePosByTime.get(t)?.get(Number(pid)) ?? null;

                      const procArrival =
                        data.find((p) => p.pid === pid)?.arrivalTime ?? Infinity;
                      const inQueue = qpos !== null && t >= procArrival;

                      return (
                        <td
                          key={t}
                          className={
                            "border border-slate-200 text-center align-middle h-7 min-w-[36px] " +
                            (isRunningHere
                              ? "text-white font-bold"
                              : inQueue
                              ? "text-slate-600"
                              : "text-slate-300")
                          }
                          style={{
                            background: isRunningHere ? color : undefined,
                          }}
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
                <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">
                  Proceso
                </th>
                <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">
                  Llegada
                </th>
                <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">
                  CPU
                </th>
                <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">
                  Finalización
                </th>
                <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">
                  Retorno
                </th>
                <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">
                  Espera
                </th>
                <th className="px-3 py-2 border border-slate-600 text-left bg-slate-400">
                  Índice
                </th>
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
                <td
                  className="px-3 py-2 border border-slate-200 text-center"
                  colSpan={5}
                ></td>
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
  );
}
