import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Users, MapPin, DollarSign, Clock, ChevronDown, ChevronUp, UserX, Edit2, X, CheckCircle } from 'lucide-react';

interface Enrollment {
    id: number;
    patient: { id: number; nombre: string; telefono?: string };
    fechaInscripcion: string;
    pagado: boolean;
}

interface WaitlistEntry {
    id: number;
    patient: { nombre: string; telefono?: string };
    creadoEn: string;
}

interface Workshop {
    id: number;
    titulo: string;
    descripcion: string;
    fechaInicio: string;
    fechaFin?: string;
    precio: number;
    cupoMaximo: number;
    inscritos: number;
    ubicacion: string;
    horario: string;
    estado: string; // "Abierto" | "Cerrado" | "Finalizado"
    enrollments: Enrollment[];
    waitlist: WaitlistEntry[];
}

interface Patient { id: number; nombre: string; }

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
});

const STATUS_COLORS: Record<string, string> = {
    'Abierto': 'bg-green-100 text-green-700',
    'Cerrado': 'bg-amber-100 text-amber-700',
    'Finalizado': 'bg-slate-100 text-slate-600'
};

const EMPTY_WORKSHOP = {
    titulo: '', descripcion: '', fechaInicio: '', fechaFin: '',
    precio: 0, cupoMaximo: 10, ubicacion: 'Consultorio', horario: ''
};

