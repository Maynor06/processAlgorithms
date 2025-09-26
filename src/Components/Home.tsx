import React from "react";

/**
 * Este componente define la estructura principal (layout) de la app.
 * Ahora añadimos:
 * - Encabezado fijo con el título "Simulador de procesos".
 * - Pie de página.
 * - Un selector (dropdown) en la columna izquierda.
 */
export default function Home() {
  return (
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Encabezado */}
      <header className="bg-blue-600 text-white py-4 px-6 shadow">
        <h1 className="text-xl font-bold">Simulador de procesos</h1>
      </header>



      {/* Contenido principal */}
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
          {/* Panel superior: simulación */}
          <div className="flex-1 bg-white shadow rounded-xl p-4">
            <h2 className="text-lg font-bold mb-2">Visualización</h2>
            <div className="flex-1 border rounded-lg flex items-center justify-center text-gray-400">
              (Aquí irá la simulación visual)
            </div>
          </div>

          {/* Panel inferior: tabla de resultados */}
          <div className="bg-white shadow rounded-xl p-4">
            <h2 className="text-lg font-bold mb-2">Resultados</h2>
            <div className="border rounded-lg flex items-center justify-center text-gray-400 h-40">
              (Aquí irá la tabla)
            </div>
          </div>
        </div>
      </main>

      {/* Pie de página */}
      <footer className="bg-gray-800 text-white py-3 text-center">
        Pie de página
      </footer>
    </div>
  );
}
