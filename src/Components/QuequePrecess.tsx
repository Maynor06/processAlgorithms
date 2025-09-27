import { motion, AnimatePresence } from "framer-motion";
import { useProcesoContext } from "../Context/ProcessContext";

const QuequeProcess = ({ algoritmo }: { algoritmo: string }) => {

    const { procesos, finalizarProceso } = useProcesoContext();


    return (
        <>
            {/* <div className="bg-transparent w-[400px] h-[500px] rounded-3xl border-3 border-violet-300 overflow-hidden" > */}
            {/* <h1 className="bg-transparent text-3xl font-bold text-center text-violet-400 border-b-2 w-fit ml-auto mr-auto " style={{ fontFamily: "'Coiny', sans-serif" }} >Procesos a ejecutar</h1> */}
            {/* <div className="bg-transparent" style={{height: '470px', overflowY: 'auto', paddingRight: '8px', paddingBottom: '12px'}}> */}
            <AnimatePresence>
                {procesos.length !== 0 ? (
                    procesos.map((proceso) => (
                        <motion.div
                            key={proceso.PID}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            transition={{ duration: 0.5 }}
                            className="relative bg-[#F8F8FF] w-[85%] p-4 ml-auto mr-auto mt-6 mb-2 text-center rounded-2xl shadow-2xl"
                        >
                            <button className="absolute top-3 right-3 px-2 py-0 bg-red-500 text-white rounded" onClick={() => finalizarProceso(proceso.PID)}>
                                ×
                            </button>


                            <p className="text-[#A9A9A9] text-[12px] " >{proceso.PID} </p>
                            <h2 className="font-bold text-2xl " >{proceso.NombreProceso}</h2>
                            {/* <p className="text-[17px] " >Memoria requerida: {proceso.MemoriaRequired} Mb</p> */}
                            <p>Tiempo en CPU:  {proceso.Duration}s </p>
                            <p>Instante llegada:  {proceso.InstanteLlegada}s </p>
                            {/* <p>Unidad de Entrada: {proceso.UnidadEntrada}</p> */}

                            {/* muestra la propiedad Quantum si el algoritmo es rr */}
                            {/* {algoritmo === "rr" && (
                                <p>Quantum: {proceso.Quantum}</p>
                            )} */}


                        </motion.div>
                    ))
                ) : <motion.div className="flex items-center justify-center h-100 w-full text-center text-sm text-gray-300" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontFamily: "'Press Start 2P', system-ui" }} >Lista vacia</motion.div>}
            </AnimatePresence>
            {/* </div> */}
            {/* </div> */}
        </>
    )
}

export default QuequeProcess