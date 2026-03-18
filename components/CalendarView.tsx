import React, { useState, useEffect } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer, SlotInfo } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarView.css';
import { QuickScheduleDialog } from './QuickScheduleDialog';
import { ConvertToSessionModal } from './ConvertToSessionModal';

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { 'es': es }
});

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: 'appointment' | 'session';
    status?: string;
    patientId?: number;
    resourceId: number;
    data: any;
}

export const CalendarView: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Filtros
    const SESSION_TIPOS = ['Evaluacion', 'Terapia', 'Consulta'];
    const [filters, setFilters] = useState({
        pendingAppointments: true,
        confirmedAppointments: true,
        sessions: true,
        sessionTipos: [...SESSION_TIPOS]
    });

    // Quick schedule
    const [showQuickSchedule, setShowQuickSchedule] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

    // Convert to Session
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    // Cargar eventos del mes actual
    useEffect(() => {
        fetchEventsForCurrentView();
    }, []);

    const fetchEventsForCurrentView = async () => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(addMonths(currentDate, 1));
        await fetchEvents(start, end);
    };

    const fetchEvents = async (start: Date, end: Date) => {
        setLoading(true);
        try {
            const res = await fetch(
                `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`
            );
            const data = await res.json();

            const parsedEvents = data.map((e: any) => ({
                ...e,
                start: new Date(e.start),
                end: new Date(e.end)
            }));

            setAllEvents(parsedEvents);
            applyFilters(parsedEvents);
        } catch (error) {
            console.error('Error cargando eventos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Aplicar filtros
    const applyFilters = (eventsToFilter: CalendarEvent[] = allEvents) => {
        const filtered = eventsToFilter.filter(event => {
            if (event.type === 'appointment') {
                if (event.status === 'Pendiente' && !filters.pendingAppointments) return false;
                if (event.status === 'Confirmada' && !filters.confirmedAppointments) return false;
            }
            if (event.type === 'session') {
                if (!filters.sessions) return false;
                const tipo = event.data?.tipo || 'Terapia';
                if (!filters.sessionTipos.includes(tipo)) return false;
            }
            return true;
        });
        setEvents(filtered);
    };

    // Efecto para aplicar filtros cuando cambien
    useEffect(() => {
        applyFilters();
    }, [filters]);

    // Toggle filter booleano
    const toggleFilter = (filterName: 'pendingAppointments' | 'confirmedAppointments' | 'sessions') => {
        setFilters(prev => ({ ...prev, [filterName]: !prev[filterName] }));
    };

    // Toggle tipo de sesión
    const toggleSessionTipo = (tipo: string) => {
        setFilters(prev => {
            const current = prev.sessionTipos;
            const updated = current.includes(tipo)
                ? current.filter(t => t !== tipo)
                : [...current, tipo];
            return { ...prev, sessionTipos: updated };
        });
    };

    // Estilos por tipo de evento
    const eventStyleGetter = (event: CalendarEvent) => {
        let backgroundColor = '#3b82f6';

        if (event.type === 'appointment') {
            backgroundColor = event.status === 'Pendiente' ? '#f59e0b' : '#10b981';
        } else if (event.type === 'session') {
            backgroundColor = '#3b82f6';
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '13px',
                fontWeight: '500'
            }
        };
    };

    // Click en evento existente
    const handleSelectEvent = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setShowEventModal(true);
    };

    // Click en slot vacío (para agendar)
    const handleSelectSlot = (slotInfo: SlotInfo) => {
        setSelectedSlot(slotInfo.start);
        setShowQuickSchedule(true);
    };

    // Navegación de fecha
    const handleNavigate = (newDate: Date) => {
        setCurrentDate(newDate);
        const start = startOfMonth(newDate);
        const end = endOfMonth(addMonths(newDate, 1));
        fetchEvents(start, end);
    };

    // Callback cuando se agenda algo nuevo
    const handleScheduled = () => {
        setShowQuickSchedule(false);
        fetchEventsForCurrentView();
    };

    return (
        <div className="calendar-container">
            {/* Header con leyenda y filtros */}
            <div className="calendar-header">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">Calendario de Agenda</h2>

                    {/* Botón de Agendar Rápido */}
                    <button
                        onClick={() => {
                            setSelectedSlot(new Date());
                            setShowQuickSchedule(true);
                        }}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                    >
                        <span className="text-lg">+</span>
                        Nueva Cita/Sesión
                    </button>
                </div>

                <div className="calendar-legend flex gap-4 mb-4">
                    <button
                        onClick={() => toggleFilter('pendingAppointments')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filters.pendingAppointments
                            ? 'bg-orange-50 border-orange-300'
                            : 'bg-slate-100 border-slate-200 opacity-40'
                            }`}
                    >
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }}></div>
                        <span className="text-sm text-slate-700 font-medium">Citas Pendientes</span>
                    </button>
                    <button
                        onClick={() => toggleFilter('confirmedAppointments')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filters.confirmedAppointments
                            ? 'bg-green-50 border-green-300'
                            : 'bg-slate-100 border-slate-200 opacity-40'
                            }`}
                    >
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }}></div>
                        <span className="text-sm text-slate-700 font-medium">Citas Confirmadas</span>
                    </button>
                    <button
                        onClick={() => toggleFilter('sessions')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${filters.sessions
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-slate-100 border-slate-200 opacity-40'
                            }`}
                    >
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                        <span className="text-sm text-slate-700 font-medium">Sesiones</span>
                    </button>
                    {filters.sessions && (
                        <>
                            {SESSION_TIPOS.map(tipo => (
                                <button
                                    key={tipo}
                                    onClick={() => toggleSessionTipo(tipo)}
                                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${filters.sessionTipos.includes(tipo)
                                        ? 'bg-blue-100 border-blue-400 text-blue-800 font-medium'
                                        : 'bg-slate-100 border-slate-200 text-slate-400 opacity-40'
                                        }`}
                                >
                                    {tipo}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* Calendario */}
            <div className="calendar-wrapper bg-white rounded-xl shadow-sm border border-slate-200 p-6" style={{ height: '75vh' }}>
                {loading && (
                    <div className="text-center py-4 text-slate-500">Cargando eventos...</div>
                )}

                <BigCalendar
                    localizer={localizer}
                    events={events}
                    startAccessor="start"
                    endAccessor="end"
                    culture="es"
                    style={{ height: '100%' }}
                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}
                    onNavigate={handleNavigate}
                    selectable
                    eventPropGetter={eventStyleGetter}
                    messages={{
                        next: 'Siguiente',
                        previous: 'Anterior',
                        today: 'Hoy',
                        month: 'Mes',
                        week: 'Semana',
                        day: 'Día',
                        agenda: 'Agenda',
                        date: 'Fecha',
                        time: 'Hora',
                        event: 'Evento',
                        noEventsInRange: 'No hay eventos en este rango',
                        showMore: (total) => `+ Ver más (${total})`
                    }}
                />
            </div>

            {/* Event Details Modal */}
            {showEventModal && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-slate-800">
                                {selectedEvent.type === 'appointment' ? 'Detalles de Cita' : 'Detalles de Sesión'}
                            </h3>
                            <button
                                onClick={() => setShowEventModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <span className="text-sm font-semibold text-slate-600">Paciente:</span>
                                <p className="text-slate-800">{selectedEvent.data.nombrePaciente}</p>
                            </div>

                            {selectedEvent.data.telefono && (
                                <div>
                                    <span className="text-sm font-semibold text-slate-600">Teléfono:</span>
                                    <p className="text-slate-800">{selectedEvent.data.telefono}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-sm font-semibold text-slate-600">Fecha y Hora:</span>
                                <p className="text-slate-800">
                                    {format(selectedEvent.start, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                                </p>
                            </div>

                            {selectedEvent.type === 'appointment' && selectedEvent.status && (
                                <div>
                                    <span className="text-sm font-semibold text-slate-600">Estado:</span>
                                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${selectedEvent.status === 'Pendiente' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {selectedEvent.status}
                                    </span>
                                </div>
                            )}

                            {selectedEvent.type === 'session' && selectedEvent.data.tipo && (
                                <div>
                                    <span className="text-sm font-semibold text-slate-600">Tipo:</span>
                                    <p className="text-slate-800">{selectedEvent.data.tipo}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex gap-2">
                            {/* Botón Crear Sesión - SOLO para citas (appointments) */}
                            {selectedEvent.type === 'appointment' && (
                                <button
                                    onClick={() => {
                                        setSelectedAppointment(selectedEvent.data);
                                        setShowEventModal(false);
                                        setShowConvertModal(true);
                                    }}
                                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-bold"
                                >
                                    ✓ Crear Sesión
                                </button>
                            )}

                            <button
                                onClick={() => setShowEventModal(false)}
                                className="flex-1 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Schedule Dialog */}
            {showQuickSchedule && selectedSlot && (
                <QuickScheduleDialog
                    date={selectedSlot}
                    onClose={() => setShowQuickSchedule(false)}
                    onScheduled={handleScheduled}
                />
            )}

            {/* Convert to Session Modal */}
            {showConvertModal && selectedAppointment && (
                <ConvertToSessionModal
                    appointment={selectedAppointment}
                    onClose={() => {
                        setShowConvertModal(false);
                        setSelectedAppointment(null);
                    }}
                    onSuccess={() => {
                        fetchEventsForCurrentView();
                        setShowConvertModal(false);
                        setSelectedAppointment(null);
                    }}
                />
            )}
        </div>
    );
};
