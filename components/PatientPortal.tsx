import React, { useState } from 'react';
import { Search, FileText, BookOpen, Video, ArrowLeft, AlertCircle } from 'lucide-react';

interface PortalData {
    nombre: string;
    edad?: number;
    estado?: string;
    facturasPendientes: Array<{
        numeroFactura: string;
        total: number;
        saldo: number;
        estado: string;
        fechaVencimiento: string;
        fechaEmision: string;
    }>;
    talleres: Array<{
        titulo: string;
        fechaInicio: string;
        estado: string;
        ubicacion: string;
        horario: string;
        pagado: boolean;
    }>;
    proximasSesiones: Array<{
        codigo: string;
        fechaHora: string;
        duracion: number;
        estado: string;
    }>;
}

interface Props {
    onBack: () => void;
}

export const PatientPortal: React.FC<Props> = ({ onBack }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState<PortalData | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/portal/me?code=${encodeURIComponent(code.trim())}`);
            const json = await res.json();
            if (!res.ok) {
                setError(json.error || 'Código no válido');
            } else {
                setData(json);
            }
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const fmtDate = (d: string) => new Date(d).toLocaleDateString('es-NI', { year: 'numeric', month: 'long', day: 'numeric' });
    const fmtDateTime = (d: string) => new Date(d).toLocaleString('es-NI', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm">
                    <ArrowLeft size={16} /> Volver
                </button>
                <div>
                    <h1 className="text-xl font-bold text-brand-700">Bienestar Integral</h1>
                    <p className="text-xs text-slate-500">Portal del Paciente</p>
                </div>
            </header>

            <main className="flex-1 max-w-2xl mx-auto w-full p-6">
                {!data ? (
                    /* Code input form */
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-brand-600" size={28} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Consulta tu información</h2>
                            <p className="text-slate-500">Ingresa el código de tu sesión virtual para ver tu historial, facturas y talleres.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Código de sesión</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase())}
                                    placeholder="Ej: VS-ABC123"
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-mono tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
                                    maxLength={12}
                                />
                                <p className="text-xs text-slate-400 mt-1 text-center">El código fue enviado por tu psicóloga</p>
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={loading || code.length < 3}
                                className="w-full bg-brand-600 text-white py-3 rounded-xl font-semibold hover:bg-brand-700 transition disabled:opacity-50"
                            >
                                {loading ? 'Verificando...' : 'Consultar'}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* Patient dashboard */
                    <div className="space-y-6 mt-4">
                        {/* Welcome */}
                        <div className="bg-brand-600 text-white rounded-2xl p-6">
                            <p className="text-brand-200 text-sm mb-1">Bienvenida/o</p>
                            <h2 className="text-2xl font-bold">{data.nombre}</h2>
                            {data.estado && <span className="text-xs bg-white/20 px-2 py-1 rounded-full mt-1 inline-block">{data.estado}</span>}
                        </div>

                        {/* Facturas pendientes */}
                        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                <FileText size={18} className="text-brand-600" />
                                <h3 className="font-semibold text-slate-800">Facturas Pendientes</h3>
                                {data.facturasPendientes.length > 0 && (
                                    <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                                        {data.facturasPendientes.length}
                                    </span>
                                )}
                            </div>
                            {data.facturasPendientes.length === 0 ? (
                                <p className="px-5 py-4 text-sm text-slate-400 italic">No tienes facturas pendientes ✓</p>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {data.facturasPendientes.map(inv => (
                                        <li key={inv.numeroFactura} className="px-5 py-3 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 font-mono">{inv.numeroFactura}</p>
                                                <p className="text-xs text-slate-500">Emitida: {fmtDate(inv.fechaEmision)}</p>
                                                <p className="text-xs text-slate-400">Vence: {fmtDate(inv.fechaVencimiento)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-red-600">C$ {inv.saldo.toFixed(2)}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${inv.estado === 'Vencida' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{inv.estado}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {/* Talleres */}
                        {data.talleres.length > 0 && (
                            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <BookOpen size={18} className="text-brand-600" />
                                    <h3 className="font-semibold text-slate-800">Talleres Inscritos</h3>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {data.talleres.map((t, i) => (
                                        <li key={i} className="px-5 py-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800">{t.titulo}</p>
                                                    <p className="text-xs text-slate-500">{t.ubicacion} · {t.horario}</p>
                                                    <p className="text-xs text-slate-400">Inicio: {fmtDate(t.fechaInicio)}</p>
                                                </div>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${t.pagado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {t.pagado ? 'Pagado' : 'Pendiente pago'}
                                                </span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {/* Próximas sesiones virtuales */}
                        {data.proximasSesiones.length > 0 && (
                            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                                    <Video size={18} className="text-brand-600" />
                                    <h3 className="font-semibold text-slate-800">Próximas Teleconsultas</h3>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {data.proximasSesiones.map(s => (
                                        <li key={s.codigo} className="px-5 py-3">
                                            <p className="text-sm font-medium text-slate-800">{fmtDateTime(s.fechaHora)}</p>
                                            <p className="text-xs text-slate-500">Duración: {s.duracion} min · Código: <span className="font-mono text-brand-600">{s.codigo}</span></p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${s.estado === 'Aprobada' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{s.estado}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <button
                            onClick={() => { setData(null); setCode(''); }}
                            className="w-full border border-slate-200 text-slate-600 py-3 rounded-xl text-sm hover:bg-slate-50 transition"
                        >
                            Consultar con otro código
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};
