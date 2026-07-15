import React, { useEffect, useState } from 'react';
import { DatabaseBackup, Download, Mail, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

interface BackupStatus {
    smtpConfigurado: boolean;
    horaAutomatica: string;
    ultimoRespaldo: { fecha: string; ok: boolean; destino: string; tamanoKB?: number; error?: string } | null;
}

interface Props {
    getAuthHeaders: () => Record<string, string>;
}

export const BackupPanel: React.FC<Props> = ({ getAuthHeaders }) => {
    const [status, setStatus] = useState<BackupStatus | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [sending, setSending] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const loadStatus = async () => {
        try {
            const res = await fetch('/api/backup/status', { headers: getAuthHeaders() });
            if (res.ok) setStatus(await res.json());
        } catch { /* silencioso */ }
    };

    useEffect(() => { loadStatus(); }, []);

    const handleDownload = async () => {
        setDownloading(true); setMsg(null);
        try {
            const res = await fetch('/api/backup/download', { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('No se pudo generar el respaldo');
            const blob = await res.blob();
            const cd = res.headers.get('Content-Disposition') || '';
            const name = cd.match(/filename="([^"]+)"/)?.[1] || 'respaldo-bienestar.json.gz';
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = name; a.click();
            URL.revokeObjectURL(url);
            setMsg({ ok: true, text: 'Respaldo descargado. Guárdalo en un lugar seguro (Google Drive, USB…).' });
            loadStatus();
        } catch (e: any) {
            setMsg({ ok: false, text: e?.message || 'Error al descargar el respaldo.' });
        } finally { setDownloading(false); }
    };

    const handleSendEmail = async () => {
        setSending(true); setMsg(null);
        try {
            const res = await fetch('/api/backup/send-email', { method: 'POST', headers: getAuthHeaders() });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'No se pudo enviar el respaldo');
            setMsg({ ok: true, text: 'Respaldo enviado a tu correo.' });
            loadStatus();
        } catch (e: any) {
            setMsg({ ok: false, text: e?.message || 'Error al enviar el respaldo.' });
        } finally { setSending(false); }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <DatabaseBackup size={20} className="text-emerald-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Respaldo de Datos</h3>
                    <p className="text-sm text-slate-500">Copias de seguridad de todos los expedientes, citas y facturación.</p>
                </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-1.5 my-4">
                <p>
                    <strong>Automático:</strong> {status?.smtpConfigurado
                        ? <>cada día a las 2:30 AM se envía un respaldo a tu correo. ✅</>
                        : <span className="text-amber-700">requiere configurar el correo (SMTP) del sistema — mientras tanto, descarga el respaldo manualmente cada semana.</span>}
                </p>
                {status?.ultimoRespaldo && (
                    <p className="flex items-center gap-1.5">
                        {status.ultimoRespaldo.ok ? <CheckCircle size={14} className="text-emerald-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
                        Último respaldo: {new Date(status.ultimoRespaldo.fecha).toLocaleString('es-NI')} — {status.ultimoRespaldo.destino}
                        {status.ultimoRespaldo.tamanoKB ? ` (${status.ultimoRespaldo.tamanoKB} KB)` : ''}
                        {status.ultimoRespaldo.error ? ` — ${status.ultimoRespaldo.error}` : ''}
                    </p>
                )}
            </div>

            {msg && (
                <div className={`px-4 py-2.5 rounded-lg text-sm mb-3 ${msg.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {msg.text}
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                    {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Descargar respaldo completo
                </button>
                <button
                    onClick={handleSendEmail}
                    disabled={sending || !status?.smtpConfigurado}
                    title={!status?.smtpConfigurado ? 'Configura SMTP para habilitar el envío por correo' : ''}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
                >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    Enviar a mi correo ahora
                </button>
            </div>
        </div>
    );
};
