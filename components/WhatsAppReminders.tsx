import React, { useEffect, useState } from 'react';
import { MessageCircle, Check, RefreshCw } from 'lucide-react';

interface Appointment {
    id: number;
    nombrePaciente: string;
    telefono: string;
    fechaHora: string;
    estado: string;
    motivo?: string;
}

interface Props {
    getAuthHeaders: () => Record<string, string>;
}

// Normaliza un teléfono nicaragüense a formato internacional para wa.me
const waPhone = (tel: string) => {
    const digits = (tel || '').replace(/\D/g, '');
    if (digits.length === 8) return `505${digits}`;
    return digits;
};

const buildMessage = (a: Appointment) => {
    const f = new Date(a.fechaHora);
    const fecha = f.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' });
    const hora = f.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });
    return `Hola ${a.nombrePaciente} 👋\n\nLe recordamos su cita en el Consultorio Psicológico Bienestar Integral:\n📅 ${fecha}\n🕐 ${hora}\n\nSi necesita reprogramar, puede responder por este medio.\n\n— Lic. Esmirna García`;
};

const sentKey = (id: number) => `wa-recordatorio-${id}-${new Date().toISOString().slice(0, 10)}`;

export const WhatsAppReminders: React.FC<Props> = ({ getAuthHeaders }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [sent, setSent] = useState<Record<number, boolean>>({});

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/appointments', { headers: getAuthHeaders() });
            const data = await res.json();
            const list: Appointment[] = Array.isArray(data) ? data : (data.data || []);

            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            const finManana = new Date(hoy); finManana.setDate(finManana.getDate() + 2);

            const proximos = list.filter(a => {
                const f = new Date(a.fechaHora);
                return f >= hoy && f < finManana && !['Cancelada', 'Completada'].includes(a.estado);
            }).sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime());

            setAppointments(proximos);
            const marks: Record<number, boolean> = {};
            proximos.forEach(a => { if (localStorage.getItem(sentKey(a.id))) marks[a.id] = true; });
            setSent(marks);
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const handleSend = (a: Appointment) => {
        const url = `https://wa.me/${waPhone(a.telefono)}?text=${encodeURIComponent(buildMessage(a))}`;
        window.open(url, '_blank');
        localStorage.setItem(sentKey(a.id), '1');
        setSent(prev => ({ ...prev, [a.id]: true }));
    };

    const esHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
    const deHoy = appointments.filter(a => esHoy(a.fechaHora));
    const deManana = appointments.filter(a => !esHoy(a.fechaHora));

    const Row = ({ a }: { a: Appointment }) => (
        <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <div className="min-w-0">
                <p className="font-medium text-slate-800 truncate">{a.nombrePaciente}</p>
                <p className="text-xs text-slate-500">
                    {new Date(a.fechaHora).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' })} · {a.telefono} · {a.estado}
                </p>
            </div>
            <button
                onClick={() => handleSend(a)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sent[a.id]
                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    : 'bg-[#25D366] text-white hover:brightness-95'}`}
            >
                {sent[a.id] ? <><Check size={13} /> Enviado</> : <><MessageCircle size={13} /> WhatsApp</>}
            </button>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#25D366]/10 rounded-lg flex items-center justify-center">
                        <MessageCircle size={20} className="text-[#25D366]" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Recordatorios por WhatsApp</h3>
                        <p className="text-sm text-slate-500">Citas de hoy y mañana — un clic abre WhatsApp con el mensaje listo.</p>
                    </div>
                </div>
                <button onClick={load} title="Actualizar" className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50">
                    <RefreshCw size={16} />
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-slate-400 py-4 text-center">Cargando citas…</p>
            ) : appointments.length === 0 ? (
                <p className="text-sm text-slate-400 py-4 text-center">No hay citas para hoy ni mañana. 🎉</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Hoy ({deHoy.length})</p>
                        {deHoy.length ? deHoy.map(a => <Row key={a.id} a={a} />) : <p className="text-sm text-slate-400 py-2">Sin citas hoy.</p>}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Mañana ({deManana.length})</p>
                        {deManana.length ? deManana.map(a => <Row key={a.id} a={a} />) : <p className="text-sm text-slate-400 py-2">Sin citas mañana.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};
