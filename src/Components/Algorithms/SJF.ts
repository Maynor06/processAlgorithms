import type { Proceso } from "../../Context/ProcessContext";

export const SJF = (procesos: Proceso[]): Proceso[] => {
  return [...procesos].sort((a, b) => {
    if (a.Duration === b.Duration) {
      return a.UnidadEntrada - b.UnidadEntrada;
    }
    return a.Duration - b.Duration;
  });
};