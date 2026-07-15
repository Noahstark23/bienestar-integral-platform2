import React, { useState, useEffect } from 'react';
import { X, User, FileText, Clock, Save, Edit2, CheckCircle, Target, Plus, AlertTriangle, XCircle, Pencil, Package, BarChart2, ClipboardList, Download, FileSignature, Loader2, Paperclip, Upload, Trash2 } from 'lucide-react';
import { Patient, ClinicalRecord, Session, ClinicalDocument } from '../types';
import { AssessmentPanel } from './AssessmentPanel';

interface PatientDetailsProps {
    patientId: number;
    onClose: () => void;
}

type TabType = 'general' | 'clinical' | 'plan' | 'timeline' | 'goals' | 'documentos' | 'archivos' | 'packages' | 'escalas';

const FASES_PROCESO = ['EvaluacionInicial', 'Procesamiento', 'Perfil', 'Plan', 'Devolucion', 'Intervencion', 'Seguimiento', 'Alta'];
const FASE_LABEL: Record<string, string> = {
    EvaluacionInicial: 'Evaluación inicial',
    Procesamiento: 'Procesamiento de resultados',
    Perfil: 'Elaboración del perfil clínico',
    Plan: 'Diseño del plan de intervención',
    Devolucion: 'Devolución (3ª sesión)',
    Intervencion: 'Intervención terapéutica',
    Seguimiento: 'Sesiones de seguimiento',
    Alta: 'Alta / cierre',
};

