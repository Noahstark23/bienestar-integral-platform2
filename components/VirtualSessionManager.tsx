import React, { useState, useEffect } from 'react';
import { Video, Clock, Calendar, Phone, Check, X, Copy, Trash2, Play, Plus, MessageCircle, AlertCircle, Users } from 'lucide-react';

interface TelmedSlot {
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
}

interface VirtualSessionData {
    id: number;
    codigo: string;
    roomName: string;
    nombrePaciente: string;
    telefono: string;
    fechaHora: string;
    duracion: number;
    estado: string;
    notas: string;
    patient?: { id: number; nombre: string; telefono: string } | null;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Props {
    onJoinAsDoctor: (roomName: string) => void;
}

export const VirtualSessionManager: React.FC<Props> = ({ onJoinAsDoctor }) => {
    const [activeTab, setActiveTab] = useState<'sessions' | 'availability'>('sessions');

    // Availability State
    const [slots, setSlots] = useState<TelmedSlot[]>([]);
    const [newSlot, setNewSlot] = useState({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' });

    // Sessions State
    const [sessions, setSessions] = useState<VirtualSessionData[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSession, setNewSession] = useState({ nombrePaciente: '', telefono: '', fechaHora: '', duracion: 60 });
    const [copiedId, setCopiedId] = useState<number | null>(null);

    // Patients for dropdown
    const [patients, setPatients] = useState<{ id: number; nombre: string; telefono: string }[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');

    useEffect(() => {
        fetchSlots();
        fetchSessions();
        fetchPatients();
    }, []);

    const fetchSlots = async () => {
        try {
            const res = await fetch('/api/telmed/availability');
            if (res.ok) setSlots(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/virtual-sessions');
            if (res.ok) setSessions(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchPatients = async () => {
        try {
            const res = await fetch('/api/patients');
            if (res.ok) setPatients(await res.json());
        } catch (e) { console.error(e); }
    };

    // Availability Handlers
    const handleAddSlot = async () => {
        try {
            const res = await fetch('/api/telmed/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSlot)
            });
            if (res.ok) {
                fetchSlots();
                setNewSlot({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' });
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteSlot = async (id: number) => {
        if (!confirm('¿Eliminar este horario?')) return;
        try {
            await fetch(`/api/telmed/availability/${id}`, { method: 'DELETE' });
            fetchSlots();
        } catch (e) { console.error(e); }
    };

    // Session Handlers
    const handleCreateSession = async () => {
        const data: any = {
            nombrePaciente: newSession.nombrePaciente,
            telefono: newSession.telefono,
            fechaHora: newSession.fechaHora,
            duracion: newSession.duracion,
            isAdmin: true
        };
        if (selectedPatientId) data.patientId = selectedPatientId;

        try {
            const res = await fetch('/api/virtual-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                fetchSessions();
                setShowCreateModal(false);
                setNewSession({ nombrePaciente: '', telefono: '', fechaHora: '', duracion: 60 });
                setSelectedPatientId('');
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (e) { console.error(e); }
    };

    const handleUpdateStatus = async (id: number, estado: string) => {
        try {
            await fetch(`/api/virtual-sessions/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado })
            });
            fetchSessions();
        } catch (e) { console.error(e); }
    };

    const handleDeleteSession = async (id: number) => {
        if (!confirm('¿Eliminar esta sesión?')) return;
        try {
            await fetch(`/api/virtual-sessions/${id}`, { method: 'DELETE' });
            fetchSessions();
        } catch (e) { console.error(e); }
    };

    const handleCopyCode = (id: number, code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleWhatsApp = (session: VirtualSessionData) => {
        const phone = session.telefono || session.patient?.telefono || '';
        const fecha = new Date(session.fechaHora).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });
        const msg = encodeURIComponent(
            `Hola ${session.nombrePaciente} 👋\n\nTu teleconsulta ha sido confirmada:\n📅 ${fecha}\n🔑 Código: ${session.codigo}\n\nIngresa a la sala de espera virtual en nuestro sitio web y usa tu código para conectarte.\n\n— Consultorio Bienestar Integral`
        );
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    };

    const formatDate = (d: string) => new Date(d).toLocaleString('es-NI', { dateStyle: 'medium', timeStyle: 'short' });

    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'Solicitada': return 'bg-orange-100 text-orange-700';
            case 'Aprobada': return 'bg-blue-100 text-blue-700';
            case 'EnCurso': return 'bg-green-100 text-green-700 animate-pulse';
            case 'Completada': return 'bg-slate-100 text-slate-600';
            case 'Cancelada': return 'bg-red-100 text-red-600';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const pendingCount = sessions.filter(s => s.estado === 'Solicitada').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="bg-brand-100 p-2 rounded-lg">
                            <Video className="text-brand-600" size={24} />
                        </div>
                        Teleconsultas
                    </h2>
                    <p className="text-slate-500 mt-1">Gestiona horarios y sesiones virtuales</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-all flex items-center gap-2 shadow-lg shadow-brand-200"
                >
                    <Plus size={20} />
                    Nueva Teleconsulta
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('sessions')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'sessions' ? 'bg-white text-brand-700 shadow' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    <span className="flex items-center gap-2">
                        Sesiones
                        {pendingCount > 0 && (
                            <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCount}</span>
                        )}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('availability')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'availability' ? 'bg-white text-brand-700 shadow' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    <span className="flex items-center gap-2">
                        <Clock size={16} />
                        Horarios
                    </span>
                </button>
            </div>

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
                <div className="space-y-4">
                    {sessions.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                            <Video className="mx-auto text-slate-300 mb-4" size={48} />
                            <p className="text-slate-500 font-medium">No hay teleconsultas programadas</p>
                            <p className="text-slate-400 text-sm mt-1">Crea una nueva sesión o espera solicitudes de pacientes</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {sessions.map(session => (
                                <div key={session.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-slate-800 text-lg">{session.nombrePaciente}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(session.estado)}`}>
                                                    {session.estado}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-brand-500" />
                                                    {formatDate(session.fechaHora)}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-brand-500" />
                                                    {session.duracion} min
                                                </span>
                                                {session.telefono && (
                                                    <span className="flex items-center gap-1.5">
                                                        <Phone size={14} className="text-brand-500" />
                                                        {session.telefono}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Code Display */}
                                            <div className="mt-3 flex items-center gap-2">
                                                <code className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-mono font-bold text-brand-700 tracking-wider">
                                                    {session.codigo}
                                                </code>
                                                <button
                                                    onClick={() => handleCopyCode(session.id, session.codigo)}
                                                    className={`p-1.5 rounded-md transition-all ${copiedId === session.id ? 'bg-green-100 text-green-600' : 'hover:bg-slate-100 text-slate-400'}`}
                                                    title="Copiar código"
                                                >
                                                    {copiedId === session.id ? <Check size={16} /> : <Copy size={16} />}
                                                </button>
                                                {(session.telefono || session.patient?.telefono) && (
                                                    <button
                                                        onClick={() => handleWhatsApp(session)}
                                                        className="p-1.5 rounded-md hover:bg-green-50 text-green-600 transition-all"
                                                        title="Enviar por WhatsApp"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 ml-4">
                                            {session.estado === 'Solicitada' && (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStatus(session.id, 'Aprobada')}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-1.5"
                                                    >
                                                        <Check size={16} /> Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateStatus(session.id, 'Cancelada')}
                                                        className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition flex items-center gap-1.5"
                                                    >
                                                        <X size={16} /> Rechazar
                                                    </button>
                                                </>
                                            )}
                                            {(session.estado === 'Aprobada' || session.estado === 'EnCurso') && (
                                                <button
                                                    onClick={() => onJoinAsDoctor(session.roomName)}
                                                    className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1.5 shadow-lg"
                                                >
                                                    <Play size={16} /> Iniciar
                                                </button>
                                            )}
                                            {(session.estado === 'EnCurso' || session.estado === 'Aprobada') && (
                                                <button
                                                    onClick={() => handleUpdateStatus(session.id, 'Completada')}
                                                    className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition"
                                                >
                                                    Completar
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteSession(session.id)}
                                                className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition self-end"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
                <div className="space-y-6">
                    {/* Current Slots */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <Clock size={18} className="text-brand-600" />
                                Horarios Configurados
                            </h3>
                        </div>
                        {slots.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Clock className="mx-auto text-slate-300 mb-3" size={40} />
                                <p>No hay horarios configurados</p>
                                <p className="text-sm mt-1">Agrega horarios para que los pacientes puedan solicitar teleconsultas</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {slots.map(slot => (
                                    <div key={slot.id} className="flex justify-between items-center px-5 py-3 hover:bg-slate-50">
                                        <div className="flex items-center gap-4">
                                            <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-sm font-semibold min-w-[100px] text-center">
                                                {DAYS[slot.dayOfWeek]}
                                            </span>
                                            <span className="text-slate-700 font-medium">
                                                {slot.startTime} — {slot.endTime}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSlot(slot.id)}
                                            className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-red-50 transition"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Slot */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5">
                        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Plus size={18} className="text-brand-600" />
                            Agregar Horario
                        </h3>
                        <div className="flex flex-wrap gap-4 items-end">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Día</label>
                                <select
                                    value={newSlot.dayOfWeek}
                                    onChange={e => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                                >
                                    {DAYS.map((day, idx) => (
                                        <option key={idx} value={idx}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Hora Inicio</label>
                                <input
                                    type="time"
                                    value={newSlot.startTime}
                                    onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Hora Fin</label>
                                <input
                                    type="time"
                                    value={newSlot.endTime}
                                    onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                                />
                            </div>
                            <button
                                onClick={handleAddSlot}
                                className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-2"
                            >
                                <Plus size={16} /> Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Session Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Nueva Teleconsulta</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Patient Select */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Paciente registrado (opcional)</label>
                                <select
                                    value={selectedPatientId}
                                    onChange={e => {
                                        const pid = e.target.value ? parseInt(e.target.value) : '';
                                        setSelectedPatientId(pid);
                                        if (pid) {
                                            const p = patients.find(p => p.id === pid);
                                            if (p) {
                                                setNewSession({ ...newSession, nombrePaciente: p.nombre, telefono: p.telefono || '' });
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                >
                                    <option value="">— Invitado externo —</option>
                                    {patients.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Paciente *</label>
                                <input
                                    type="text"
                                    value={newSession.nombrePaciente}
                                    onChange={e => setNewSession({ ...newSession, nombrePaciente: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    placeholder="Juan Pérez"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (para WhatsApp)</label>
                                <input
                                    type="tel"
                                    value={newSession.telefono}
                                    onChange={e => setNewSession({ ...newSession, telefono: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    placeholder="+505 8888-8888"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha y Hora *</label>
                                    <input
                                        type="datetime-local"
                                        value={newSession.fechaHora}
                                        onChange={e => setNewSession({ ...newSession, fechaHora: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Duración (min)</label>
                                    <select
                                        value={newSession.duracion}
                                        onChange={e => setNewSession({ ...newSession, duracion: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    >
                                        <option value={30}>30 min</option>
                                        <option value={45}>45 min</option>
                                        <option value={60}>60 min</option>
                                        <option value={90}>90 min</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-slate-100">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateSession}
                                disabled={!newSession.nombrePaciente || !newSession.fechaHora}
                                className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition disabled:opacity-50"
                            >
                                Crear y Aprobar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
