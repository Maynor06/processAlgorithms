import React, { useEffect, useState } from 'react';
import '../styles/FormProceso.css'
import { useProcesoContext } from '../Context/ProcessContext';

interface FormProcesoProps {
    onClose: () => void;
}

const FormProceso: React.FC<FormProcesoProps> = ({ onClose }) => {

    const { agregarProceso } = useProcesoContext();
    const [formData, setFormData] = useState({
        NombreProceso: '',
        MemoriaRequired: 0,
        Duration: 0,
        UnidadEntrada: 0,
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

        if (formData.MemoriaRequired <= 0) {
            setErrorMessage('La memoria requerida debe ser mayor a 0.');
            return;
        }

        if (formData.MemoriaRequired >= 1024) {
            setErrorMessage('La memoria requerida debe ser menor a 1024MB (1GB).');
            return;
        }

        if (formData.Duration <= 0) {
            setErrorMessage('La duración debe ser mayor a 0 segundos.');
            return;
        }

        if (formData.Duration > 60) {
            setErrorMessage('La duración debe ser menor a 60 segundos.');
            return;
        }
        if (formData.UnidadEntrada < 0) {
            setErrorMessage('la unidad debe ser igual o mayor a 0')
            return;
        }

        const newProceso = {
            PID: Date.now(),
            ...formData,
            // si estaba vacío, se genera automáticamente
            NombreProceso: nombreFinal
        };

        agregarProceso(newProceso);

        // Incrementa el contador
        if (!formData.NombreProceso.trim()) {
            setContador(contador + 1);
        }

        //Limpia los campos
        setFormData({
            NombreProceso: '',
            MemoriaRequired: 0,
            Duration: 0,
            UnidadEntrada: 0
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
                placeholder="Ingresa el nombre del proceso"
            />

            <input
                type="number"
                className="shadow-2xl"
                value={formData.MemoriaRequired === 0 ? '' : formData.MemoriaRequired}
                name="MemoriaRequired"
                onChange={handleChange}
                placeholder="Memoria requerida (MB)"
            />

            <input
                type="number"
                className="shadow-2xl"
                value={formData.Duration === 0 ? '' : formData.Duration}
                name="Duration"
                onChange={handleChange}
                placeholder="Duración (s)"
            />

            <input
                type="number"
                className="shadow-2xl"
                value={formData.UnidadEntrada === 0 ? '' : formData.UnidadEntrada}
                name="UnidadEntrada"
                onChange={handleChange}
                placeholder="Unidad Entrada"
            />

            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

            <button type="submit" className="bg-blue-600 text-white rounded-lg py-2">
                Crear Proceso
            </button>
        </form>
    );
};

export default FormProceso;