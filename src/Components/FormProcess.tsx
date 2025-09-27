import React, { useEffect, useState } from 'react';
import '../styles/FormProceso.css'
import { useProcesoContext } from '../Context/ProcessContext';

interface FormProcesoProps {
    onClose: () => void;
    algoritmo: string; // Se recibe el algoritmo actual

}

const FormProceso: React.FC<FormProcesoProps> = ({ onClose, algoritmo }) => {

    const { agregarProceso } = useProcesoContext();
    const [formData, setFormData] = useState({
        NombreProceso: '',
        Duration: 0,
        InstanteLlegada: 0,
        Quantum: 0,
    });

    const [showModal, setShowModal] = useState(1);
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        const valorParsed = name === "NombreProceso" ? value : parseInt(value);
        setFormData({ ...formData, [name]: valorParsed });
    };


    //Codigo relacionado al nombre aleatorio
    const [contador, setContador] = useState(1);

    const generarNombreProceso = () => {
        // Devuelve Task con número en formato 3 dígitos
        return `Task${String(contador).padStart(4, "0")}`;
    };


    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        // genera un nombre aleatorio, si el campo esta vacio
        const nombreFinal = formData.NombreProceso.trim() || generarNombreProceso();

        // if (formData.MemoriaRequired <= 0) {
        //     setErrorMessage('La memoria requerida debe ser mayor a 0.');
        //     return;
        // }

        // if (formData.MemoriaRequired >= 1024) {
        //     setErrorMessage('La memoria requerida debe ser menor a 1024MB (1GB).');
        //     return;
        // }

        if (formData.Duration <= 0) {
            setErrorMessage('La duración debe ser mayor a 0 segundos.');
            return;
        }

        if (formData.Duration > 60) {
            setErrorMessage('La duración debe ser menor a 60 segundos.');
            return;
        }

        // if (formData.UnidadEntrada < 0) {
        //     setErrorMessage('la unidad debe ser igual o mayor a 0')
        //     return;
        // }

        if (formData.InstanteLlegada < 0) {
            setErrorMessage('El instante de llegada no puede ser negativo.');
            return;
        }

        // if (algoritmo === "rr" && formData.Quantum <= 0) {
        //     setErrorMessage('El Quantum debe ser mayor a 0 en Round Robin.');
        //     return;
        // }

        const newProceso = {
            PID: Date.now(),
            ...formData,
            // si estaba vacío, se genera automáticamente
            NombreProceso: nombreFinal,
            Quantum: algoritmo === "rr" ? formData.Quantum : null, // solo si aplica
        };

        agregarProceso(newProceso);

        // Incrementa el contador
        if (!formData.NombreProceso.trim()) {
            setContador(contador + 1);
        }

        //Limpia los campos
        setFormData({
            NombreProceso: '',
            // MemoriaRequired: 0,
            Duration: 0,
            InstanteLlegada: 0,
            // UnidadEntrada: 0,
            Quantum: 0
        });

        setErrorMessage('');
        onClose();
    };


    return (
        <form className="form" onSubmit={handleSubmit}>
            <h2 className="font-bold text-xl text-center">Nuevo Proceso</h2>

            <input
                type="text"
                className="shadow-2xl"
                value={formData.NombreProceso}
                name="NombreProceso"
                onChange={handleChange}
                placeholder="Nombre del proceso"
            />

            {/* eliminar input */}
            {/* <input
                type="number"
                className="shadow-2xl"
                value={formData.MemoriaRequired === 0 ? '' : formData.MemoriaRequired}
                name="MemoriaRequired"
                onChange={handleChange}
                placeholder="Memoria requerida (MB)"
            /> */}

            <input
                type="number"
                className="shadow-2xl"
                value={formData.Duration === 0 ? '' : formData.Duration}
                name="Duration"
                onChange={handleChange}
                placeholder="Tiempo en CPU"
            />

            <input
            type="number"
            className="shadow-2xl"
            value={formData.InstanteLlegada}
            name="InstanteLlegada"
            onChange={handleChange}
            placeholder="Instante de llegada"
            />


            {/* <input
                type="number"
                className="shadow-2xl"
                value={formData.UnidadEntrada === 0 ? '' : formData.UnidadEntrada}
                name="UnidadEntrada"
                onChange={handleChange}
                placeholder="Unidad Entrada"
            /> */}

            {/* {algoritmo === "rr" && (
                <input
                    type="number"
                    className="shadow-2xl"
                    value={formData.Quantum === 0 ? '' : formData.Quantum}
                    name="Quantum"
                    onChange={handleChange}
                    placeholder="Quantum de tiempo"
                // disabled={algoritmo !== "rr"} //caso round robin
                // hidden={algoritmo !== "rr"}
                />
            )} */}

            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

            <button type="submit" className="bg-[#314158] text-white rounded-lg py-2">
                Crear Proceso
            </button>
        </form>
    );
};

export default FormProceso;