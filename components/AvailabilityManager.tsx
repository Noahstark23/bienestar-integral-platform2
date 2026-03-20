import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Save, AlertCircle } from 'lucide-react';

interface AvailabilitySlot {
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

export const AvailabilityManager: React.FC = () => {
    const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Estado para nuevo slot
    const [newSlot, setNewSlot] = useState({
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '17:00'
    });

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            const res = await fetch('/api/availability', { headers: getAuthHeaders() });
            const data = await res.json();
            setSlots(Array.isArray(data) ? data : []);
        } catch (err) {
            setError('Error al cargar horarios');
        } finally {
            setLoading(false);
        }
    };

    const handleAddSlot = async () => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/availability', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(newSlot)
            });

            if (!res.ok) throw new Error('Error al crear slot');

            setSuccess('Horario agregado exitosamente');
            fetchSlots();

            // Reset form
            setNewSlot({ dayOfWeek: 1, startTime: '08:00', endTime: '17:00' });
        } catch (err) {
            setError('Error al agregar horario');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlot = async (id: number) => {
        if (!confirm('¿Eliminar este horario?')) return;

        try {
            await fetch(`/api/availability/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
            setSuccess('Horario eliminado');
            fetchSlots();
        } catch (err) {
            setError('Error al eliminar horario');
        }
    };

    // Agrupar slots por día
    const slotsByDay = slots.reduce((acc, slot) => {
        if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
        acc[slot.dayOfWeek].push(slot);
        return acc;
    }, {} as Record<number, AvailabilitySlot[]>);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Cargando horarios...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-brand-100 p-3 rounded-full">
                    <Calendar className="text-brand-600" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Horarios de Atención</h2>
                    <p className="text-sm text-slate-600">Configura tu disponibilidad semanal</p>
                </div>
            </div>

            {/* Messages */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vista de Horarios Configurados */}
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Horarios Actuales</h3>

                    <div className="space-y-3">
                        {DAYS.map((dayName, dayIndex) => {
                            const daySlots = slotsByDay[dayIndex] || [];

                            return (
                                <div key={dayIndex} className="border-l-4 border-slate-200 pl-4 py-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-slate-700">{dayName}</span>
                                        {daySlots.length === 0 && (
                                            <span className="text-xs text-slate-400">No disponible</span>
                                        )}
                                    </div>

                                    {daySlots.map(slot => (
                                        <div key={slot.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg mb-1">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-slate-500" />
                                                <span className="text-sm text-slate-700">
                                                    {slot.startTime} - {slot.endTime}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteSlot(slot.id)}
                                                className="text-red-500 hover:text-red-700 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Formulario Agregar Horario */}
                <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Plus size={20} className="text-brand-600" />
                        Agregar Horario
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Día de la semana
                            </label>
                            <select
                                value={newSlot.dayOfWeek}
                                onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                {DAYS.map((day, idx) => (
                                    <option key={idx} value={idx}>{day}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Hora Inicio
                                </label>
                                <input
                                    type="time"
                                    value={newSlot.startTime}
                                    onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Hora Fin
                                </label>
                                <input
                                    type="time"
                                    value={newSlot.endTime}
                                    onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddSlot}
                            disabled={saving}
                            className="w-full bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                        >
                            {saving ? (
                                'Guardando...'
                            ) : (
                                <>
                                    <Plus size={18} />
                                    Agregar Horario
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tips */}
                    <div className="mt-6 bg-brand-100 border border-brand-200 rounded-lg p-4">
                        <p className="text-xs text-brand-800">
                            💡 <strong>Consejo:</strong> Puedes agregar múltiples bloques por día (ej: mañana y tarde).
                            Los pacientes solo podrán agendar en estos horarios.
                        </p>
                    </div>
                </div>
            </div>

            {/* Vista Resumen */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-3">Resumen Semanal</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-brand-600">{slots.length}</div>
                        <div className="text-sm text-slate-600">Bloques totales</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-brand-600">
                            {Object.keys(slotsByDay).length}
                        </div>
                        <div className="text-sm text-slate-600">Días activos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-slate-600">
                            {slots.reduce((acc, slot) => {
                                const [h1, m1] = slot.startTime.split(':').map(Number);
                                const [h2, m2] = slot.endTime.split(':').map(Number);
                                return acc + ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
                            }, 0).toFixed(1)}h
                        </div>
                        <div className="text-sm text-slate-600">Horas semanales</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                            {slots.filter(s => s.isActive).length}
                        </div>
                        <div className="text-sm text-slate-600">Activos</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
