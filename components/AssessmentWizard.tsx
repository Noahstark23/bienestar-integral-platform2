import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

// ── Definición de escalas ────────────────────────────────────────────────────

const PHQ9_QUESTIONS = [
    'Poco interés o placer en hacer las cosas',
    'Sentirse desanimado/a, deprimido/a o sin esperanza',
    'Dificultad para quedarse o permanecer dormido/a, o dormir demasiado',
    'Sentirse cansado/a o con poca energía',
    'Tener poco apetito o comer en exceso',
    'Sentirse mal consigo mismo/a, sentir que es un fracasado/a o que ha decepcionado a su familia',
    'Dificultad para concentrarse en cosas como leer o ver televisión',
    'Se mueve o habla tan despacio que otras personas lo han notado, o está tan inquieto/a que se mueve más de lo normal',
    'Pensamientos de que sería mejor estar muerto/a o de hacerse daño de alguna manera'
];

const GAD7_QUESTIONS = [
    'Sentirse nervioso/a, ansioso/a o con los nervios de punta',
    'No poder dejar de preocuparse o no poder controlar la preocupación',
    'Preocuparse demasiado por cosas distintas',
    'Dificultad para relajarse',
    'Estar tan intranquilo/a que es difícil permanecer sentado/a',
    'Molestarse o ponerse irritable con facilidad',
    'Sentir miedo, como si fuera a suceder algo terrible'
];

const ANSWER_OPTIONS = [
    { value: 0, label: 'Nunca' },
    { value: 1, label: 'Varios días' },
    { value: 2, label: 'Más de la mitad de los días' },
    { value: 3, label: 'Casi todos los días' }
];

function interpretarPHQ9(score: number): string {
    if (score <= 4)  return 'Mínimo';
    if (score <= 9)  return 'Leve';
    if (score <= 14) return 'Moderado';
    if (score <= 19) return 'Moderado-Severo';
    return 'Severo';
}

function interpretarGAD7(score: number): string {
    if (score <= 4)  return 'Mínimo';
    if (score <= 9)  return 'Leve';
    if (score <= 14) return 'Moderado';
    return 'Severo';
}

const SEVERITY_COLORS: Record<string, string> = {
    'Mínimo':         'text-green-700 bg-green-100 border-green-300',
    'Leve':           'text-yellow-700 bg-yellow-100 border-yellow-300',
    'Moderado':       'text-orange-700 bg-orange-100 border-orange-300',
    'Moderado-Severo':'text-red-700 bg-red-100 border-red-300',
    'Severo':         'text-red-900 bg-red-200 border-red-400',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface AssessmentWizardProps {
    patientId: number;
    tipo: 'PHQ9' | 'GAD7';
    onClose: () => void;
    onSaved: () => void;
}

// ── Componente ───────────────────────────────────────────────────────────────

export const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
    patientId, tipo, onClose, onSaved
}) => {
    const questions = tipo === 'PHQ9' ? PHQ9_QUESTIONS : GAD7_QUESTIONS;
    const title     = tipo === 'PHQ9' ? 'PHQ-9 — Escala de Depresión' : 'GAD-7 — Escala de Ansiedad';
    const maxScore  = tipo === 'PHQ9' ? 27 : 21;

    const [answers, setAnswers]   = useState<(number | null)[]>(Array(questions.length).fill(null));
    const [current, setCurrent]   = useState(0);
    const [notas, setNotas]       = useState('');
    const [saving, setSaving]     = useState(false);
    const [done, setDone]         = useState(false);
    const [result, setResult]     = useState<{ puntaje: number; interpretacion: string } | null>(null);

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
    });

    const totalAnswered = answers.filter(a => a !== null).length;
    const isLastQuestion = current === questions.length - 1;
    const allAnswered = totalAnswered === questions.length;

    const handleAnswer = (value: number) => {
        const updated = [...answers];
        updated[current] = value;
        setAnswers(updated);
    };

    const handleNext = () => {
        if (current < questions.length - 1) setCurrent(current + 1);
    };

    const handlePrev = () => {
        if (current > 0) setCurrent(current - 1);
    };

    const handleSubmit = async () => {
        if (!allAnswered) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/patients/${patientId}/assessments`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ tipo, respuestas: answers, notas })
            });
            const data = await res.json();
            if (res.ok) {
                setResult({ puntaje: data.puntaje, interpretacion: data.interpretacion });
                setDone(true);
            } else {
                alert(data.error || 'Error al guardar');
            }
        } catch {
            alert('Error de conexión');
        } finally {
            setSaving(false);
        }
    };

    const score = answers.reduce((sum, a) => sum + (a ?? 0), 0);
    const interpretation = tipo === 'PHQ9' ? interpretarPHQ9(score) : interpretarGAD7(score);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {done ? 'Evaluación completada' : `Pregunta ${current + 1} de ${questions.length}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={22} />
                    </button>
                </div>

                {done && result ? (
                    /* ── Resultado final ─────────────────────────────────────── */
                    <div className="p-6 text-center space-y-5">
                        <CheckCircle className="mx-auto text-green-500" size={52} />
                        <div>
                            <p className="text-slate-600 text-sm mb-1">Puntaje obtenido</p>
                            <p className="text-5xl font-bold text-slate-800">
                                {result.puntaje}
                                <span className="text-xl font-normal text-slate-400"> / {maxScore}</span>
                            </p>
                        </div>
                        <div className={`inline-block px-5 py-2 rounded-full border font-semibold text-lg ${SEVERITY_COLORS[result.interpretacion] ?? ''}`}>
                            {result.interpretacion}
                        </div>
                        <p className="text-xs text-slate-400">Evaluación guardada exitosamente</p>
                        <button
                            onClick={() => { onSaved(); onClose(); }}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-xl font-semibold transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                ) : (
                    /* ── Cuestionario ───────────────────────────────────────── */
                    <div className="p-6 space-y-6">
                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2">
                            <div
                                className="bg-brand-500 h-2 rounded-full transition-all"
                                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
                            />
                        </div>

                        {/* Question */}
                        <p className="text-slate-800 font-medium leading-relaxed min-h-[3rem]">
                            {questions[current]}
                        </p>

                        {/* Answer options */}
                        <div className="space-y-2">
                            {ANSWER_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleAnswer(opt.value)}
                                    className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                                        answers[current] === opt.value
                                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                                    }`}
                                >
                                    <span className="text-slate-400 text-sm mr-2">{opt.value}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Live score preview */}
                        {totalAnswered > 0 && (
                            <div className="flex items-center justify-between text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-2">
                                <span>Puntaje actual: <strong className="text-slate-700">{score}</strong></span>
                                <span className={`font-medium ${SEVERITY_COLORS[interpretation]?.split(' ')[0] ?? ''}`}>
                                    {interpretation}
                                </span>
                            </div>
                        )}

                        {/* Notes (last question) */}
                        {isLastQuestion && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">
                                    Notas clínicas (opcional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={notas}
                                    onChange={e => setNotas(e.target.value)}
                                    placeholder="Observaciones del clínico..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none"
                                />
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex gap-3">
                            <button
                                onClick={handlePrev}
                                disabled={current === 0}
                                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 transition-colors"
                            >
                                <ChevronLeft size={18} />
                                Anterior
                            </button>

                            {isLastQuestion ? (
                                <button
                                    onClick={handleSubmit}
                                    disabled={!allAnswered || saving}
                                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-xl font-semibold disabled:opacity-50 transition-colors"
                                >
                                    {saving ? 'Guardando...' : 'Finalizar y Guardar'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    disabled={answers[current] === null}
                                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                                >
                                    Siguiente
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
