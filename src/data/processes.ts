import type { Process } from "../Components/Algorithms/common";

// Dataset inicial (puedes tener más presets después)
export const initialProcesses: Process[] = [
{ pid: 1, name: "A", arrivalTime: 0, burstTime: 5 },  // largo, llega primero
{ pid: 2, name: "B", arrivalTime: 3, burstTime: 1 },   // cortos que llegan después
{ pid: 3, name: "H", arrivalTime: 3, burstTime: 1 },
{ pid: 4, name: "E", arrivalTime: 10, burstTime: 3 },
{ pid: 5, name: "C", arrivalTime: 11, burstTime: 1 },
{ pid: 6, name: "F", arrivalTime: 12, burstTime: 1 },
];

// helper para devolver copia y evitar mutaciones directas
export function getInitialProcesses(): Process[] {
  return initialProcesses.map(p => ({ ...p }));
}
