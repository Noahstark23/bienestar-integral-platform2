import React, { useState, useEffect } from 'react';
import { X, Calendar, Phone, User, Check, AlertCircle, Clock } from 'lucide-react';

interface BookingModalProps {
    onClose: () => void;
}

// Horario laboral: Lunes-Sábado, 8:00 - 17:00, slots de 1h
const WORK_HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

function toDateInputMin() {
    const d = new Date();
    d.setDate(d.getDate() + 1); // mínimo mañana
    return d.toISOString().slice(0, 10);
}

function toDateInputMax() {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
}

function isSunday(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').getDay() === 0;
}

function formatDateLabel(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatHour(h: string) {
    const [hr, min] = h.split(':').map(Number);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const h12 = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
    return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
}

export const BookingModal: React.FC<BookingModalProps> = ({ onClose }) => {
    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSlot, setSelectedSlot] = useState('');
    const [takenSlots, setTakenSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    // Cargar slots tomados cuando cambia la fecha
    useEffect(() => {
        if (!selectedDate || isSunday(selectedDate)) {
            setTakenSlots([]);
            setSelectedSlot('');
            return;
        }
        setLoadingSlots(true);
        setSelectedSlot('');
        fetch(`/api/appointments/slots?date=${selectedDate}`)
            .then(r => r.json())
            .then(d => setTakenSlots(d.takenSlots || []))
            .catch(() => setTakenSlots([]))
            .finally(() => setLoadingSlots(false));
    }, [selectedDate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDate || !selectedSlot) {
            setError('Por favor selecciona una fecha y un horario');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const fechaHora = `${selectedDate}T${selectedSlot}:00`;
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, telefono, fechaHora })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || data.error || 'Error al agendar cita');

            setSuccess(true);
            setTimeout(() => onClose(), 2500);
        } catch (err: any) {
            setError(err.message || 'Error al agendar la cita');
        } finally {
            setLoading(false);
        }
    };

    const dayIsValid = selectedDate && !isSunday(selectedDate);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white relative shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="bg-white bg-opacity-20 p-3 rounded-full">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Agendar Cita</h2>
                            <p className="text-brand-100 text-sm">Lunes a Sábado · 8:00 AM – 5:00 PM</p>
                        </div>
                    </div>
                </div>

                {/* Success State */}
                {success ? (
                    <div className="p-8 text-center">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <Check className="text-green-600" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">¡Cita Agendada!</h3>
                        <p className="text-slate-600">Te contactaremos pronto para confirmar.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <User className="inline mr-1.5" size={15} />
                                Nombre Completo
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                placeholder="Juan Pérez"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <Phone className="inline mr-1.5" size={15} />
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={telefono}
                                onChange={e => setTelefono(e.target.value)}
                                required
                                pattern="[0-9]{8}"
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                placeholder="87171712"
                            />
                            <p className="text-xs text-slate-400 mt-1">8 dígitos sin espacios</p>
                        </div>

                        {/* Fecha */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                <Calendar className="inline mr-1.5" size={15} />
                                Fecha
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                required
                                min={toDateInputMin()}
                                max={toDateInputMax()}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            />
                            {selectedDate && isSunday(selectedDate) && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertCircle size={12} /> No atendemos los domingos. Por favor elige otro día.
                                </p>
                            )}
                            {dayIsValid && (
                                <p className="text-xs text-brand-600 mt-1 font-medium capitalize">{formatDateLabel(selectedDate)}</p>
                            )}
                        </div>

                        {/* Slots de horario */}
                        {dayIsValid && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    <Clock className="inline mr-1.5" size={15} />
                                    Horario disponible
                                </label>
                                {loadingSlots ? (
                                    <p className="text-sm text-slate-400 py-2">Verificando disponibilidad...</p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                        {WORK_HOURS.map(slot => {
                                            const isTaken = takenSlots.includes(slot);
                                            const isSelected = selectedSlot === slot;
                                            return (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    disabled={isTaken}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border
                                                        ${isTaken
                                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                                                            : isSelected
                                                                ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50'
                                                        }`}
                                                >
                                                    {formatHour(slot)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {!loadingSlots && WORK_HOURS.every(s => takenSlots.includes(s)) && (
                                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                                        No hay horarios disponibles para esta fecha. Por favor elige otro día.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Info */}
                        <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                            <p className="text-sm text-brand-800">
                                💡 Te contactaremos para confirmar. Horarios sujetos a disponibilidad.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !selectedSlot || !dayIsValid}
                                className="flex-1 px-5 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Agendando...' : 'Agendar Cita'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
