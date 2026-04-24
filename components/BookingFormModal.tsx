import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, Check, MessageCircle } from 'lucide-react';

interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MOTIVOS = [
  'Ansiedad o estrés',
  'Depresión',
  'Terapia de pareja',
  'Problemas familiares',
  'Evaluación neuropsicológica',
  'Terapia de lenguaje',
  'Atención a niños y adolescentes',
  'Otro',
];

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function generateTimeSlots(startTime: string, endTime: string): string[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const slots: string[] = [];
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current < end) {
    slots.push(`${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`);
    current += 60;
  }
  return slots;
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);

  // Step 1
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [motivo, setMotivo] = useState('');

  // Step 2
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/availability/public')
        .then(r => r.json())
        .then(data => setAvailabilitySlots(Array.isArray(data) ? data : []))
        .catch(() => setAvailabilitySlots([]));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSelectedTime('');
    const dateStr = selectedDate.toISOString().split('T')[0];
    fetch(`/api/appointments/slots?date=${dateStr}`)
      .then(r => r.json())
      .then(data => setTakenSlots(data.takenSlots || []))
      .catch(() => setTakenSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate]);

  const availableDays = new Set(availabilitySlots.map(s => s.dayOfWeek));

  const isDayAvailable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today && availableDays.has(date.getDay());
  };

  const getCalendarDays = () => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(y, m, d));
    return days;
  };

  const getTimeSlotsForDate = (date: Date) => {
    const slots = availabilitySlots.filter(s => s.dayOfWeek === date.getDay());
    const all: string[] = [];
    slots.forEach(s => all.push(...generateTimeSlots(s.startTime, s.endTime)));
    return [...new Set(all)].sort();
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError('');
    try {
      const [h, m] = selectedTime.split(':').map(Number);
      const fechaHora = new Date(selectedDate);
      fechaHora.setHours(h, m, 0, 0);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, email, motivo, fechaHora: fechaHora.toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Error al agendar');
      }
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Hubo un error. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep(1);
      setNombre(''); setTelefono(''); setEmail(''); setMotivo('');
      setSelectedDate(null); setSelectedTime('');
      setError('');
    }, 300);
  };

  if (!isOpen) return null;

  const timeSlots = selectedDate ? getTimeSlotsForDate(selectedDate) : [];
  const whatsappText = selectedDate && selectedTime
    ? `Hola Lic. Esmirna, acabo de solicitar una cita para el ${selectedDate.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${selectedTime}. Mi nombre es ${nombre}.`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-brand-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg leading-none">
              {step === 3 ? '¡Cita Agendada!' : 'Reserva tu Cita'}
            </h2>
            <p className="text-brand-100 text-xs mt-1">
              {step === 1 && 'Paso 1 de 2 — Tu información'}
              {step === 2 && 'Paso 2 de 2 — Elige fecha y hora'}
              {step === 3 && 'Lic. Esmirna García te confirmará pronto'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        {step < 3 && (
          <div className="h-1 bg-brand-100 shrink-0">
            <div
              className="h-full bg-brand-600 transition-all duration-500"
              style={{ width: step === 1 ? '50%' : '100%' }}
            />
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nombre completo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: María García"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Teléfono / WhatsApp <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="8888-8888"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Motivo de consulta <span className="text-red-400">*</span>
                </label>
                <select
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white"
                >
                  <option value="">Selecciona un motivo...</option>
                  {MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <p className="text-xs text-slate-400 pt-1">
                Tu información es confidencial y está protegida.
              </p>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="p-6 space-y-5">
              {/* Calendar header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const d = new Date(calendarMonth);
                    d.setMonth(d.getMonth() - 1);
                    setCalendarMonth(d);
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="font-semibold text-slate-800">
                  {MESES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </span>
                <button
                  onClick={() => {
                    const d = new Date(calendarMonth);
                    d.setMonth(d.getMonth() + 1);
                    setCalendarMonth(d);
                  }}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 text-center">
                {DIAS.map(d => (
                  <div key={d} className="text-xs font-medium text-slate-400 py-1">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((day, i) => {
                  if (!day) return <div key={i} />;
                  const available = isDayAvailable(day);
                  const isSelected = selectedDate?.toDateString() === day.toDateString();
                  return (
                    <button
                      key={i}
                      disabled={!available}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square text-sm rounded-lg font-medium transition-all
                        ${!available ? 'text-slate-300 cursor-not-allowed' : ''}
                        ${available && !isSelected ? 'hover:bg-brand-50 text-slate-700 hover:text-brand-700' : ''}
                        ${isSelected ? 'bg-brand-600 text-white shadow-md scale-105' : ''}
                      `}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              {availableDays.size === 0 && (
                <p className="text-xs text-amber-600 text-center">
                  Cargando disponibilidad...
                </p>
              )}

              {/* Time slots */}
              {selectedDate && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                    <Clock size={15} className="text-brand-600" />
                    {selectedDate.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  {loadingSlots ? (
                    <p className="text-center text-sm text-slate-500 py-3">Cargando horarios...</p>
                  ) : timeSlots.length === 0 ? (
                    <p className="text-center text-sm text-slate-500 py-3">
                      No hay horarios disponibles para este día.
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {timeSlots.map(time => {
                        const taken = takenSlots.includes(time);
                        const isSelectedTime = selectedTime === time;
                        return (
                          <button
                            key={time}
                            disabled={taken}
                            onClick={() => setSelectedTime(time)}
                            className={`
                              py-2 rounded-lg text-sm font-medium border transition-all
                              ${taken ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through' : ''}
                              ${!taken && !isSelectedTime ? 'border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50' : ''}
                              ${isSelectedTime ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : ''}
                            `}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
              )}
            </div>
          )}

          {/* ── STEP 3 — Success ── */}
          {step === 3 && (
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check size={30} className="text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">¡Solicitud enviada!</h3>
                <p className="text-slate-500 text-sm">
                  Lic. Esmirna García te confirmará tu cita a la brevedad.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-left space-y-1.5 text-sm">
                <p className="font-semibold text-slate-800">{nombre}</p>
                <p className="text-slate-600">
                  📅 {selectedDate?.toLocaleDateString('es-NI', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                  })}
                </p>
                <p className="text-slate-600">🕐 {selectedTime} hrs</p>
                <p className="text-slate-600">📝 {motivo}</p>
                <p className="text-slate-600">📞 {telefono}</p>
              </div>

              <a
                href={`https://wa.me/50587171412?text=${encodeURIComponent(whatsappText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#20ba5a] transition-colors"
              >
                <MessageCircle size={18} />
                Confirmar por WhatsApp
              </a>

              <button
                onClick={handleClose}
                className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        {step < 3 && (
          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setError(''); }}
                className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={16} />
                Atrás
              </button>
            )}
            <button
              onClick={() => {
                if (step === 1) {
                  setStep(2);
                } else {
                  handleSubmit();
                }
              }}
              disabled={
                step === 1
                  ? !nombre.trim() || !telefono.trim() || !motivo
                  : !selectedDate || !selectedTime || submitting
              }
              className="flex-1 bg-brand-600 text-white py-2.5 rounded-xl font-bold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 1
                ? 'Siguiente — Elegir horario'
                : submitting
                ? 'Agendando...'
                : 'Confirmar Cita'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
