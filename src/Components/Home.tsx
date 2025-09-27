// src/Components/Home.tsx
import React, { useState } from "react";
// Importamos el simulador de SRTF (está en la carpeta Simulators)
import SRTFSimulator from "./Simulators/SRTFSimulator";

import FormProceso from "./FormProcess";
import QueueProcess from "./QuequePrecess";

// Definimos los algoritmos disponibles como un tipo 
type AlgorithmKey = "srtf" | "fcfs" | "sjf" | "rr" | "priority";

export default function Home() {
  // Estado que guarda qué algoritmo está seleccionado.
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmKey>("srtf");

  const [formData, setFormData] = useState({
    NombreProceso: "",
    Duration: 0,
    InstanteLlegada: 0,
    Quantum: 0,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const valorParsed = name === "NombreProceso" ? value : parseInt(value);
    setFormData({ ...formData, [name]: valorParsed });
  };

  const [showModal, setShowModal] = useState(false);

  // Función que decide qué simulador renderizar según el algoritmo seleccionado.
  const renderSimulator = () => {
    switch (selectedAlgo) {
      case "srtf":
        return <SRTFSimulator />;
      // case "fcfs": return <FCFSSimulator />;
      // case "sjf":  return <SJFSimulator />;
      // case "rr":   return <RoundRobinSimulator />;
      // case "priority": return <PrioritySimulator />;
      default:
        return (
          <div className="bg-white shadow rounded-xl p-6 text-center text-gray-500">
            Selecciona un algoritmo para iniciar la simulación.
          </div>
        );
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Encabezado principal */}
      <header className="bg-[#1d293d] text-white py-4 px-6 shadow">
        <h1 className="text-xl font-bold">Simulador de procesos</h1>
      </header>

      {/* Contenido principal con grid 4 columnas */}
      <main className="flex-1 p-4 grid grid-cols-4 gap-4 min-h-0">

        {/* Columna izquierda */}
        <div className="col-span-1 flex flex-col bg-white shadow rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">Lista de Procesos</h2>

            {/* Botón para abrir modal */}
            <button
              className="bg-[#314158] text-white px-3 py-1 rounded-lg text-sm"
              onClick={() => setShowModal(true)}
            > + Nuevo </button>
          </div>

          {/* Lista de procesos */}
          <div className="border rounded-lg flex flex-col items-center p-2 overflow-y-auto max-h-[450px]">
            <QueueProcess algoritmo={selectedAlgo} />
          </div>

          {/* Selector de algoritmo */}
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

          {/* Quantum visible solo si es Round Robin */}
          {selectedAlgo === "rr" && (
            <input
              type="number"
              className="mb-4 p-2 border rounded-lg w-full text-sm"
              value={formData.Quantum === 0 ? '' : formData.Quantum}
              name="Quantum"
              onChange={handleChange}
              placeholder="Quantum de tiempo"
            />
          )}

          {/* Placeholder: botón de simulación */}
          <div className="mt-4">
            <button className="w-full bg-[#314158] text-white py-2 rounded-lg font-bold">
              Simular Procesos
            </button>
          </div>
        </div>

        {/* Columna derecha: renderiza el simulador seleccionado */}
        <div className="col-span-3 min-h-0 h-full flex flex-col gap-4 overflow-y-auto pr-1">
          {renderSimulator()}
        </div>
      </main>

      {/* Pie de página */}
      <footer className="bg-gray-800 text-white py-1 text-center">
        Pie de página
      </footer>

      {/* Modal embebido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-lg p-6 w-[400px] relative">
            {/* Botón de cerrar */}
            <button
              className="absolute top-3 right-3 px-2 py-0 bg-red-500 text-white rounded"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>

            {/* Aquí metemos el formulario */}
            <FormProceso onClose={() => setShowModal(false)} algoritmo={selectedAlgo} />
          </div>
        </div>
      )}
    </div>
  );
}