export const WorkshopManager: React.FC = () => {
    const [workshops, setWorkshops] = useState<Workshop[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
    const [showEnrollModal, setShowEnrollModal] = useState<number | null>(null);
    const [expandedWorkshop, setExpandedWorkshop] = useState<number | null>(null);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [formData, setFormData] = useState(EMPTY_WORKSHOP);
    const [selectedPatientId, setSelectedPatientId] = useState<number>(0);
    const [savingStatus, setSavingStatus] = useState<number | null>(null);

    useEffect(() => {
        fetchWorkshops();
        fetchPatients();
    }, []);

    const showMsg = (text: string, ok = true) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg(null), 3500);
    };

    const fetchWorkshops = async () => {
        try {
            const res = await fetch('/api/workshops', { headers: getAuthHeaders() });
            const data = await res.json();
            setWorkshops(data);
        } catch (error) { console.error('Error fetching workshops', error); }
    };

    const fetchPatients = async () => {
        try {
            const res = await fetch('/api/patients?limit=200', { headers: getAuthHeaders() });
            const json = await res.json();
            setPatients(json.data ?? json);
        } catch (error) { console.error('Error fetching patients', error); }
    };

    // ── CREATE / EDIT WORKSHOP ──────────────────────────────────
    const openCreateModal = () => {
        setFormData(EMPTY_WORKSHOP);
        setEditingWorkshop(null);
        setShowCreateModal(true);
    };

    const openEditModal = (w: Workshop) => {
        setFormData({
            titulo: w.titulo,
            descripcion: w.descripcion,
            fechaInicio: w.fechaInicio ? w.fechaInicio.slice(0, 10) : '',
            fechaFin: w.fechaFin ? w.fechaFin.slice(0, 10) : '',
            precio: w.precio,
            cupoMaximo: w.cupoMaximo,
            ubicacion: w.ubicacion,
            horario: w.horario
        });
        setEditingWorkshop(w);
        setShowCreateModal(true);
    };

    const handleSaveWorkshop = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingWorkshop ? `/api/workshops/${editingWorkshop.id}` : '/api/workshops';
            const method = editingWorkshop ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setShowCreateModal(false);
                setEditingWorkshop(null);
                fetchWorkshops();
                showMsg(editingWorkshop ? 'Taller actualizado.' : 'Taller creado exitosamente.');
            } else {
                const err = await res.json();
                showMsg(`Error: ${err.error}`, false);
            }
        } catch (error) {
            showMsg('Error al guardar el taller.', false);
        }
    };

    // ── STATUS CHANGE ───────────────────────────────────────────
    const handleStatusChange = async (workshopId: number, estado: string) => {
        setSavingStatus(workshopId);
        try {
            const res = await fetch(`/api/workshops/${workshopId}/status`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ estado })
            });
            if (res.ok) {
                fetchWorkshops();
                showMsg(`Estado cambiado a "${estado}".`);
            } else {
                showMsg('Error al cambiar estado.', false);
            }
        } catch {
            showMsg('Error al cambiar estado.', false);
        } finally {
            setSavingStatus(null);
        }
    };

    // ── ENROLL ──────────────────────────────────────────────────
    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showEnrollModal || !selectedPatientId) return;
        try {
            const res = await fetch(`/api/workshops/${showEnrollModal}/enroll`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ patientId: selectedPatientId })
            });
            if (res.ok) {
                setShowEnrollModal(null);
                setSelectedPatientId(0);
                fetchWorkshops();
                showMsg('Paciente inscrito exitosamente.');
            } else {
                const err = await res.json();
                showMsg(`Error: ${err.error}`, false);
            }
        } catch { showMsg('Error al inscribir.', false); }
    };

    // ── WAITLIST ──────────────────────────────────────────────────
    const handleAddToWaitlist = async (workshopId: number) => {
        if (!selectedPatientId) { showMsg('Selecciona un paciente primero.', false); return; }
        try {
            const res = await fetch(`/api/workshops/${workshopId}/waitlist`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ patientId: selectedPatientId })
            });
            if (res.ok) {
                setShowEnrollModal(null);
                setSelectedPatientId(0);
                fetchWorkshops();
                showMsg('Paciente añadido a lista de espera.');
            } else {
                const err = await res.json();
                showMsg(`Error: ${err.error}`, false);
            }
        } catch { showMsg('Error al añadir a lista de espera.', false); }
    };

    const handleRemoveFromWaitlist = async (workshopId: number, entryId: number, nombre: string) => {
        if (!confirm(`¿Quitar a ${nombre} de la lista de espera?`)) return;
        try {
            const res = await fetch(`/api/workshops/${workshopId}/waitlist/${entryId}`, {
                method: 'DELETE', headers: getAuthHeaders()
            });
            if (res.ok) { fetchWorkshops(); showMsg(`${nombre} quitado de lista de espera.`); }
        } catch { showMsg('Error al quitar de lista de espera.', false); }
    };

    // ── TOGGLE PAYMENT ───────────────────────────────────────────
    const handleTogglePayment = async (workshopId: number, enrollmentId: number, currentPagado: boolean) => {
        try {
            const res = await fetch(`/api/workshops/${workshopId}/enrollments/${enrollmentId}/payment`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ pagado: !currentPagado })
            });
            if (res.ok) {
                setWorkshops(prev => prev.map(w => {
                    if (w.id !== workshopId) return w;
                    return {
                        ...w,
                        enrollments: w.enrollments.map(e =>
                            e.id === enrollmentId ? { ...e, pagado: !currentPagado } : e
                        )
                    };
                }));
            } else {
                showMsg('Error al actualizar pago.', false);
            }
        } catch { showMsg('Error al actualizar pago.', false); }
    };

    // ── UNENROLL ─────────────────────────────────────────────────
    const handleUnenroll = async (workshopId: number, enrollmentId: number, nombre: string) => {
        if (!confirm(`¿Dar de baja a ${nombre} del taller?`)) return;
        try {
            const res = await fetch(`/api/workshops/${workshopId}/enrollments/${enrollmentId}`, {
                method: 'DELETE', headers: getAuthHeaders()
            });
            if (res.ok) { fetchWorkshops(); showMsg(`${nombre} dado de baja.`); }
        } catch { showMsg('Error al dar de baja.', false); }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Gestión de Talleres y Cursos</h2>
                <button onClick={openCreateModal} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 transition">
                    <Plus size={20} /> Nuevo Taller
                </button>
            </div>

            {/* Feedback */}
            {msg && (
                <div className={`px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 ${msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {msg.ok && <CheckCircle size={15} />} {msg.text}
                </div>
            )}

            {/* Workshop cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workshops.map(workshop => {
                    const isFull = workshop.inscritos >= workshop.cupoMaximo;
                    const isExpanded = expandedWorkshop === workshop.id;

                    return (
                        <div key={workshop.id} className="bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition overflow-hidden flex flex-col">
                            <div className="p-6 flex-1">
                                {/* Title row */}
                                <div className="flex justify-between items-start mb-2 gap-2">
                                    <h3 className="text-lg font-bold text-slate-900 leading-snug">{workshop.titulo}</h3>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => openEditModal(workshop)}
                                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                            title="Editar taller"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Status + capacity badges */}
                                <div className="flex items-center gap-2 mb-3">
                                    {/* Status selector */}
                                    <div className="relative">
                                        <select
                                            value={workshop.estado}
                                            disabled={savingStatus === workshop.id}
                                            onChange={e => handleStatusChange(workshop.id, e.target.value)}
                                            className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none pr-6 ${STATUS_COLORS[workshop.estado] || 'bg-slate-100 text-slate-600'}`}
                                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
                                        >
                                            <option value="Abierto">Abierto</option>
                                            <option value="Cerrado">Cerrado</option>
                                            <option value="Finalizado">Finalizado</option>
                                        </select>
                                    </div>
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isFull ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-600'}`}>
                                        {workshop.inscritos}/{workshop.cupoMaximo}
                                    </span>
                                </div>

                                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{workshop.descripcion}</p>

                                <div className="space-y-1.5 text-sm text-slate-500 mb-5">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-brand-500 shrink-0" />
                                        <span>{new Date(workshop.fechaInicio).toLocaleDateString('es-NI')}</span>
                                    </div>
                                    {workshop.horario && (
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="text-brand-500 shrink-0" />
                                            <span>{workshop.horario}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-brand-500 shrink-0" />
                                        <span>{workshop.ubicacion}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign size={14} className="text-brand-500 shrink-0" />
                                        <span className="font-bold text-slate-900">C$ {workshop.precio}</span>
                                    </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    {isFull && workshop.estado === 'Abierto' ? (
                                        <button
                                            onClick={() => setShowEnrollModal(workshop.id)}
                                            className="flex-1 bg-amber-50 text-amber-700 border border-amber-200 py-2 rounded-lg text-sm font-medium hover:bg-amber-100 transition"
                                        >
                                            + Lista de espera
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowEnrollModal(workshop.id)}
                                            disabled={!isFull && workshop.estado !== 'Abierto'}
                                            className="flex-1 bg-brand-50 text-brand-700 border border-brand-200 py-2 rounded-lg text-sm font-medium hover:bg-brand-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            + Inscribir
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setExpandedWorkshop(isExpanded ? null : workshop.id)}
                                        className="flex items-center gap-1 px-3 py-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-sm hover:bg-slate-100 transition"
                                    >
                                        <Users size={14} />
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded enrollee list */}
                            {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50">
                                    <div className="px-5 py-3">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                            Inscritos ({workshop.enrollments.length})
                                        </p>
                                    </div>
                                    {workshop.enrollments.length === 0 ? (
                                        <p className="px-5 pb-4 text-sm text-slate-400 italic">Sin inscritos aún.</p>
                                    ) : (
                                        <ul className="divide-y divide-slate-100">
                                            {workshop.enrollments.map(enrollment => (
                                                <li key={enrollment.id} className="px-5 py-3 flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-800">{enrollment.patient.nombre}</p>
                                                        {enrollment.patient.telefono && (
                                                            <p className="text-xs text-slate-400">{enrollment.patient.telefono}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => handleTogglePayment(workshop.id, enrollment.id, enrollment.pagado)}
                                                            className={`text-xs px-2 py-1 rounded-full font-medium transition-colors ${enrollment.pagado ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                                                            title={enrollment.pagado ? 'Marcar como pendiente' : 'Marcar como pagado'}
                                                        >
                                                            {enrollment.pagado ? '✓ Pagado' : 'Pendiente'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleUnenroll(workshop.id, enrollment.id, enrollment.patient.nombre)}
                                                            className="text-xs flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            <UserX size={13} />
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {/* Waitlist section */}
                                    {workshop.waitlist && workshop.waitlist.length > 0 && (
                                        <>
                                            <div className="px-5 py-2 border-t border-amber-100 bg-amber-50">
                                                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                                                    Lista de espera ({workshop.waitlist.length})
                                                </p>
                                            </div>
                                            <ul className="divide-y divide-amber-50 bg-amber-50">
                                                {workshop.waitlist.map(entry => (
                                                    <li key={entry.id} className="px-5 py-2.5 flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-700">{entry.patient.nombre}</p>
                                                            {entry.patient.telefono && <p className="text-xs text-slate-400">{entry.patient.telefono}</p>}
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveFromWaitlist(workshop.id, entry.id, entry.patient.nombre)}
                                                            className="text-xs flex items-center gap-1 text-amber-600 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            <UserX size={13} />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}

                {workshops.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400">
                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No hay talleres programados.</p>
                    </div>
                )}
            </div>

            {/* ── CREATE / EDIT MODAL ── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="text-xl font-bold">
                                {editingWorkshop ? `Editar: ${editingWorkshop.titulo}` : 'Crear Nuevo Taller'}
                            </h3>
                            <button onClick={() => { setShowCreateModal(false); setEditingWorkshop(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveWorkshop} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Título *</label>
                                <input required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" rows={3} value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fecha Inicio *</label>
                                    <input type="date" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.fechaInicio} onChange={e => setFormData({ ...formData, fechaInicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Fecha Fin</label>
                                    <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.fechaFin} onChange={e => setFormData({ ...formData, fechaFin: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Horario</label>
                                <input placeholder="Ej: Sábados 9:00 – 12:00" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.horario} onChange={e => setFormData({ ...formData, horario: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Precio (C$) *</label>
                                    <input type="number" min="0" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.precio} onChange={e => setFormData({ ...formData, precio: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Cupo Máximo *</label>
                                    <input type="number" min="1" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.cupoMaximo} onChange={e => setFormData({ ...formData, cupoMaximo: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ubicación</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={formData.ubicacion} onChange={e => setFormData({ ...formData, ubicacion: e.target.value })}>
                                    <option value="Consultorio">Consultorio (Presencial)</option>
                                    <option value="Online">Online (Virtual)</option>
                                    <option value="Híbrido">Híbrido</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => { setShowCreateModal(false); setEditingWorkshop(null); }} className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                                <button type="submit" className="flex-1 bg-brand-600 text-white py-2.5 rounded-lg text-sm hover:bg-brand-700 font-medium">
                                    {editingWorkshop ? 'Guardar Cambios' : 'Crear Taller'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── ENROLL / WAITLIST MODAL ── */}
            {showEnrollModal && (() => {
                const ws = workshops.find(w => w.id === showEnrollModal);
                const isWaitlistMode = ws ? ws.inscritos >= ws.cupoMaximo : false;
                return (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-md w-full p-6">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-xl font-bold">
                                    {isWaitlistMode ? 'Añadir a Lista de Espera' : 'Inscribir Paciente'}
                                </h3>
                                <button onClick={() => setShowEnrollModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            </div>
                            {isWaitlistMode && (
                                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                                    Este taller está lleno. El paciente quedará en lista de espera.
                                </p>
                            )}
                            <form onSubmit={isWaitlistMode ? (e) => { e.preventDefault(); handleAddToWaitlist(showEnrollModal); } : handleEnroll} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Seleccionar Paciente *</label>
                                    <select
                                        required
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        value={selectedPatientId}
                                        onChange={e => setSelectedPatientId(Number(e.target.value))}
                                    >
                                        <option value={0}>-- Seleccionar --</option>
                                        {patients.map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowEnrollModal(null)} className="flex-1 border border-slate-200 py-2.5 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                                    <button type="submit" disabled={!selectedPatientId} className={`flex-1 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 ${isWaitlistMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-600 hover:bg-brand-700'}`}>
                                        {isWaitlistMode ? 'Añadir a Lista de Espera' : 'Confirmar Inscripción'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
