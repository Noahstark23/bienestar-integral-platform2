import React, { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, ClipboardList } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { AssessmentWizard } from './AssessmentWizard';

interface Assessment {
    id: number;
    tipo: string;
    puntaje: number;
    interpretacion: string;
    respuestas: number[];
    notas: string;
    fecha: string;
}

interface AssessmentPanelProps {
    patientId: number;
}

const SEVERITY_BADGE: Record<string, string> = {
    'Mínimo':          'bg-green-100 text-green-700',
    'Leve':            'bg-yellow-100 text-yellow-700',
    'Moderado':        'bg-orange-100 text-orange-700',
    'Moderado-Severo': 'bg-red-100 text-red-700',
    'Severo':          'bg-red-200 text-red-900',
};

export const AssessmentPanel: React.FC<AssessmentPanelProps> = ({ patientId }) => {
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading]         = useState(false);
    const [activeTab, setActiveTab]     = useState<'PHQ9' | 'GAD7'>('PHQ9');
    const [wizard, setWizard]           = useState<'PHQ9' | 'GAD7' | null>(null);
    const [deleting, setDeleting]       = useState<number | null>(null);

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
    });

    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const res  = await fetch(`/api/patients/${patientId}/assessments`, { headers: getAuthHeaders() });
            const data = await res.json();
            setAssessments(Array.isArray(data) ? data : []);
        } catch {
            setAssessments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAssessments(); }, [patientId]);

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta evaluación?')) return;
        setDeleting(id);
        try {
            await fetch(`/api/patients/${patientId}/assessments/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            setAssessments(prev => prev.filter(a => a.id !== id));
        } finally {
            setDeleting(null);
        }
    };

    const filtered = assessments
        .filter(a => a.tipo === activeTab)
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    // Chart data (chronological)
    const chartData = filtered.map(a => ({
        fecha: new Date(a.fecha).toLocaleDateString('es-NI', { month: 'short', day: 'numeric' }),
        puntaje: a.puntaje
    }));

    // Trend arrow between last two evaluations
    const TrendIcon = () => {
        if (filtered.length < 2) return null;
        const diff = filtered[filtered.length - 1].puntaje - filtered[filtered.length - 2].puntaje;
        if (diff < 0)  return <TrendingDown size={16} className="text-green-600" />;
        if (diff > 0)  return <TrendingUp   size={16} className="text-red-500" />;
        return <Minus size={16} className="text-slate-400" />;
    };

    const maxScore = activeTab === 'PHQ9' ? 27 : 21;
    const lineColor = activeTab === 'PHQ9' ? '#6366f1' : '#f59e0b';

    return (
        <div className="space-y-6">
            {/* Wizard modal */}
            {wizard && (
                <AssessmentWizard
                    patientId={patientId}
                    tipo={wizard}
                    onClose={() => setWizard(null)}
                    onSaved={fetchAssessments}
                />
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {(['PHQ9', 'GAD7'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                                activeTab === t
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            {t === 'PHQ9' ? 'PHQ-9 Depresión' : 'GAD-7 Ansiedad'}
                            {assessments.filter(a => a.tipo === t).length > 0 && (
                                <span className="ml-2 bg-white bg-opacity-30 text-xs rounded-full px-1.5">
                                    {assessments.filter(a => a.tipo === t).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setWizard(activeTab)}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    Nueva Evaluación
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-400">Cargando evaluaciones...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <ClipboardList className="mx-auto mb-3 text-slate-300" size={48} />
                    <p className="font-medium">No hay evaluaciones {activeTab === 'PHQ9' ? 'PHQ-9' : 'GAD-7'} registradas</p>
                    <p className="text-sm mt-1">Haz clic en "Nueva Evaluación" para comenzar</p>
                </div>
            ) : (
                <>
                    {/* Chart */}
                    {filtered.length >= 2 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-slate-700 text-sm">
                                    Evolución del puntaje
                                </h3>
                                <div className="flex items-center gap-1 text-sm text-slate-500">
                                    <TrendIcon />
                                    <span>Tendencia</span>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, maxScore]} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        formatter={(v: number) => [`${v} / ${maxScore}`, 'Puntaje']}
                                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="puntaje"
                                        stroke={lineColor}
                                        strokeWidth={2.5}
                                        dot={{ r: 5, fill: lineColor }}
                                        activeDot={{ r: 7 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* List (newest first) */}
                    <div className="space-y-3">
                        {[...filtered].reverse().map(a => (
                            <div
                                key={a.id}
                                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_BADGE[a.interpretacion] ?? ''}`}>
                                            {a.interpretacion}
                                        </span>
                                        <span className="font-bold text-slate-800 text-lg">
                                            {a.puntaje}
                                            <span className="text-slate-400 font-normal text-sm"> / {maxScore}</span>
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        {new Date(a.fecha).toLocaleDateString('es-NI', {
                                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                                        })}
                                    </p>
                                    {a.notas && (
                                        <p className="text-sm text-slate-600 mt-1 italic">"{a.notas}"</p>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(a.id)}
                                    disabled={deleting === a.id}
                                    className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                                    title="Eliminar evaluación"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
