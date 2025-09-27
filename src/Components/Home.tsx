// src/Components/Home.tsx
import React, { useState } from "react";
import SRTFSimulator from "./Simulators/SRTFSimulator";

import FormProceso from "./FormProcess";
import QueueProcess from "./QuequePrecess";

type AlgorithmKey = "srtf" | "fcfs" | "sjf" | "rr" | "priority";

export default function Home() {
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmKey>("srtf");

  const [formData, setFormData] = useState({
    NombreProceso: "",
    Duration: 0,
    InstanteLlegada: 0,
    Quantum: 0,
  });

  const [showModal, setShowModal] = useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [resetFlag, setResetFlag] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const valorParsed = name === "NombreProceso" ? value : parseInt(value);
    setFormData({ ...formData, [name]: valorParsed });
  };

  const handleStart = () => {
     if (!formData.NombreProceso || formData.tiempo <= 0) {
    alert("Por favor ingrese todos los datos antes de iniciar");
    return;
  }
    setIsRunning(true);
    setIsPaused(false);
    setResetFlag(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
  };

  const renderSimulator = () => {
    switch (selectedAlgo) {
      case "srtf":
        return (
          <SRTFSimulator
            isRunning={isRunning}
            isPaused={isPaused}
            resetFlag={resetFlag}
          />
        );
      // case "fcfs": return <FCFSSimulator ... />;
      // case "sjf": return <SJFSimulator ... />;
      // case "rr": return <RoundRobinSimulator ... />;
      // case "priority": return <PrioritySimulator ... />;
      default:
        return (
          <div className="bg-white shadow rounded-xl p-6 text-center text-gray-500">
            Selecciona un algoritmo para iniciar la simulación.
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-200">
      <header className="bg-slate-900 text-white py-4 px-6 shadow">
        <h1 className="text-3xl font-bold"style={{fontFamily: 'Zalando Sans Expanded, sans-serif'}}>Simulador de procesos</h1>
      </header>

      <main className="flex-1 p-4 grid grid-cols-4 gap-4 min-h-0 ">
        {/* Columna izquierda */}
  <div className="col-span-1 flex flex-col bg-white shadow-lg rounded-xl p-4 h-[660px]">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Lista de Procesos</h2>
            <button
              className="bg-[#314158] text-white px-3 py-1 rounded-lg text-sm"
              onClick={() => setShowModal(true)}
            >
              + Nuevo
            </button>
          </div>

          <div className="border rounded-lg shadow-lg flex flex-col items-center p-2 overflow-y-auto max-h-[450px]">
            <QueueProcess algoritmo={selectedAlgo} />
          </div>

          <label className="text-sm font-medium mb-1">Algoritmo:</label>
          <select
            className="mb-4 p-2 border rounded-lg w-full text-sm"
            value={selectedAlgo}
            onChange={(e) => setSelectedAlgo(e.target.value as AlgorithmKey)}
          >
            <option value="fcfs">FCFS (First Come, First Served)</option>
            <option value="sjf">SJF (Shortest Job First)</option>
            <option value="srtf">SRTF (Shortest Remaining Time First)</option>
            <option value="rr">Round Robin</option>
            <option value="priority">Por Prioridad</option>
          </select>

          {selectedAlgo === "rr" && (
            <input
              type="number"
              className="mb-4 p-2 border rounded-lg w-full text-sm"
              value={formData.Quantum === 0 ? "" : formData.Quantum}
              name="Quantum"
              onChange={handleChange}
              placeholder="Quantum de tiempo"
            />
          )}

          {/* Controles de simulación */}
          <div className="mt-2 flex flex-row flex-wrap justify-center text-sm">
            {!isRunning && (
              <button
                className="bg-slate-600 hover:bg-slate-700 text-white px-20 py-2 rounded"
                onClick={handleStart}
              >
                Iniciar
              </button>
            )}
            {isRunning && !isPaused && (
              <button
                className="bg-red-400 hover:bg-red-500 text-white px-2 py-1 rounded mr-2"
                onClick={handlePause}
              >
                Pausar
              </button>
            )}
            {isRunning && isPaused && (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-2"
                onClick={handleResume}
              >
                Reanudar
              </button>
            )}
            {(isRunning || resetFlag) && (
              <button
                className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded mr-2"
                onClick={handleReset}
              >
                Reiniciar
              </button>
            )}
          </div>
        </div>

        {/* Columna derecha */}
      <div className="col-span-3 min-h-0 h-full flex flex-col gap-4 pr-1">
        {/* El simulador se encargará de que cada bloque tenga su propio scroll */}
        {renderSimulator()}
      </div>
      </main>


      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] relative">
            <button
              className="absolute top-3 right-3 px-2 py-0 bg-red-500 text-white rounded"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <FormProceso
              onClose={() => setShowModal(false)}
              algoritmo={selectedAlgo}
            />
          </div>
        </div>
      )}
    </div>
  );
}
