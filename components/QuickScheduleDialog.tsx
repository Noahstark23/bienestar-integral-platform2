import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, User, Calendar, Clock } from 'lucide-react';

interface QuickScheduleDialogProps {
    date: Date;
    onClose: () => void;
    onScheduled: () => void;
}

interface Patient {
    id: number;
    nombre: string;
    telefono: string;
}

export const QuickScheduleDialog: React.FC<QuickScheduleDialogProps> = ({ date, onClose, onScheduled }) => {
    const [type, setType] = useState<'session' | 'appointment'>('session');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    // Campos para cita rápida
    const [quickName, setQuickName] = useState('');
    const [quickPhone, setQuickPhone] = useState('');
    const [quickMotivo, setQuickMotivo] = useState('');

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
    });

    // Cargar pacientes
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await fetch('/api/patients', { headers: getAuthHeaders() });
                const data = await res.json();
                setPatients(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error cargando pacientes:', error);
            }
        };
        fetchPatients();
    }, []);

    const handleSchedule = async () => {
        setLoading(true);
        try {
            if (type === 'session') {
                if (!selectedPatientId) {
                    alert('Selecciona un paciente');
                    return;
                }

                // Crear sesión
                await fetch('/api/sessions', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        patientId: selectedPatientId,
                        fecha: date.toISOString(),
                        tipo: 'Terapia',
                        pago: 0,
                        estadoPago: 'Pendiente'
                    })
                });
            } else {
                // Crear cita rápida
                if (!quickName || !quickPhone) {
                    alert('Nombre y teléfono son requeridos');
                    return;
                }

                await fetch('/api/appointments', {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({
                        nombrePaciente: quickName,
                        telefono: quickPhone,
                        email: '',
                        fechaHora: date.toISOString(),
                        motivo: quickMotivo || 'Consulta rápida',
                        estado: 'Confirmada'
                    })
                });
            }

            onScheduled();
        } catch (error) {
            console.error('Error agendando:', error);
            alert('Error al agendar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-800">Agendar Rápido</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Fecha y hora seleccionada */}
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-blue-700">
                        <Calendar size={18} />
                        <span className="font-medium">
                            {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 mt-1">
                        <Clock size={18} />
                        <span>{format(date, 'HH:mm', { locale: es })}</span>
                    </div>
                </div>

                {/* Selector de tipo */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Tipo de evento
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setType('session')}
                            className={`py-2 px-4 rounded-lg font-medium transition-all ${type === 'session'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Sesión Paciente
                        </button>
                        <button
                            onClick={() => setType('appointment')}
                            className={`py-2 px-4 rounded-lg font-medium transition-all ${type === 'appointment'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Cita Rápida
                        </button>
                    </div>
                </div>

                {/* Formulario según tipo */}
                {type === 'session' ? (
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            <User size={16} className="inline mr-1" />
                            Seleccionar Paciente
                        </label>
                        <select
                            value={selectedPatientId || ''}
                            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Seleccionar paciente --</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre} - {p.telefono}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <div className="space-y-3 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Nombre completo
                            </label>
                            <input
                                type="text"
                                value={quickName}
                                onChange={(e) => setQuickName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Nombre del paciente"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={quickPhone}
                                onChange={(e) => setQuickPhone(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="58585858"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Motivo (opcional)
                            </label>
                            <input
                                type="text"
                                value={quickMotivo}
                                onChange={(e) => setQuickMotivo(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="Ej: Consulta inicial"
                            />
                        </div>
                    </div>
                )}

                {/* Botones */}
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSchedule}
                        disabled={loading}
                        className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium text-white ${type === 'session'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-green-600 hover:bg-green-700'
                            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Agendando...' : 'Agendar'}
                    </button>
                </div>
            </div>
        </div>
    );
};
