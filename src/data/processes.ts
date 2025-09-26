import type { Process } from "../Components/Algorithms/common";

// Dataset inicial (puedes tener más presets después)
export const initialProcesses: Process[] = [
  { pid: 1,  name: "A", arrivalTime: 0,  burstTime: 2 },
  { pid: 2,  name: "B", arrivalTime: 1,  burstTime: 3 },
  { pid: 3,  name: "C", arrivalTime: 2,  burstTime: 4 }, // fuerza preemption temprana
  { pid: 4,  name: "D", arrivalTime: 3,  burstTime: 2 },
  { pid: 5,  name: "E", arrivalTime: 3,  burstTime: 6 },
  { pid: 6,  name: "F", arrivalTime: 4,  burstTime: 5 },
  { pid: 7,  name: "G", arrivalTime: 5,  burstTime: 2 },
  { pid: 8,  name: "H", arrivalTime: 6,  burstTime: 4 },
  { pid: 9,  name: "I", arrivalTime: 7,  burstTime: 3 },
  { pid: 10, name: "J", arrivalTime: 8,  burstTime: 1 }, // otro corto para SRTF
  { pid: 11, name: "K", arrivalTime: 9,  burstTime: 2 },
  { pid: 12, name: "L", arrivalTime: 10, burstTime: 4 },
  { pid: 13, name: "M", arrivalTime: 11, burstTime: 2 },
  { pid: 14, name: "N", arrivalTime: 12, burstTime: 3 },
  { pid: 15, name: "O", arrivalTime: 13, burstTime: 5 },
];

// helper para devolver copia y evitar mutaciones directas
export function getInitialProcesses(): Process[] {
  return initialProcesses.map(p => ({ ...p }));
}