const DOCUMENTOS: { tipo: string; titulo: string; desc: string }[] = [
    { tipo: 'historial-clinico', titulo: 'Historial Clínico (Anamnesis)', desc: 'Historia completa del paciente' },
    { tipo: 'entrevista', titulo: 'Entrevista Psicológica', desc: 'Formato de primera sesión' },
    { tipo: 'contrato-adultos', titulo: 'Contrato Terapéutico (Adultos)', desc: 'Consentimiento informado, mayores de edad' },
    { tipo: 'consentimiento-infantil', titulo: 'Asentimiento Informado (Infantil)', desc: 'Consentimiento del representante legal' },
    { tipo: 'perfil-clinico', titulo: 'Perfil Clínico', desc: 'Resultados, perfil e impresión diagnóstica' },
    { tipo: 'plan-intervencion', titulo: 'Plan de Intervención', desc: 'Objetivos jerárquicos y técnicas' },
];

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

    // Plan clínico (perfil, plan de intervención, análisis de pruebas, fase)
    const [editingPlan, setEditingPlan] = useState(false);
    const [planData, setPlanData] = useState({
        analisisPruebas: '',
        perfilClinico: '',
        planIntervencion: '',
        faseProceso: 'EvaluacionInicial'
    });

    // Documentos
    const [docLoading, setDocLoading] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<ClinicalDocument | null>(null);

    // General info editing (incluye los datos ampliados que alimentan los documentos)
    const [editingGeneral, setEditingGeneral] = useState(false);
    const [generalData, setGeneralData] = useState({
        nombre: '', edad: '', telefono: '', motivo: '',
        ocupacion: '', escolaridad: '', estadoCivil: '', fechaNacimiento: '',
        tutorNombre: '', tutorRelacion: '', tutorIdentificacion: '',
        sexo: '', direccion: '', barrio: '', lugarNacimiento: '',
        remision: '', situacionLaboral: '', numHijos: '', apodo: '',
        nombreMadre: '', telefonoMadre: '', nombrePadre: '', telefonoPadre: '',
        email: ''
    });

    // Adjuntos del expediente (contrato firmado, plan externo, informes...)
    const [patientFiles, setPatientFiles] = useState<any[]>([]);
    const [uploadCategoria, setUploadCategoria] = useState('Contrato firmado');
    const [uploading, setUploading] = useState(false);

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
        if (activeTab === 'archivos') loadFiles();
    }, [activeTab]);

    const loadPatientData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/patients/${patientId}`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Failed to fetch patient');
            const data = await response.json();
            setPatient(data);
            if (data.clinicalRecord) setClinicalData(data.clinicalRecord);
            setPlanData({
                analisisPruebas: data.clinicalRecord?.analisisPruebas || '',
                perfilClinico: data.clinicalRecord?.perfilClinico || '',
                planIntervencion: data.clinicalRecord?.planIntervencion || '',
                faseProceso: data.faseProceso || 'EvaluacionInicial'
            });
            setGeneralData({
                nombre: data.nombre || '',
                edad: String(data.edad || ''),
                telefono: data.telefono || '',
                motivo: data.motivo || '',
                ocupacion: data.ocupacion || '',
                escolaridad: data.escolaridad || '',
                estadoCivil: data.estadoCivil || '',
                fechaNacimiento: data.fechaNacimiento ? String(data.fechaNacimiento).slice(0, 10) : '',
                tutorNombre: data.tutorNombre || '',
                tutorRelacion: data.tutorRelacion || '',
                tutorIdentificacion: data.tutorIdentificacion || '',
                sexo: data.sexo || '',
                direccion: data.direccion || '',
                barrio: data.barrio || '',
                lugarNacimiento: data.lugarNacimiento || '',
                remision: data.remision || '',
                situacionLaboral: data.situacionLaboral || '',
                numHijos: data.numHijos || '',
                apodo: data.apodo || '',
                nombreMadre: data.nombreMadre || '',
                telefonoMadre: data.telefonoMadre || '',
                nombrePadre: data.nombrePadre || '',
                telefonoPadre: data.telefonoPadre || '',
                email: data.email || ''
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

    const handleSavePlan = async () => {
        try {
            setSaving(true);
            // 1) Guardar campos clínicos (perfil, plan, análisis)
            const method = patient?.clinicalRecord ? 'PUT' : 'POST';
            const resCr = await fetch(`/api/patients/${patientId}/clinical-record`, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    analisisPruebas: planData.analisisPruebas,
                    perfilClinico: planData.perfilClinico,
                    planIntervencion: planData.planIntervencion
                })
            });
            if (!resCr.ok) throw new Error('clinical');
            // 2) Guardar fase del proceso en el paciente
            const resP = await fetch(`/api/patients/${patientId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ faseProceso: planData.faseProceso })
            });
            if (!resP.ok) throw new Error('fase');
            await loadPatientData();
            setEditingPlan(false);
        } catch (err) {
            setError('Error guardando el plan clínico.');
        } finally {
            setSaving(false);
        }
    };

    const fetchDocument = async (tipo: string): Promise<ClinicalDocument | null> => {
        const res = await fetch(`/api/documents/patient/${patientId}/${tipo}`, { headers: getAuthHeaders() });
        if (!res.ok) { setError('No se pudo generar el documento.'); return null; }
        return res.json();
    };

    const handleDownloadPdf = async (tipo: string) => {
        try {
            setDocLoading(tipo);
            const doc = await fetchDocument(tipo);
            if (!doc) return;
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF();
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const marginX = 15;
            const maxW = pageW - marginX * 2;
            let y = 16;
            const ensureSpace = (h: number) => { if (y + h > pageH - 15) { pdf.addPage(); y = 16; } };

            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
            pdf.text(doc.titulo, pageW / 2, y, { align: 'center' }); y += 6;
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
            pdf.text(doc.profesional?.consultorio || '', pageW / 2, y, { align: 'center' }); y += 5;
            pdf.text(`${doc.paciente?.nombre || ''}  ·  ${new Date(doc.fecha).toLocaleDateString('es-NI')}`, pageW / 2, y, { align: 'center' }); y += 8;

            for (const sec of doc.secciones) {
                if (sec.heading) {
                    ensureSpace(8);
                    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11);
                    const hl = pdf.splitTextToSize(sec.heading, maxW);
                    pdf.text(hl, marginX, y); y += hl.length * 5 + 1;
                }
                pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
                for (const line of sec.lines) {
                    const wrapped = pdf.splitTextToSize(line || ' ', maxW);
                    ensureSpace(wrapped.length * 5);
                    pdf.text(wrapped, marginX, y); y += wrapped.length * 5;
                }
                y += 3;
            }
            const safeName = (doc.paciente?.nombre || 'paciente').replace(/\s+/g, '_');
            pdf.save(`${tipo}-${safeName}.pdf`);
        } catch (err) {
            setError('Error generando el PDF.');
        } finally {
            setDocLoading(null);
        }
    };

    const handlePreviewDoc = async (tipo: string) => {
        setDocLoading(tipo);
        const doc = await fetchDocument(tipo);
        if (doc) setPreviewDoc(doc);
        setDocLoading(null);
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
            const payload: any = {
                ...generalData,
                edad: parseInt(generalData.edad) || patient?.edad
            };
            // Una fecha vacía no debe enviarse (el backend espera DateTime o nada)
            if (!payload.fechaNacimiento) delete payload.fechaNacimiento;
            const res = await fetch(`/api/patients/${patientId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
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

    // ── Adjuntos del expediente ──────────────────────────────────
    const loadFiles = async () => {
        try {
            const res = await fetch(`/api/patients/${patientId}/files`, { headers: getAuthHeaders() });
            const data = await res.json();
            setPatientFiles(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error loading files:', err);
        }
    };

    const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permite volver a elegir el mismo archivo
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
            setError('El archivo supera el límite de 8 MB.');
            return;
        }
        setUploading(true);
        try {
            // Archivo → base64 (sin el prefijo data:...;base64,)
            const dataBase64: string = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
            const res = await fetch(`/api/patients/${patientId}/files`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    nombre: file.name,
                    categoria: uploadCategoria,
                    mimeType: file.type || 'application/octet-stream',
                    dataBase64
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Error al subir el archivo');
            }
            await loadFiles();
        } catch (err: any) {
            setError(err?.message || 'Error al subir el archivo.');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadFile = async (fileId: number, nombre: string) => {
        try {
            const res = await fetch(`/api/patients/${patientId}/files/${fileId}/download`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('download');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombre;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('No se pudo descargar el archivo.');
        }
    };

    const handleDeleteFile = async (fileId: number) => {
        if (!confirm('¿Eliminar este archivo del expediente?')) return;
        try {
            const res = await fetch(`/api/patients/${patientId}/files/${fileId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (res.ok) loadFiles();
        } catch {
            setError('No se pudo eliminar el archivo.');
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
        { id: 'plan', label: 'Plan', icon: <ClipboardList size={16} /> },
        { id: 'timeline', label: 'Historial', icon: <Clock size={16} /> },
        { id: 'goals', label: 'Objetivos', icon: <Target size={16} /> },
        { id: 'documentos', label: 'Documentos', icon: <FileSignature size={16} /> },
        { id: 'archivos', label: 'Archivos', icon: <Paperclip size={16} /> },
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
                            <p className="text-brand-100 text-sm mt-1">
                                Expediente Clínico #{patient.id}
                                {patient.faseProceso && (
                                    <span className="ml-2 bg-white/15 text-white text-xs px-2 py-0.5 rounded-full">
                                        Fase: {FASE_LABEL[patient.faseProceso] || patient.faseProceso}
                                    </span>
                                )}
                            </p>
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
                                        { label: 'Fecha de Nacimiento', key: 'fechaNacimiento', type: 'date' },
                                        { label: 'Sexo / Género', key: 'sexo', type: 'text' },
                                        { label: 'Teléfono', key: 'telefono', type: 'tel' },
                                        { label: 'Correo electrónico', key: 'email', type: 'email' },
                                        { label: 'Ocupación', key: 'ocupacion', type: 'text' },
                                        { label: 'Escolaridad', key: 'escolaridad', type: 'text' },
                                        { label: 'Estado Civil', key: 'estadoCivil', type: 'text' },
                                        { label: 'Situación laboral', key: 'situacionLaboral', type: 'text' },
                                        { label: 'Dirección', key: 'direccion', type: 'text' },
                                        { label: 'Barrio', key: 'barrio', type: 'text' },
                                        { label: 'Lugar de nacimiento', key: 'lugarNacimiento', type: 'text' },
                                        { label: 'Remisión / Referente', key: 'remision', type: 'text' },
                                        { label: 'N° de hijas/os', key: 'numHijos', type: 'text' },
                                        { label: 'Cómo le llaman en casa', key: 'apodo', type: 'text' },
                                        { label: 'Nombre de la madre', key: 'nombreMadre', type: 'text' },
                                        { label: 'Teléfono de la madre', key: 'telefonoMadre', type: 'tel' },
                                        { label: 'Nombre del padre', key: 'nombrePadre', type: 'text' },
                                        { label: 'Teléfono del padre', key: 'telefonoPadre', type: 'tel' },
                                        { label: 'Nombre del Tutor/Guardián', key: 'tutorNombre', type: 'text' },
                                        { label: 'Parentesco del Tutor', key: 'tutorRelacion', type: 'text' },
                                        { label: 'Identificación del Tutor', key: 'tutorIdentificacion', type: 'text' }
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
                                            { label: 'Sexo', value: patient.sexo || '—' },
                                            { label: 'Teléfono', value: patient.telefono },
                                            { label: 'Correo', value: patient.email || '—' },
                                            { label: 'Ocupación', value: patient.ocupacion || '—' },
                                            { label: 'Escolaridad', value: patient.escolaridad || '—' },
                                            { label: 'Estado Civil', value: patient.estadoCivil || '—' },
                                            { label: 'Situación laboral', value: patient.situacionLaboral || '—' },
                                            { label: 'Fecha Nacimiento', value: patient.fechaNacimiento ? new Date(patient.fechaNacimiento).toLocaleDateString('es-NI') : '—' },
                                            { label: 'Lugar de nacimiento', value: patient.lugarNacimiento || '—' },
                                            { label: 'Dirección', value: patient.direccion || '—' },
                                            { label: 'Barrio', value: patient.barrio || '—' },
                                            { label: 'Remisión', value: patient.remision || '—' },
                                            { label: 'N° de hijas/os', value: patient.numHijos || '—' },
                                            { label: 'Cómo le llaman', value: patient.apodo || '—' },
                                            { label: 'Madre', value: patient.nombreMadre ? `${patient.nombreMadre}${patient.telefonoMadre ? ' · ' + patient.telefonoMadre : ''}` : '—' },
                                            { label: 'Padre', value: patient.nombrePadre ? `${patient.nombrePadre}${patient.telefonoPadre ? ' · ' + patient.telefonoPadre : ''}` : '—' },
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

                    {/* ── TAB: PLAN CLÍNICO ── */}
                    {activeTab === 'plan' && (
                        <div className="space-y-5">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">Perfil clínico y plan de intervención</h3>
                                {!editingPlan ? (
                                    <button onClick={() => setEditingPlan(true)} className="flex items-center gap-2 px-4 py-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors text-sm font-medium">
                                        <Edit2 size={15} /> Editar
                                    </button>
                                ) : (
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingPlan(false); setPlanData({ analisisPruebas: patient.clinicalRecord?.analisisPruebas || '', perfilClinico: patient.clinicalRecord?.perfilClinico || '', planIntervencion: patient.clinicalRecord?.planIntervencion || '', faseProceso: patient.faseProceso || 'EvaluacionInicial' }); }} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                                        <button onClick={handleSavePlan} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                                            <Save size={15} /> {saving ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Fase del proceso */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Fase del proceso clínico</label>
                                {editingPlan ? (
                                    <select
                                        value={planData.faseProceso}
                                        onChange={e => setPlanData({ ...planData, faseProceso: e.target.value })}
                                        className="w-full md:w-1/2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        {FASES_PROCESO.map(f => <option key={f} value={f}>{FASE_LABEL[f]}</option>)}
                                    </select>
                                ) : (
                                    <p className="text-slate-700 bg-brand-50 border border-brand-100 px-4 py-2 rounded-lg text-sm inline-block">
                                        {FASE_LABEL[planData.faseProceso] || planData.faseProceso}
                                    </p>
                                )}
                            </div>

                            {[
                                { label: 'Análisis de resultados de pruebas', key: 'analisisPruebas', placeholder: 'Calificación, corrección e interpretación integrada de las pruebas aplicadas...' },
                                { label: 'Perfil clínico (triangulación)', key: 'perfilClinico', placeholder: 'Descripción integrada del caso: fortalezas, dificultades, áreas afectadas, impresión diagnóstica...' },
                                { label: 'Plan de intervención', key: 'planIntervencion', placeholder: 'Priorización de problemáticas, enfoques, técnicas y organización jerárquica de objetivos...' }
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">{field.label}</label>
                                    {editingPlan ? (
                                        <textarea
                                            value={(planData as any)[field.key]}
                                            onChange={e => setPlanData({ ...planData, [field.key]: e.target.value })}
                                            className="w-full h-32 px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                                            placeholder={field.placeholder}
                                        />
                                    ) : (
                                        <p className="text-slate-600 bg-slate-50 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
                                            {(planData as any)[field.key] || <span className="text-slate-400 italic">Sin información</span>}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <p className="text-xs text-slate-400">
                                Los objetivos terapéuticos jerárquicos se gestionan en la pestaña <strong>Objetivos</strong>. El plan de intervención guía el <strong>Registro de sesiones</strong>; tras el alta, las sesiones de mantenimiento se marcan como <strong>Seguimiento</strong>.
                            </p>
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

                    {/* ── DOCUMENTOS TAB ── */}
                    {activeTab === 'documentos' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Documentos clínicos</h3>
                                <p className="text-sm text-slate-500 mt-1">Plantillas del consultorio rellenadas con los datos de {patient.nombre}. Descárgalas en PDF o previsualízalas.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {DOCUMENTOS.map(d => (
                                    <div key={d.tipo} className="border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                                                <FileSignature size={18} className="text-brand-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800 text-sm">{d.titulo}</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">{d.desc}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => handlePreviewDoc(d.tipo)}
                                                disabled={docLoading === d.tipo}
                                                className="flex-1 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                            >
                                                {docLoading === d.tipo ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} Vista previa
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPdf(d.tipo)}
                                                disabled={docLoading === d.tipo}
                                                className="flex-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                            >
                                                <Download size={13} /> PDF
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── ARCHIVOS TAB (adjuntos: contrato firmado, plan externo...) ── */}
                    {activeTab === 'archivos' && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Archivos del expediente</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Sube documentos escaneados o externos: el <strong>contrato firmado y sellado</strong>, un <strong>plan de intervención elaborado fuera del sistema</strong>, informes, remisiones, etc. (máx. 8 MB por archivo).
                                </p>
                            </div>

                            {/* Subir */}
                            <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Categoría</label>
                                    <select
                                        value={uploadCategoria}
                                        onChange={e => setUploadCategoria(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option>Contrato firmado</option>
                                        <option>Consentimiento firmado</option>
                                        <option>Plan de intervención</option>
                                        <option>Informe</option>
                                        <option>Resultados de pruebas</option>
                                        <option>Otro</option>
                                    </select>
                                </div>
                                <label className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors mt-2 md:mt-5 ${uploading ? 'bg-slate-200 text-slate-500 cursor-wait' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                    {uploading ? 'Subiendo...' : 'Subir archivo'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                                        onChange={handleUploadFile}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>

                            {/* Lista */}
                            {patientFiles.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Paperclip size={40} className="mx-auto mb-3 opacity-40" />
                                    <p>Sin archivos adjuntos.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {patientFiles.map(f => (
                                        <div key={f.id} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                                                    <Paperclip size={16} className="text-brand-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 truncate">{f.nombre}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {f.categoria} · {(f.size / 1024).toFixed(0)} KB · {new Date(f.creadoEn).toLocaleDateString('es-NI')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => handleDownloadFile(f.id, f.nombre)}
                                                    className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                    title="Descargar"
                                                >
                                                    <Download size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFile(f.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
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

                {/* Document Preview Modal */}
                {previewDoc && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 rounded-2xl p-4" onClick={() => setPreviewDoc(null)}>
                        <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
                                <div>
                                    <h4 className="font-bold text-slate-800">{previewDoc.titulo}</h4>
                                    <p className="text-xs text-slate-500">{previewDoc.paciente?.nombre} · {new Date(previewDoc.fecha).toLocaleDateString('es-NI')}</p>
                                </div>
                                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={20} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                                {previewDoc.secciones.map((sec, i) => (
                                    <div key={i}>
                                        {sec.heading && <p className="font-semibold text-slate-800 text-sm mb-1">{sec.heading}</p>}
                                        {sec.lines.map((line, j) => (
                                            <p key={j} className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{line || ' '}</p>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                                <button onClick={() => setPreviewDoc(null)} className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cerrar</button>
                                <button onClick={() => handleDownloadPdf(previewDoc.tipo)} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 flex items-center gap-1.5">
                                    <Download size={14} /> Descargar PDF
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
