import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  DollarSign, Users, Calendar, TrendingUp, TrendingDown,
  FileText, Plus, Search, Clock, CheckCircle, XCircle, Receipt, GraduationCap, Video, Download
} from 'lucide-react';
import { AdminTab, Patient, Session, Expense, Appointment } from '../types';
import { PatientDetails } from './PatientDetails';
import { AddPatientModal } from './AddPatientModal';
import { AvailabilityManager } from './AvailabilityManager';
import { CalendarView } from './CalendarView';
import { InvoiceManagement } from './InvoiceManagement';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetails } from './InvoiceDetails';
import { RegisterPaymentModal } from './RegisterPaymentModal';
import { WorkshopManager } from './WorkshopManager';
import { VirtualSessionManager } from './VirtualSessionManager';
import { TelmedAvailabilityManager } from './TelmedAvailabilityManager';

// ── AuditLogPanel ──────────────────────────────────────────────────────────
const AuditLogPanel: React.FC<{ getAuthHeaders: () => Record<string, string> }> = ({ getAuthHeaders }) => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetch('/api/audit', { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800">Log de Auditoría</h3>
        <span className="text-xs text-slate-500">(últimas 100 acciones)</span>
      </div>
      {loading ? (
        <p className="text-center py-8 text-slate-400 text-sm">Cargando...</p>
      ) : logs.length === 0 ? (
        <p className="text-center py-8 text-slate-400 text-sm">Sin entradas de auditoría todavía.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Usuario</th>
                <th className="px-4 py-2 text-left">Acción</th>
                <th className="px-4 py-2 text-left">Entidad</th>
                <th className="px-4 py-2 text-left">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{new Date(log.creadoEn).toLocaleString('es-NI')}</td>
                  <td className="px-4 py-2 font-medium text-slate-700">{log.usuario}</td>
                  <td className="px-4 py-2"><span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded font-mono">{log.accion}</span></td>
                  <td className="px-4 py-2 text-slate-600">{log.entidad} {log.entidadId ? `#${log.entidadId}` : ''}</td>
                  <td className="px-4 py-2 text-slate-500 max-w-xs truncate">{log.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── TwoFactorPanel ─────────────────────────────────────────────────────────
const TwoFactorPanel: React.FC<{ getAuthHeaders: () => Record<string, string> }> = ({ getAuthHeaders }) => {
  const [status, setStatus] = React.useState<null | boolean>(null); // null=loading, true=enabled, false=disabled
  const [qrCode, setQrCode] = React.useState('');
  const [setupStep, setSetupStep] = React.useState<'idle' | 'scanning' | 'confirming' | 'disabling'>('idle');
  const [code, setCode] = React.useState('');
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Detect 2FA status from profile endpoint (fallback: assume disabled)
  React.useEffect(() => {
    fetch('/api/auth/2fa/setup', { method: 'GET', headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        // If we got qrCode back it means setup was initiated; user is NOT yet enabled
        // We rely on user object from localStorage instead
        const userStr = localStorage.getItem('auth_user');
        if (userStr) {
          try { const u = JSON.parse(userStr); setStatus(!!u.twoFactorEnabled); } catch { setStatus(false); }
        } else { setStatus(false); }
      })
      .catch(() => setStatus(false));
    // eslint-disable-next-line
  }, []);

  const handleStartSetup = async () => {
    setErr(''); setMsg('');
    const r = await fetch('/api/auth/2fa/setup', { method: 'GET', headers: getAuthHeaders() });
    const d = await r.json();
    if (r.ok) { setQrCode(d.qrCode); setSetupStep('scanning'); }
    else setErr(d.error || 'Error al generar QR');
  };

  const handleEnable = async () => {
    if (code.length !== 6) return;
    setSaving(true); setErr('');
    const r = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { setStatus(true); setSetupStep('idle'); setQrCode(''); setCode(''); setMsg('2FA activado correctamente.'); }
    else setErr(d.error || 'Código incorrecto');
  };

  const handleDisable = async () => {
    if (code.length !== 6) return;
    setSaving(true); setErr('');
    const r = await fetch('/api/auth/2fa/disable', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const d = await r.json();
    setSaving(false);
    if (r.ok) { setStatus(false); setSetupStep('idle'); setCode(''); setMsg('2FA desactivado.'); }
    else setErr(d.error || 'Código incorrecto');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Seguridad — Autenticación de Dos Factores (2FA)</h3>
        {status !== null && (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${status ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {status ? '✓ Activado' : 'Desactivado'}
          </span>
        )}
      </div>
      <div className="p-6 space-y-4">
        {msg && <p className="text-sm text-green-600 font-medium">{msg}</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}

        {status === false && setupStep === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Protege tu cuenta con una app autenticadora (Google Authenticator, Authy). Al activar 2FA, cada inicio de sesión requerirá un código de 6 dígitos.</p>
            <button onClick={handleStartSetup} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
              Activar 2FA
            </button>
          </div>
        )}

        {setupStep === 'scanning' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">1. Escanea este código QR con tu app autenticadora.</p>
            {qrCode && <img src={qrCode} alt="QR 2FA" className="w-48 h-48 border border-slate-200 rounded-lg" />}
            <p className="text-sm text-slate-600">2. Ingresa el código de 6 dígitos que muestra la app para confirmar:</p>
            <div className="flex gap-3 items-center">
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="border border-slate-300 rounded-lg px-4 py-2 text-center text-xl font-mono tracking-widest w-40"
                placeholder="000000"
              />
              <button onClick={handleEnable} disabled={saving || code.length !== 6}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {saving ? 'Activando...' : 'Confirmar y Activar'}
              </button>
              <button onClick={() => { setSetupStep('idle'); setCode(''); setQrCode(''); }}
                className="text-slate-500 text-sm hover:text-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {status === true && setupStep === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Tu cuenta está protegida con autenticación de dos factores.</p>
            <button onClick={() => setSetupStep('disabling')} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              Desactivar 2FA
            </button>
          </div>
        )}

        {setupStep === 'disabling' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Ingresa el código de tu app autenticadora para desactivar 2FA:</p>
            <div className="flex gap-3 items-center">
              <input
                type="text" inputMode="numeric" maxLength={6}
                value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="border border-slate-300 rounded-lg px-4 py-2 text-center text-xl font-mono tracking-widest w-40"
                placeholder="000000"
              />
              <button onClick={handleDisable} disabled={saving || code.length !== 6}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {saving ? 'Desactivando...' : 'Desactivar'}
              </button>
              <button onClick={() => { setSetupStep('idle'); setCode(''); }}
                className="text-slate-500 text-sm hover:text-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para datos de la API
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros y paginación de pacientes
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [patientPage, setPatientPage] = useState(1);
  const [patientsTotalPages, setPatientsTotalPages] = useState(1);
  const [patientsTotal, setPatientsTotal] = useState(0);

  // Estados para KPIs y gráficos
  const [kpis, setKpis] = useState({ monthlyRevenue: 0, pendingAppointments: 0, activePatients: 0 });
  const [revenueByService, setRevenueByService] = useState<any[]>([]);
  const [newPatientsTrend, setNewPatientsTrend] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);

  // Estado para PatientDetails modal
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);

  // Búsqueda global
  const [globalSearch, setGlobalSearch] = useState('');
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  const globalResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: { type: string; label: string; sub: string; tab: AdminTab; id?: number }[] = [];
    (patients as Patient[]).forEach(p => {
      if (p.nombre.toLowerCase().includes(q) || p.telefono?.includes(q)) {
        results.push({ type: 'Paciente', label: p.nombre, sub: p.telefono, tab: 'patients', id: p.id });
      }
    });
    (sessions as Session[]).forEach(s => {
      if ((s.patientName || '').toLowerCase().includes(q)) {
        results.push({ type: 'Sesión', label: s.patientName || '', sub: new Date(s.fecha).toLocaleDateString('es-NI'), tab: 'patients', id: s.patientId });
      }
    });
    (appointments as Appointment[]).forEach(a => {
      if (a.nombrePaciente.toLowerCase().includes(q)) {
        results.push({ type: 'Cita', label: a.nombrePaciente, sub: new Date(a.fechaHora).toLocaleDateString('es-NI'), tab: 'solicitudes' });
      }
    });
    return results.slice(0, 8);
  }, [globalSearch, patients, sessions, appointments]);

  // Billing state
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showRegisterPayment, setShowRegisterPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [refreshInvoices, setRefreshInvoices] = useState(0);

  // Helper to get auth headers
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
  });

  // Fetch de pacientes con filtro de estado y paginación
  const fetchPatients = async (page = 1, estado = estadoFiltro) => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (estado !== 'Todos') params.set('estado', estado);
    const res = await fetch(`/api/patients?${params}`, { headers: getAuthHeaders() });
    const result = await res.json();
    setPatients(result.data);
    setPatientsTotal(result.total);
    setPatientsTotalPages(result.totalPages);
    setPatientPage(page);
  };

  const refreshPatients = () => fetchPatients(patientPage, estadoFiltro);

  const exportPatientsCSV = () => {
    const headers = ['Nombre', 'Edad', 'Teléfono', 'Estado', 'Motivo Consulta', 'Fecha Registro'];
    const rows = patients.map((p: Patient) => [
      p.nombre, p.edad ?? '', p.telefono,
      (p as any).estado ?? '',
      p.motivo,
      p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-NI') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `pacientes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Función para refrescar la lista de citas
  const fetchAppointments = async () => {
    const res = await fetch('/api/appointments', { headers: getAuthHeaders() });
    const data = await res.json();
    setAppointments(data);
  };

  // Appointment action handlers
  const handleConfirmAppointment = async (appointment: Appointment) => {
    try {
      const res = await fetch(`/api/appointments/${appointment.id}/confirm`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      window.open(data.whatsappLink, '_blank');
      fetchAppointments();
    } catch (error) {
      console.error('Error confirmando cita:', error);
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm('¿Rechazar esta cita?')) return;
    try {
      await fetch(`/api/appointments/${appointmentId}/cancel`, { method: 'PUT', headers: getAuthHeaders() });
      fetchAppointments();
    } catch (error) {
      console.error('Error cancelando cita:', error);
    }
  };

  // Cargar datos al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [patientsRes, sessionsRes, expensesRes, appointmentsRes, kpisRes, revenueRes, trendRes, statsRes] = await Promise.all([
          fetch('/api/patients', { headers: getAuthHeaders() }),
          fetch('/api/sessions', { headers: getAuthHeaders() }),
          fetch('/api/expenses', { headers: getAuthHeaders() }),
          fetch('/api/appointments', { headers: getAuthHeaders() }),
          fetch('/api/finance/kpis', { headers: getAuthHeaders() }),
          fetch('/api/finance/revenue-by-service', { headers: getAuthHeaders() }),
          fetch('/api/finance/new-patients-trend', { headers: getAuthHeaders() }),
          fetch('/api/finance/stats', { headers: getAuthHeaders() }),
        ]);

        const patientsResult = await patientsRes.json();
        const sessionsData = await sessionsRes.json();
        const expensesData = await expensesRes.json();
        const appointmentsData = await appointmentsRes.json();
        const kpisData = await kpisRes.json();
        const revenueData = await revenueRes.json();
        const trendData = await trendRes.json();
        const statsData = await statsRes.json();

        setPatients(patientsResult.data);
        setPatientsTotal(patientsResult.total);
        setPatientsTotalPages(patientsResult.totalPages);
        setSessions(sessionsData);
        setExpenses(expensesData);
        setAppointments(appointmentsData);
        setKpis(kpisData);
        setRevenueByService(revenueData);
        setNewPatientsTrend(trendData);
        setMonthlyStats(Array.isArray(statsData) ? statsData : []);
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Reporte Mensual PDF ---
  const handleMonthlyReportPDF = async () => {
    const month = new Date().toISOString().slice(0, 7);
    try {
      const res = await fetch(`/api/finance/monthly-report?month=${month}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) return;

      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      const mesLabel = new Date(month + '-01').toLocaleDateString('es-NI', { month: 'long', year: 'numeric' });

      // Header
      doc.setFontSize(18); doc.setTextColor(79, 70, 229);
      doc.text('Bienestar Integral', 14, 18);
      doc.setFontSize(10); doc.setTextColor(100, 116, 139);
      doc.text('Consultorio Psicológico – Reporte Mensual', 14, 25);
      doc.setFontSize(13); doc.setTextColor(30, 41, 59);
      doc.text(`Mes: ${mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}`, 14, 34);

      doc.setDrawColor(226, 232, 240); doc.line(14, 38, 196, 38);

      // Summary table
      autoTable(doc, {
        startY: 42,
        head: [['Indicador', 'Valor']],
        body: [
          ['Ingresos Totales', `C$ ${data.totalIngresos.toFixed(2)}`],
          ['Gastos Totales', `C$ ${data.totalGastos.toFixed(2)}`],
          ['Balance Neto', `C$ ${data.balance.toFixed(2)}`],
          ['Total de Sesiones', String(data.totalSesiones)],
          ['Pacientes Atendidos', String(data.pacientesAtendidos)],
          ['Pacientes Nuevos', String(data.nuevoPacientes)],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: { 1: { halign: 'right' } },
      });

      // Tipos de sesión
      if (data.distribucionTipos?.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12); doc.setTextColor(30, 41, 59);
        doc.text('Distribución por Tipo de Sesión', 14, finalY);
        autoTable(doc, {
          startY: finalY + 4,
          head: [['Tipo', 'Sesiones']],
          body: data.distribucionTipos.map((t: any) => [t.tipo, String(t.count)]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [16, 185, 129] },
        });
      }

      // Footer
      const pageH = doc.internal.pageSize.height;
      doc.setFontSize(8); doc.setTextColor(148, 163, 184);
      doc.text(`Generado el ${new Date().toLocaleDateString('es-NI')} · Bienestar Integral`, 14, pageH - 10);

      doc.save(`reporte-${month}.pdf`);
    } catch (err) {
      console.error('Error generando reporte PDF:', err);
    }
  };

  // --- Financial Calculations ---
  const financialData = useMemo(() => {
    const income = sessions.reduce((acc, session) => acc + session.pago, 0);
    const expensesTotal = expenses.reduce((acc, expense) => acc + expense.monto, 0);
    return {
      income,
      expenses: expensesTotal,
      profit: income - expensesTotal
    };
  }, [sessions, expenses]);

  const chartData = [
    { name: 'Ingresos', amount: financialData.income },
    { name: 'Egresos', amount: financialData.expenses },
  ];

  const COLORS = ['#0284c7', '#ef4444'];

  // --- Patient Logic ---
  // La búsqueda por nombre filtra client-side dentro de la página actual
  const filteredPatients = patients.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="bg-brand-900 text-white w-full md:w-64 flex-shrink-0 p-6">
        <h2 className="text-xl font-bold mb-8 tracking-wider">NORTEX <span className="text-xs font-normal opacity-70">Clinic OS</span></h2>
        <nav className="space-y-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <DollarSign size={20} /> Dashboard Financiero
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'patients' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <Users size={20} /> Expedientes
          </button>
          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'solicitudes' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <Clock size={20} /> Solicitudes
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'calendar' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <Calendar size={20} /> Agenda
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'billing' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <Receipt size={20} /> Facturación
          </button>
          <button
            onClick={() => setActiveTab('workshops')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'workshops' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <GraduationCap size={20} /> Talleres
          </button>
          <button
            onClick={() => setActiveTab('teleconsultas')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'teleconsultas' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <Video size={20} /> Teleconsultas
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors ${activeTab === 'config' ? 'bg-brand-700' : 'hover:bg-brand-800'}`}
          >
            <Clock size={20} /> Configuración
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">
            {activeTab === 'dashboard' && 'Resumen Financiero'}
            {activeTab === 'patients' && 'Gestión de Pacientes'}
            {activeTab === 'calendar' && 'Calendario de Citas'}
            {activeTab === 'billing' && 'Sistema de Facturación'}
            {activeTab === 'workshops' && 'Gestión de Talleres'}
            {activeTab === 'teleconsultas' && 'Teleconsultas'}
          </h1>
          <div className="flex items-center gap-4">
            {/* Búsqueda Global */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar en todo..."
                value={globalSearch}
                onChange={e => { setGlobalSearch(e.target.value); setShowGlobalResults(true); }}
                onFocus={() => setShowGlobalResults(true)}
                onBlur={() => setTimeout(() => setShowGlobalResults(false), 150)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-56"
              />
              {showGlobalResults && globalResults.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {globalResults.map((r, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-start gap-3 border-b border-slate-100 last:border-0"
                      onMouseDown={() => {
                        setActiveTab(r.tab);
                        if (r.tab === 'patients' && r.id) setSelectedPatientId(r.id);
                        setGlobalSearch('');
                        setShowGlobalResults(false);
                      }}
                    >
                      <span className="text-xs px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded font-medium shrink-0 mt-0.5">{r.type}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
                        <p className="text-xs text-slate-500">{r.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {activeTab === 'dashboard' && (
              <button
                onClick={handleMonthlyReportPDF}
                title="Descargar reporte mensual PDF"
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 hover:text-brand-600 transition-colors shadow-sm"
              >
                <Download size={16} /> Reporte PDF
              </button>
            )}
            {loading && <span className="text-sm text-slate-500">Cargando...</span>}
            <span className="text-sm font-medium text-slate-500">Lic. Esmirna García</span>
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">EG</div>
          </div>
        </header>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Ingresos del Mes</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      ${kpis.monthlyRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <DollarSign className="text-green-600" size={24} />
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Citas Pendientes</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{kpis.pendingAppointments}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Clock className="text-yellow-600" size={24} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Próximos 7 días</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Pacientes Activos</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{kpis.activePatients}</p>
                  </div>
                  <div className="bg-brand-100 p-3 rounded-lg">
                    <Users className="text-brand-600" size={24} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Últimos 30 días</p>
              </div>
            </div>

            {/* BUSINESS INTELLIGENCE CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Revenue by Service Type */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">💰 Ingresos por Tipo de Servicio</h3>
                {revenueByService.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={revenueByService}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: $${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {revenueByService.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#4F46E5', '#06B6D4', '#10B981'][index % 3]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-sm">No hay datos de sesiones</p>
                  </div>
                )}
              </div>

              {/* New Patients Trend */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4">📈 Pacientes Nuevos por Mes</h3>
                {newPatientsTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={newPatientsTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="nuevos" fill="#4F46E5" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-sm">No hay datos de pacientes</p>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Trend Charts */}
            {monthlyStats.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Ingresos Mensuales (6 meses)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => `C$ ${Number(v).toFixed(2)}`} />
                      <Bar dataKey="ingresos" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Ingresos C$" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Sesiones por Mes (6 meses)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="sesiones" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Sesiones" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-6">Balance General</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#0284c7" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Transactions List (Mini) */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-700 mb-6">Últimos Movimientos</h3>
                <div className="space-y-4">
                  {sessions.slice(0, 3).map(session => (
                    <div key={`inc-${session.id}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <Plus size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Sesión: {session.patientName || 'Paciente'}</p>
                          <p className="text-xs text-slate-500">{new Date(session.fecha).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="font-bold text-green-600">+${session.pago}</span>
                    </div>
                  ))}
                  {expenses.slice(0, 2).map(exp => (
                    <div key={`exp-${exp.id}`} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                          <TrendingDown size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{exp.concepto}</p>
                          <p className="text-xs text-slate-500">{new Date(exp.fecha).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <span className="font-bold text-red-600">-${exp.monto}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patients View */}
        {activeTab === 'patients' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50">
              <div className="flex gap-3 items-center flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar paciente..."
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  value={estadoFiltro}
                  onChange={(e) => {
                    setEstadoFiltro(e.target.value);
                    fetchPatients(1, e.target.value);
                  }}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="Todos">Todos los estados</option>
                  <option value="Activo">Activo</option>
                  <option value="En Pausa">En Pausa</option>
                  <option value="Alta">Alta</option>
                </select>
                <span className="text-xs text-slate-500">{patientsTotal} paciente{patientsTotal !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportPatientsCSV}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-all flex items-center gap-2"
                  title="Exportar pacientes visibles a CSV"
                >
                  <Download size={18} />
                  CSV
                </button>
                <button
                  onClick={() => setShowAddPatientModal(true)}
                  className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Plus size={20} />
                  Nuevo Paciente
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Edad</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Motivo Consulta</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map(patient => (
                    <tr key={patient.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{patient.nombre}</td>
                      <td className="px-6 py-4">{patient.edad} años</td>
                      <td className="px-6 py-4">{patient.telefono}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-brand-50 text-brand-700 rounded-full text-xs border border-brand-100">
                          {patient.motivo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedPatientId(patient.id)}
                          className="text-brand-600 hover:text-brand-800 font-medium text-xs border border-brand-200 px-3 py-1 rounded hover:bg-brand-50"
                        >
                          Ver Expediente
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {patientsTotalPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-xs text-slate-500">
                  Página {patientPage} de {patientsTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchPatients(patientPage - 1)}
                    disabled={patientPage === 1}
                    className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    &lt; Anterior
                  </button>
                  <button
                    onClick={() => fetchPatients(patientPage + 1)}
                    disabled={patientPage === patientsTotalPages}
                    className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Solicitudes (Appointments) View */}
        {activeTab === 'solicitudes' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Solicitudes de Citas</h2>
              <p className="text-sm text-slate-600">Gestiona las citas agendadas desde la web</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">Teléfono</th>
                    <th className="px-6 py-4">Fecha & Hora</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Solicitada</th>
                    <th className="px-6 py-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        <Clock className="mx-auto text-slate-300 mb-2" size={48} />
                        <p>No hay solicitudes de citas aún</p>
                      </td>
                    </tr>
                  ) : (
                    appointments.map(appointment => (
                      <tr key={appointment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{appointment.nombrePaciente}</td>
                        <td className="px-6 py-4">{appointment.telefono}</td>
                        <td className="px-6 py-4">
                          {new Date(appointment.fechaHora).toLocaleString('es-NI', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${appointment.estado === 'Confirmada' ? 'bg-green-100 text-green-700' :
                            appointment.estado === 'Cancelada' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                            {appointment.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          {new Date(appointment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {appointment.estado === 'Pendiente' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmAppointment(appointment)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                ✓ Aceptar
                              </button>
                              <button
                                onClick={() => handleCancelAppointment(appointment.id)}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1"
                              >
                                ✗ Rechazar
                              </button>
                            </div>
                          )}
                          {appointment.estado !== 'Pendiente' && (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <InvoiceManagement
            onCreateInvoice={() => setShowCreateInvoice(true)}
            onViewInvoice={(invoice) => {
              setSelectedInvoice(invoice);
              setShowInvoiceDetails(true);
            }}
            key={refreshInvoices}
          />
        )}

        {/* Workshops Tab */}
        {activeTab === 'workshops' && <WorkshopManager />}

        {/* Teleconsultas Tab */}
        {activeTab === 'teleconsultas' && (
          <VirtualSessionManager
            onJoinAsDoctor={(roomName) => {
              window.open(`https://meet.jit.si/${roomName}`, '_blank');
            }}
          />
        )}

        {/* Config - Availability Management + Audit */}
        {activeTab === 'config' && (
          <div className="space-y-8">
            <TwoFactorPanel getAuthHeaders={getAuthHeaders} />
            <AvailabilityManager />
            <TelmedAvailabilityManager />
            <AuditLogPanel getAuthHeaders={getAuthHeaders} />
          </div>
        )}


        {/* Calendar - Full Calendar View */}
        {activeTab === 'calendar' && <CalendarView />}

      </main >

      {/* Patient Details Modal */}
      {selectedPatientId !== null && (
        <PatientDetails
          patientId={selectedPatientId}
          onClose={() => setSelectedPatientId(null)}
        />
      )}


      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <AddPatientModal
          onClose={() => setShowAddPatientModal(false)}
          onSuccess={() => {
            refreshPatients();
            setShowAddPatientModal(false);
          }}
        />
      )}

      {/* Billing Modals */}
      {showCreateInvoice && (
        <CreateInvoiceModal
          onClose={() => setShowCreateInvoice(false)}
          onSuccess={() => {
            setRefreshInvoices(prev => prev + 1);
          }}
        />
      )}

      {showInvoiceDetails && selectedInvoice && (
        <InvoiceDetails
          invoice={selectedInvoice}
          onClose={() => {
            setShowInvoiceDetails(false);
            setSelectedInvoice(null);
          }}
          onUpdate={() => {
            setRefreshInvoices(prev => prev + 1);
            setShowInvoiceDetails(false);
            setSelectedInvoice(null);
          }}
          onRegisterPayment={(invoice) => {
            setSelectedInvoice(invoice);
            setShowInvoiceDetails(false);
            setShowRegisterPayment(true);
          }}
        />
      )}

      {showRegisterPayment && selectedInvoice && (
        <RegisterPaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowRegisterPayment(false);
            setSelectedInvoice(null);
          }}
          onSuccess={() => {
            setRefreshInvoices(prev => prev + 1);
            setShowRegisterPayment(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div >
  );
};
