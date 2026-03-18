import React, { useState } from 'react';
import { X, Check, DollarSign } from 'lucide-react';

interface Appointment {
    id: number;
    nombrePaciente: string;  // corrected: was patientName
    telefono: string;         // corrected: was patientPhone
    fechaHora: string;        // corrected: was startTime
    tipo: string;             // corrected: was type
    estado: string;           // corrected: was status
}

interface Props {
    appointment: Appointment;
    onClose: () => void;
    onSuccess: () => void;
}

export const ConvertToSessionModal: React.FC<Props> = ({ appointment, onClose, onSuccess }) => {
    const [pago, setPago] = useState<string>('');
    const [tipo, setTipo] = useState<string>('Terapia');
    const [estadoPago, setEstadoPago] = useState<string>('Pendiente');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const pagoNum = parseFloat(pago);
        if (!pagoNum || pagoNum <= 0) {
            setError('El monto debe ser mayor a 0');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/appointments/${appointment.id}/convert-to-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pago: pagoNum,
                    tipo,
                    estadoPago
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const errorData = await res.json();
                setError(errorData.error || 'Error al crear sesión');
            }
        } catch (err) {
            console.error('Error:', err);
            setError('Error de conexión al crear sesión');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-NI', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="bg-green-600 text-white p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Check size={24} />
                        Marcar como Completada
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-green-100 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-5">
                        {/* Info de la Cita */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <p className="text-sm text-slate-600 mb-1">Paciente</p>
                            <p className="text-lg font-bold text-slate-800 mb-2">{appointment.nombrePaciente}</p>
                            <p className="text-sm text-slate-600 mb-1">Fecha y Hora</p>
                            <p className="text-sm font-medium text-slate-700">{formatDateTime(appointment.fechaHora)}</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        {/* Tipo de Sesión */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Tipo de Sesión *
                            </label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                            >
                                <option value="Evaluacion">Evaluación</option>
                                <option value="Terapia">Terapia</option>
                                <option value="Consulta">Consulta</option>
                                <option value="Seguimiento">Seguimiento</option>
                            </select>
                        </div>

                        {/* Monto */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Monto de la Sesión *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">
                                    C$
                                </span>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={pago}
                                    onChange={(e) => setPago(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-medium"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        {/* Estado de Pago */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Estado de Pago *
                            </label>
                            <select
                                value={estadoPago}
                                onChange={(e) => setEstadoPago(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                required
                            >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Pagado">Pagado</option>
                                <option value="Parcial">Pago Parcial</option>
                            </select>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                                <strong>ℹ️ Importante:</strong> Esto creará una sesión clínica facturable y marcará esta cita como completada.
                                Podrás facturar esta sesión más tarde desde el módulo de Facturación.
                            </p>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            {loading ? 'Creando...' : 'Crear Sesión'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
