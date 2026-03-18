import React, { useState, useEffect } from 'react';
import { X, User, FileText, Clock, Save, Edit2, CheckCircle, Target, Plus, AlertTriangle, XCircle, Pencil, Package, BarChart2 } from 'lucide-react';
import { Patient, ClinicalRecord, Session } from '../types';
import { AssessmentPanel } from './AssessmentPanel';

interface PatientDetailsProps {
    patientId: number;
    onClose: () => void;
}

type TabType = 'general' | 'clinical' | 'timeline' | 'goals' | 'packages' | 'escalas';

interface Goal {
    id: number;
    titulo: string;
    descripcion: string;
    estado: string;
    progreso: number;
    fechaLimite: string | null;
    fechaLogro: string | null;
}

const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
});

export const PatientDetails: React.FC<PatientDetailsProps> = ({ patientId, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [patient, setPatient] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Clinical record editing
    const [editingClinical, setEditingClinical] = useState(false);
    const [clinicalData, setClinicalData] = useState({
        antecedentesMedicos: '',
        antecedentesFamiliares: '',
        historiaDesarrollo: '',
        diagnostico: ''
    });

    // General info editing
    const [editingGeneral, setEditingGeneral] = useState(false);
    const [generalData, setGeneralData] = useState({
        nombre: '', edad: '', telefono: '', motivo: '',
        ocupacion: '', escolaridad: '', estadoCivil: '',
        tutorNombre: '', tutorRelacion: ''
    });

    // Discharge
    const [showDischargeConfirm, setShowDischargeConfirm] = useState(false);
    const [motivoAlta, setMotivoAlta] = useState('');

    // Session SOAP expand
    const [expandedSession, setExpandedSession] = useState<number | null>(null);

    // Session SOAP editing
    const [editingSoapSession, setEditingSoapSession] = useState<number | null>(null);
    const [soapForm, setSoapForm] = useState({ notaSubjetiva: '', notaObjetiva: '', notaAnalisis: '', notaPlan: '' });
    const [savingSoap, setSavingSoap] = useState(false);

    // Goals
    const [goals, setGoals] = useState<Goal[]>([]);
    const [showNewGoalForm, setShowNewGoalForm] = useState(false);
    const [newGoal, setNewGoal] = useState({ titulo: '', descripcion: '', fechaLimite: '' });
    const [savingGoal, setSavingGoal] = useState(false);

    // Packages
    const [pkgs, setPkgs] = useState<any[]>([]);
    const [showNewPkgForm, setShowNewPkgForm] = useState(false);
    const [newPkg, setNewPkg] = useState({ titulo: '', totalSesiones: 10, precioTotal: 0, notas: '' });
    const [savingPkg, setSavingPkg] = useState(false);

    useEffect(() => {
        loadPatientData();
    }, [patientId]);

    useEffect(() => {
        if (activeTab === 'goals') loadGoals();
        if (activeTab === 'packages') loadPackages();
    }, [activeTab]);

    const loadPatientData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/patients/${patientId}`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to fetch patient');
            const data = await response.json();
            setPatient(data);
            if (data.clinicalRecord) setClinicalData(data.clinicalRecord);
            setGeneralData({
                nombre: data.nombre || '',
                edad: String(data.edad || ''),
                telefono: data.telefono || '',
                motivo: data.motivo || '',
                ocupacion: data.ocupacion || '',
                escolaridad: data.escolaridad || '',
                estadoCivil: data.estadoCivil || '',
                tutorNombre: data.tutorNombre || '',
                tutorRelacion: data.tutorRelacion || ''
            });
        } catch (err) {
            setError('Error cargando datos del paciente.');
        } finally {
            setLoading(false);
        }
    };

    const loadGoals = async () => {
        try {
            const res = await fetch(`/api/patients/${patientId}/goals`, { headers: getAuthHeaders() });
            const data = await res.json();
            setGoals(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading goals:', err);
        }
    };

    const loadPackages = async () => {
        try {
            const res = await fetch(`/api/packages?patientId=${patientId}`, { headers: getAuthHeaders() });
            const data = await res.json();
            setPkgs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading packages:', err);
        }
    };

    const handleCreatePackage = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPkg(true);
        try {
            const res = await fetch('/api/packages', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ...newPkg, patientId })
            });
            if (res.ok) {
                setShowNewPkgForm(false);
                setNewPkg({ titulo: '', totalSesiones: 10, precioTotal: 0, notas: '' });
                loadPackages();
            }
        } catch (err) { console.error('Error creating package:', err); }
        finally { setSavingPkg(false); }
    };

    const handleUsePkgSession = async (pkgId: number) => {
        try {
            const res = await fetch(`/api/packages/${pkgId}/use`, { method: 'PATCH', headers: getAuthHeaders() });
            if (res.ok) loadPackages();
        } catch (err) { console.error('Error using package session:', err); }
    };

    const handleCancelPackage = async (pkgId: number) => {
        if (!confirm('¿Cancelar este paquete?')) return;
        try {
            const res = await fetch(`/api/packages/${pkgId}/cancel`, { method: 'PATCH', headers: getAuthHeaders() });
            if (res.ok) loadPackages();
        } catch (err) { console.error('Error cancelling package:', err); }
    };

    const handleSaveClinical = async () => {
        try {
            setSaving(true);
            const method = patient?.clinicalRecord ? 'PUT' : 'POST';
            const res = await fetch(`/api/patients/${patientId}/clinical-record`, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(clinicalData)
            });
            if (!res.ok) throw new Error('Failed to save');
            await loadPatientData();
            setEditingClinical(false);
        } catch (err) {
            setError('Error guardando expediente clínico.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSoap = async (sessionId: number) => {
        try {
            setSavingSoap(true);
            const res = await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(soapForm)
            });
            if (!res.ok) throw new Error('Failed');
            await loadPatientData();
            setEditingSoapSession(null);
        } catch (err) {
            setError('Error guardando notas SOAP.');
        } finally {
            setSavingSoap(false);
        }
    };

    const openSoapEdit = (session: any) => {
        setSoapForm({
            notaSubjetiva: session.notaSubjetiva || '',
            notaObjetiva: session.notaObjetiva || '',
            notaAnalisis: session.notaAnalisis || '',
            notaPlan: session.notaPlan || ''
        });
        setEditingSoapSession(session.id);
        setExpandedSession(session.id);
    };

    const handleSaveGeneral = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/patients/${patientId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...generalData,
                    edad: parseInt(generalData.edad) || patient?.edad
                })
            });
            if (!res.ok) throw new Error('Failed to update');
            await loadPatientData();
            setEditingGeneral(false);
        } catch (err) {
            setError('Error guardando datos del paciente.');
        } finally {
            setSaving(false);
        }
    };

    const handleDischarge = async () => {
        if (!motivoAlta.trim()) return;
        try {
            setSaving(true);
            const res = await fetch(`/api/patients/${patientId}/discharge`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ motivoAlta })
            });
            if (!res.ok) throw new Error('Failed');
            await loadPatientData();
            setShowDischargeConfirm(false);
            setMotivoAlta('');
        } catch (err) {
            setError('Error al dar de alta al paciente.');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSavingGoal(true);
            const res = await fetch(`/api/patients/${patientId}/goals`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(newGoal)
            });
            if (!res.ok) throw new Error('Failed');
            setNewGoal({ titulo: '', descripcion: '', fechaLimite: '' });
            setShowNewGoalForm(false);
            await loadGoals();
        } catch (err) {
            setError('Error creando objetivo.');
        } finally {
            setSavingGoal(false);
        }
    };

    const handleUpdateGoalStatus = async (goalId: number, estado: string) => {
        try {
            const res = await fetch(`/api/goals/${goalId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ estado })
            });
            if (!res.ok) throw new Error('Failed');
            await loadGoals();
        } catch (err) {
            setError('Error actualizando objetivo.');
        }
    };

    const TABS = [
        { id: 'general', label: 'General', icon: <User size={16} /> },
        { id: 'clinical', label: 'Clínica', icon: <FileText size={16} /> },
        { id: 'timeline', label: 'Historial', icon: <Clock size={16} /> },
        { id: 'goals', label: 'Objetivos', icon: <Target size={16} /> },
        { id: 'packages', label: 'Paquetes', icon: <Package size={16} /> },
        { id: 'escalas', label: 'Escalas', icon: <BarChart2 size={16} /> }
    ] as const;

    if (loading) return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Cargando expediente...</p>
            </div>
        </div>
    );

    if (!patient) return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-red-600 mb-4">Error: Paciente no encontrado</p>
                <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-lg">Cerrar</button>
            </div>
        </div>
    );

    const isAlta = patient.estado === 'Alta';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold">{patient.nombre}</h2>
                                {isAlta ? (
                                    <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium">
                                        ✓ Alta
                                    </span>
                                ) : (
                                    <span className="bg-green-400/30 text-white text-xs px-3 py-1 rounded-full font-medium">
                                        Activo
                                    </span>
                                )}
                            </div>
                            <p className="text-brand-100 text-sm mt-1">Expediente Clínico #{patient.id}</p>
                            {isAlta && (
                                <p className="text-brand-200 text-xs mt-1">
                                    Alta: {new Date(patient.fechaAlta).toLocaleDateString('es-NI')} — {patient.motivoAlta}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Discharge button - only if active */}
                            {!isAlta && (
                                <button
                                    onClick={() => setShowDischargeConfirm(true)}
                                    className="text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                                    title="Dar de Alta al paciente"
                                >
                                    <CheckCircle size={14} /> Dar de Alta
                                </button>
                            )}
                            <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-5 border-b border-brand-500">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-3 px-3 flex items-center gap-2 text-sm transition-colors border-b-2 ${activeTab === tab.id
                                    ? 'border-white text-white font-medium'
                                    : 'border-transparent text-brand-200 hover:text-white'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error banner */}
                {error && (
                    <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center justify-between">
                        <p className="text-sm text-red-700">{error}</p>
                        <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><XCircle size={16} /></button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ── TAB 1: GENERAL ── */}
                    {activeTab === 'general' && (
                        <div className="space-y-5">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">Datos del Paciente</h3>
                                {!editingGeneral ? (
                                    <button
                                        onClick={() => setEditingGeneral(true)}
                                        className="flex items-center gap-2 px-4 py-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors text-sm font-medium"
                                    >
                                        <Edit2 size={15} /> Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingGeneral(false)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                                        <button
                                            onClick={handleSaveGeneral}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
                                        >
                                            <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {editingGeneral ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { label: 'Nombre completo', key: 'nombre', type: 'text' },
                                        { label: 'Edad', key: 'edad', type: 'number' },
                                        { label: 'Teléfono', key: 'telefono', type: 'tel' },
                                        { label: 'Ocupación', key: 'ocupacion', type: 'text' },
                                        { label: 'Escolaridad', key: 'escolaridad', type: 'text' },
                                        { label: 'Estado Civil', key: 'estadoCivil', type: 'text' },
                                        { label: 'Nombre del Tutor/Guardián', key: 'tutorNombre', type: 'text' },
                                        { label: 'Parentesco del Tutor', key: 'tutorRelacion', type: 'text' }
                                    ].map(field => (
                                        <div key={field.key}>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{field.label}</label>
                                            <input
                                                type={field.type}
                                                value={(generalData as any)[field.key]}
                                                onChange={e => setGeneralData({ ...generalData, [field.key]: e.target.value })}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                        </div>
                                    ))}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Motivo de Consulta</label>
                                        <textarea
                                            value={generalData.motivo}
                                            onChange={e => setGeneralData({ ...generalData, motivo: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {[
                                            { label: 'Edad', value: `${patient.edad} años` },
                                            { label: 'Teléfono', value: patient.telefono },
                                            { label: 'Ocupación', value: patient.ocupacion || '—' },
                                            { label: 'Escolaridad', value: patient.escolaridad || '—' },
                                            { label: 'Estado Civil', value: patient.estadoCivil || '—' },
                                            { label: 'Fecha Nacimiento', value: patient.fechaNacimiento ? new Date(patient.fechaNacimiento).toLocaleDateString('es-NI') : '—' },
                                        ].map(item => (
                                            <div key={item.label} className="bg-slate-50 p-4 rounded-lg">
                                                <p className="text-xs font-semibold text-slate-500 uppercase">{item.label}</p>
                                                <p className="text-base font-medium text-slate-800 mt-1">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-brand-50 border border-brand-100 p-4 rounded-lg">
                                        <p className="text-xs font-semibold text-brand-700 uppercase mb-2">Motivo de Consulta</p>
                                        <p className="text-slate-700 leading-relaxed">{patient.motivo}</p>
                                    </div>

                                    {(patient.tutorNombre || patient.tutorRelacion) && (
                                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                                            <p className="text-xs font-semibold text-amber-700 uppercase mb-2">Tutor / Guardián</p>
                                            <p className="text-slate-700 font-medium">{patient.tutorNombre}</p>
                                            <p className="text-slate-500 text-sm">{patient.tutorRelacion}</p>
                                        </div>
                                    )}

                                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-500">
                                        Registrado el: {new Date(patient.createdAt).toLocaleString('es-NI')}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── TAB 2: CLINICAL RECORD ── */}
                    {activeTab === 'clinical' && (
                        <div className="space-y-4">
                            {!editingClinical && !patient.clinicalRecord ? (
                                <div className="text-center py-12">
                                    <FileText className="mx-auto text-slate-300 mb-4" size={64} />
                                    <p className="text-slate-500 mb-4">No hay expediente clínico registrado</p>
                                    <button onClick={() => setEditingClinical(true)} className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                                        Crear Expediente
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-slate-800">Anamnesis</h3>
                                        {!editingClinical && (
                                            <button onClick={() => setEditingClinical(true)} className="flex items-center gap-2 px-4 py-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors text-sm">
                                                <Edit2 size={15} /> Editar
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        {[
                                            { label: 'Antecedentes Médicos', key: 'antecedentesMedicos', placeholder: 'Enfermedades previas, cirugías, medicamentos actuales...' },
                                            { label: 'Antecedentes Familiares', key: 'antecedentesFamiliares', placeholder: 'Historial familiar de enfermedades mentales, neurológicas...' },
                                            { label: 'Historia del Desarrollo', key: 'historiaDesarrollo', placeholder: 'Embarazo, parto, hitos del desarrollo (gateo, caminata, lenguaje)...' },
                                            { label: 'Diagnóstico (DSM-5 / CIE-10)', key: 'diagnostico', placeholder: 'Impresión clínica, diagnóstico diferencial...' }
                                        ].map(field => (
                                            <div key={field.key}>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">{field.label}</label>
                                                {editingClinical ? (
                                                    <textarea
                                                        value={(clinicalData as any)[field.key]}
                                                        onChange={e => setClinicalData({ ...clinicalData, [field.key]: e.target.value })}
                                                        className="w-full h-24 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                                                        placeholder={field.placeholder}
                                                    />
                                                ) : (
                                                    <p className="text-slate-600 bg-slate-50 p-4 rounded-lg text-sm leading-relaxed">
                                                        {(clinicalData as any)[field.key] || <span className="text-slate-400 italic">Sin información</span>}
                                                    </p>
                                                )}
                                            </div>
                                        ))}

                                        {editingClinical && (
                                            <div className="flex gap-3 pt-2">
                                                <button onClick={() => setEditingClinical(false)} className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm">
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handleSaveClinical}
                                                    disabled={saving}
                                                    className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                                >
                                                    <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Expediente'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ── TAB 3: SESSION TIMELINE ── */}
                    {activeTab === 'timeline' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-slate-800">Historial de Sesiones</h3>

                            {!patient.sessions || patient.sessions.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="mx-auto text-slate-300 mb-4" size={64} />
                                    <p className="text-slate-500">No hay sesiones registradas</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {patient.sessions.map((session: any) => {
                                        const hasSoap = session.notaSubjetiva || session.notaObjetiva || session.notaAnalisis || session.notaPlan;
                                        const isExpanded = expandedSession === session.id;
                                        const isEditingSoap = editingSoapSession === session.id;

                                        return (
                                            <div key={session.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                                                {/* Session header */}
                                                <div className="p-4 flex justify-between items-start">
                                                    <button
                                                        className="flex-1 text-left"
                                                        onClick={() => {
                                                            if (isEditingSoap) return;
                                                            setExpandedSession(isExpanded ? null : session.id);
                                                        }}
                                                    >
                                                        <p className="font-semibold text-slate-800">
                                                            {new Date(session.fecha).toLocaleDateString('es-NI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </p>
                                                        <p className="text-sm text-slate-500 mt-0.5">
                                                            {session.tipo || 'Terapia'} &bull; C$ {session.pago?.toFixed(2)}
                                                        </p>
                                                    </button>
                                                    <div className="flex items-center gap-2 ml-3 shrink-0">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${session.estadoPago === 'Pagado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {session.estadoPago}
                                                        </span>
                                                        {/* SOAP edit button */}
                                                        <button
                                                            onClick={() => {
                                                                if (isEditingSoap) {
                                                                    setEditingSoapSession(null);
                                                                } else {
                                                                    openSoapEdit(session);
                                                                }
                                                            }}
                                                            className={`p-1.5 rounded-lg transition-colors ${isEditingSoap ? 'bg-brand-100 text-brand-600' : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'}`}
                                                            title={isEditingSoap ? 'Cancelar edición' : 'Editar notas SOAP'}
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                        {(hasSoap || session.resumen) && !isEditingSoap && (
                                                            <span className="text-slate-400 text-xs cursor-pointer" onClick={() => setExpandedSession(isExpanded ? null : session.id)}>
                                                                {isExpanded ? '▲' : '▼'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Inline SOAP Editor */}
                                                {isEditingSoap && (
                                                    <div className="border-t border-brand-100 bg-brand-50/40 p-4 space-y-3">
                                                        <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">Notas SOAP</p>
                                                        {[
                                                            { label: 'S — Subjetivo', key: 'notaSubjetiva', placeholder: 'Relato del paciente, molestias, estado de ánimo reportado...' },
                                                            { label: 'O — Objetivo', key: 'notaObjetiva', placeholder: 'Observaciones conductuales, lenguaje no verbal, afecto...' },
                                                            { label: 'A — Análisis / Valoración', key: 'notaAnalisis', placeholder: 'Interpretación clínica, hipótesis, progreso hacia objetivos...' },
                                                            { label: 'P — Plan', key: 'notaPlan', placeholder: 'Intervenciones, tareas, seguimiento, próxima sesión...' }
                                                        ].map(field => (
                                                            <div key={field.key}>
                                                                <label className="block text-xs font-semibold text-slate-600 mb-1">{field.label}</label>
                                                                <textarea
                                                                    rows={2}
                                                                    placeholder={field.placeholder}
                                                                    value={(soapForm as any)[field.key]}
                                                                    onChange={e => setSoapForm({ ...soapForm, [field.key]: e.target.value })}
                                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white resize-none"
                                                                />
                                                            </div>
                                                        ))}
                                                        <div className="flex gap-2 pt-1">
                                                            <button
                                                                onClick={() => setEditingSoapSession(null)}
                                                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => handleSaveSoap(session.id)}
                                                                disabled={savingSoap}
                                                                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                            >
                                                                <Save size={13} /> {savingSoap ? 'Guardando...' : 'Guardar SOAP'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* SOAP Notes view - expandable */}
                                                {isExpanded && !isEditingSoap && (
                                                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                                                        {hasSoap ? (
                                                            <>
                                                                {[
                                                                    { label: 'S — Subjetivo', value: session.notaSubjetiva, color: 'blue' },
                                                                    { label: 'O — Objetivo', value: session.notaObjetiva, color: 'emerald' },
                                                                    { label: 'A — Análisis', value: session.notaAnalisis, color: 'violet' },
                                                                    { label: 'P — Plan', value: session.notaPlan, color: 'orange' }
                                                                ].map(note => note.value && (
                                                                    <div key={note.label} className={`bg-${note.color}-50 border-l-4 border-${note.color}-400 p-3 rounded-r-lg`}>
                                                                        <p className={`text-xs font-bold text-${note.color}-700 uppercase mb-1`}>{note.label}</p>
                                                                        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{note.value}</p>
                                                                    </div>
                                                                ))}
                                                            </>
                                                        ) : session.resumen ? (
                                                            <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                                                                <p className="text-xs font-bold text-blue-700 uppercase mb-1">Notas de Sesión</p>
                                                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{session.resumen}</p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-slate-400 italic text-center py-2">Sin notas registradas</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}


                    {/* ── TAB 4: THERAPEUTIC GOALS ── */}
                    {activeTab === 'goals' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">Objetivos Terapéuticos</h3>
                                <button
                                    onClick={() => setShowNewGoalForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm"
                                >
                                    <Plus size={15} /> Nuevo Objetivo
                                </button>
                            </div>

                            {/* New goal form */}
                            {showNewGoalForm && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                                    <h4 className="font-semibold text-blue-800 mb-4">Agregar Objetivo Terapéutico</h4>
                                    <form onSubmit={handleCreateGoal} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Título *</label>
                                            <input
                                                required
                                                value={newGoal.titulo}
                                                onChange={e => setNewGoal({ ...newGoal, titulo: e.target.value })}
                                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="Ej: Reducir ansiedad en situaciones sociales"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Descripción</label>
                                            <textarea
                                                rows={2}
                                                value={newGoal.descripcion}
                                                onChange={e => setNewGoal({ ...newGoal, descripcion: e.target.value })}
                                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                placeholder="Estrategias y criterios de logro..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha Límite</label>
                                            <input
                                                type="date"
                                                value={newGoal.fechaLimite}
                                                onChange={e => setNewGoal({ ...newGoal, fechaLimite: e.target.value })}
                                                className="px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button type="button" onClick={() => setShowNewGoalForm(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                                            <button type="submit" disabled={savingGoal} className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                                                {savingGoal ? 'Guardando...' : 'Guardar Objetivo'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Goals list */}
                            {goals.length === 0 && !showNewGoalForm ? (
                                <div className="text-center py-12">
                                    <Target className="mx-auto text-slate-300 mb-4" size={64} />
                                    <p className="text-slate-500">No hay objetivos terapéuticos registrados</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {goals.map(goal => (
                                        <div key={goal.id} className={`border rounded-xl p-4 ${goal.estado === 'Logrado' ? 'bg-green-50 border-green-200' : goal.estado === 'Abandonado' ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-semibold text-slate-800">{goal.titulo}</h4>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${goal.estado === 'Logrado' ? 'bg-green-100 text-green-700' :
                                                            goal.estado === 'En Progreso' ? 'bg-blue-100 text-blue-700' :
                                                                goal.estado === 'Abandonado' ? 'bg-slate-100 text-slate-500' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {goal.estado}
                                                        </span>
                                                    </div>
                                                    {goal.descripcion && <p className="text-sm text-slate-600 leading-relaxed">{goal.descripcion}</p>}
                                                    {goal.fechaLimite && (
                                                        <p className="text-xs text-slate-400 mt-1.5">Límite: {new Date(goal.fechaLimite).toLocaleDateString('es-NI')}</p>
                                                    )}
                                                    {goal.fechaLogro && (
                                                        <p className="text-xs text-green-600 mt-1">✓ Logrado el {new Date(goal.fechaLogro).toLocaleDateString('es-NI')}</p>
                                                    )}
                                                </div>
                                                {goal.estado !== 'Logrado' && goal.estado !== 'Abandonado' && (
                                                    <div className="flex gap-1 shrink-0">
                                                        <button
                                                            onClick={() => handleUpdateGoalStatus(goal.id, 'En Progreso')}
                                                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                                                        >
                                                            En Progreso
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateGoalStatus(goal.id, 'Logrado')}
                                                            className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 transition-colors"
                                                        >
                                                            ✓ Logrado
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── PACKAGES TAB ── */}
                    {activeTab === 'packages' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">Paquetes de Sesiones</h3>
                                <button
                                    onClick={() => setShowNewPkgForm(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm"
                                >
                                    <Plus size={15} /> Nuevo Paquete
                                </button>
                            </div>

                            {showNewPkgForm && (
                                <form onSubmit={handleCreatePackage} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                    <h4 className="font-semibold text-slate-700">Crear Paquete</h4>
                                    <div className="grid grid-cols-1 gap-3">
                                        <input required placeholder="Título del paquete (ej: Paquete 10 sesiones)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newPkg.titulo} onChange={e => setNewPkg({ ...newPkg, titulo: e.target.value })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-500 mb-1 block">Sesiones totales</label>
                                                <input type="number" min="1" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newPkg.totalSesiones} onChange={e => setNewPkg({ ...newPkg, totalSesiones: Number(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 mb-1 block">Precio total (C$)</label>
                                                <input type="number" min="0" step="0.01" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={newPkg.precioTotal} onChange={e => setNewPkg({ ...newPkg, precioTotal: Number(e.target.value) })} />
                                            </div>
                                        </div>
                                        <textarea placeholder="Notas opcionales..." rows={2} className="border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none" value={newPkg.notas} onChange={e => setNewPkg({ ...newPkg, notas: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <button type="button" onClick={() => setShowNewPkgForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-100">Cancelar</button>
                                        <button type="submit" disabled={savingPkg} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">Crear Paquete</button>
                                    </div>
                                </form>
                            )}

                            {pkgs.length === 0 && !showNewPkgForm ? (
                                <div className="text-center py-12 text-slate-400">
                                    <Package size={40} className="mx-auto mb-3 opacity-40" />
                                    <p>Sin paquetes de sesiones.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pkgs.map(pkg => {
                                        const restantes = pkg.totalSesiones - pkg.sesionesUsadas;
                                        const pct = Math.round((pkg.sesionesUsadas / pkg.totalSesiones) * 100);
                                        const estadoColor = pkg.estado === 'Activo' ? 'bg-green-100 text-green-700' : pkg.estado === 'Agotado' ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700';
                                        return (
                                            <div key={pkg.id} className="bg-white border border-slate-200 rounded-xl p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800">{pkg.titulo}</h4>
                                                        <p className="text-xs text-slate-500">C$ {pkg.precioTotal.toFixed(2)} · {new Date(pkg.creadoEn).toLocaleDateString('es-NI')}</p>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoColor}`}>{pkg.estado}</span>
                                                </div>
                                                <div className="mb-2">
                                                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                                                        <span>{pkg.sesionesUsadas} usadas</span>
                                                        <span>{restantes} restantes / {pkg.totalSesiones} total</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                                        <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                                {pkg.notas && <p className="text-xs text-slate-500 mb-3">{pkg.notas}</p>}
                                                {pkg.estado === 'Activo' && (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleUsePkgSession(pkg.id)} className="flex-1 bg-brand-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-brand-700 transition">Usar sesión</button>
                                                        <button onClick={() => handleCancelPackage(pkg.id)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs hover:bg-red-50 transition">Cancelar</button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ESCALAS TAB ── */}
                    {activeTab === 'escalas' && (
                        <AssessmentPanel patientId={patientId} />
                    )}
                </div>

                {/* Discharge Confirm Modal */}
                {showDischargeConfirm && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 rounded-2xl">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                    <AlertTriangle className="text-amber-600" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Dar de Alta</h4>
                                    <p className="text-sm text-slate-500">{patient.nombre}</p>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 mb-4">
                                Esto marcará al paciente como dado de alta. Podrás seguir consultando su historial.
                            </p>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Motivo del Alta *</label>
                                <textarea
                                    value={motivoAlta}
                                    onChange={e => setMotivoAlta(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    placeholder="Ej: Cumplimiento de objetivos terapéuticos, mejoría significativa..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowDischargeConfirm(false)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                                <button
                                    onClick={handleDischarge}
                                    disabled={!motivoAlta.trim() || saving}
                                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50"
                                >
                                    {saving ? 'Procesando...' : 'Confirmar Alta'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
