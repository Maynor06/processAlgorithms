// src/Components/Home.tsx
import React, { useState } from "react";
// Importamos el simulador de SRTF (está en la carpeta Simulators)
import SRTFSimulator from "./Simulators/SRTFSimulator";

// Definimos los algoritmos disponibles como un tipo 
type AlgorithmKey = "srtf" | "fcfs" | "sjf" | "rr" | "priority";

export default function Home() {
  // Estado que guarda qué algoritmo está seleccionado.
  // Por ahora lo dejamos fijo en "srtf".
  const [selectedAlgo] = useState<AlgorithmKey>("srtf");

  // Función que decide qué simulador renderizar según el algoritmo seleccionado.
  // Esto nos permite en un futuro agregar FCFS, SJF, Round Robin, etc.
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
      <header className="bg-blue-600 text-white py-4 px-6 shadow">
        <h1 className="text-xl font-bold">Simulador de procesos</h1>
      </header>

      {/* Contenido principal con grid 4 columnas */}


      <main className="flex-1 p-4 grid grid-cols-4 gap-4">
        
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




        {/* Columna derecha: renderiza el simulador seleccionado */}
        <div className="col-span-3 flex flex-col gap-4">{renderSimulator()}</div>
      </main>

      {/* Pie de página */}
      <footer className="bg-gray-800 text-white py-3 text-center">
        Pie de página
      </footer>
    </div>
  );
}