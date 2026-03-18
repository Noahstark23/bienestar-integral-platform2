import React, { useState, useEffect } from 'react';
import { Video, Plus, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface TelmedSlot {
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
});

export const TelmedAvailabilityManager: React.FC = () => {
    const [slots, setSlots] = useState<TelmedSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, startTime: '08:00', endTime: '17:00' });

    useEffect(() => {
        fetchSlots();
    }, []);

    const showMsg = (text: string, type: 'success' | 'error') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    const fetchSlots = async () => {
        try {
            const res = await fetch('/api/telmed/availability');
            const data = await res.json();
            setSlots(Array.isArray(data) ? data : []);
        } catch (err) {
            showMsg('Error al cargar horarios de teleconsulta', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/telmed/availability', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(newSlot)
            });
            if (!res.ok) throw new Error('Error al crear slot');
            showMsg('Horario de teleconsulta agregado', 'success');
            fetchSlots();
            setNewSlot({ dayOfWeek: 1, startTime: '08:00', endTime: '17:00' });
        } catch (err) {
            showMsg('Error al agregar horario', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlot = async (id: number) => {
        if (!confirm('¿Eliminar este horario de teleconsulta?')) return;
        try {
            const res = await fetch(`/api/telmed/availability/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error();
            showMsg('Horario eliminado', 'success');
            fetchSlots();
        } catch (err) {
            showMsg('Error al eliminar horario', 'error');
        }
    };

    const slotsByDay = slots.reduce((acc, slot) => {
        if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
        acc[slot.dayOfWeek].push(slot);
        return acc;
    }, {} as Record<number, TelmedSlot[]>);

    if (loading) return <div className="p-6 text-slate-500 text-center">Cargando horarios de teleconsulta...</div>;

    return (
        <div className="space-y-6 mt-8 pt-8 border-t border-slate-200">
            {/* Section header */}
            <div className="flex items-center gap-3">
                <div className="bg-violet-100 p-3 rounded-full">
                    <Video className="text-violet-600" size={22} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Horarios de Teleconsulta</h2>
                    <p className="text-sm text-slate-500">Configura cuándo ofreces sesiones virtuales</p>
                </div>
            </div>

            {/* Feedback */}
            {message && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current slots */}
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Horarios Configurados</h3>
                    <div className="space-y-3">
                        {DAYS.map((dayName, dayIndex) => {
                            const daySlots = slotsByDay[dayIndex] || [];
                            return (
                                <div key={dayIndex} className="border-l-4 border-violet-200 pl-4 py-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-slate-700">{dayName}</span>
                                        {daySlots.length === 0 && (
                                            <span className="text-xs text-slate-400">No disponible</span>
                                        )}
                                    </div>
                                    {daySlots.map(slot => (
                                        <div key={slot.id} className="flex items-center justify-between bg-violet-50 px-3 py-1.5 rounded-lg mb-1">
                                            <div className="flex items-center gap-2">
                                                <Clock size={13} className="text-violet-500" />
                                                <span className="text-sm text-slate-700">{slot.startTime} – {slot.endTime}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSlot(slot.id)}
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                        {slots.length === 0 && (
                            <p className="text-sm text-slate-400 italic text-center py-4">Sin horarios de teleconsulta configurados.</p>
                        )}
                    </div>
                </div>

                {/* Add slot form */}
                <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-200 rounded-xl p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-violet-600" /> Agregar Horario Virtual
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Día de la semana</label>
                            <select
                                value={newSlot.dayOfWeek}
                                onChange={e => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                            >
                                {DAYS.map((day, idx) => (
                                    <option key={idx} value={idx}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Hora Inicio</label>
                                <input
                                    type="time"
                                    value={newSlot.startTime}
                                    onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Hora Fin</label>
                                <input
                                    type="time"
                                    value={newSlot.endTime}
                                    onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAddSlot}
                            disabled={saving}
                            className="w-full bg-violet-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving ? 'Guardando...' : (<><Plus size={16} /> Agregar Horario Virtual</>)}
                        </button>
                    </div>

                    <div className="mt-5 bg-violet-100 rounded-lg p-3">
                        <p className="text-xs text-violet-800">
                            📹 <strong>Nota:</strong> Estos horarios son para sesiones por videollamada (Jitsi).
                            Los pacientes elegirán entre presencial o virtual al agendar.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
