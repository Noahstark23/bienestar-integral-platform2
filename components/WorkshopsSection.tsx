import React, { useEffect, useState } from 'react';
import { GraduationCap, Calendar, Clock, MapPin, Users, ArrowRight } from 'lucide-react';

interface PublicWorkshop {
    id: number;
    titulo: string;
    descripcion: string;
    fechaInicio: string;
    fechaFin?: string | null;
    horario: string;
    ubicacion: string;
    precio: number;
    cupoMaximo: number;
    inscritos: number;
    disponibles: number;
}

const WHATSAPP = 'https://wa.me/50587171412';

const formatFecha = (iso: string) => {
    try {
        return new Date(iso).toLocaleDateString('es-NI', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return '';
    }
};

export const WorkshopsSection: React.FC = () => {
    const [workshops, setWorkshops] = useState<PublicWorkshop[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetch('/api/workshops/public')
            .then(r => (r.ok ? r.json() : []))
            .then(d => setWorkshops(Array.isArray(d) ? d : []))
            .catch(() => { /* silencioso: si falla, no mostramos la sección */ })
            .finally(() => setLoaded(true));
    }, []);

    // No mostrar la sección si no hay talleres abiertos
    if (!loaded || workshops.length === 0) return null;

    return (
        <section id="talleres" className="py-24 bg-brand-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto text-center mb-14">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-100 text-brand-700 rounded-full font-semibold text-sm mb-3">
                        <GraduationCap size={16} /> Talleres y Cursos
                    </span>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">Próximos talleres</h2>
                    <p className="text-slate-600 text-lg">
                        Espacios de aprendizaje grupal sobre bienestar, crianza y salud mental. ¡Reserva tu cupo!
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workshops.map(w => {
                        const lleno = w.disponibles <= 0;
                        const msg = encodeURIComponent(`Hola, me interesa el taller "${w.titulo}". ¿Me puede dar más información?`);
                        return (
                            <div key={w.id} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden flex flex-col hover:shadow-xl transition-shadow">
                                <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-5 text-white">
                                    <h3 className="text-lg font-bold leading-snug">{w.titulo}</h3>
                                </div>
                                <div className="p-5 flex-1 flex flex-col">
                                    {w.descripcion && (
                                        <p className="text-slate-600 text-sm leading-relaxed mb-4">{w.descripcion}</p>
                                    )}
                                    <ul className="space-y-2 text-sm text-slate-700 mb-4">
                                        <li className="flex items-center gap-2">
                                            <Calendar size={15} className="text-brand-600 shrink-0" />
                                            {formatFecha(w.fechaInicio)}
                                            {w.fechaFin ? ` — ${formatFecha(w.fechaFin)}` : ''}
                                        </li>
                                        {w.horario && (
                                            <li className="flex items-center gap-2">
                                                <Clock size={15} className="text-brand-600 shrink-0" /> {w.horario}
                                            </li>
                                        )}
                                        <li className="flex items-center gap-2">
                                            <MapPin size={15} className="text-brand-600 shrink-0" /> {w.ubicacion}
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Users size={15} className="text-brand-600 shrink-0" />
                                            {lleno ? 'Cupo lleno' : `${w.disponibles} cupo${w.disponibles === 1 ? '' : 's'} disponible${w.disponibles === 1 ? '' : 's'}`}
                                        </li>
                                    </ul>

                                    <div className="mt-auto flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                        <span className="font-bold text-brand-700">
                                            {w.precio > 0 ? `C$ ${w.precio.toLocaleString('es-NI')}` : 'Gratis'}
                                        </span>
                                        <a
                                            href={`${WHATSAPP}?text=${msg}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${lleno
                                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                                        >
                                            {lleno ? 'Lista de espera' : 'Quiero inscribirme'}
                                            <ArrowRight size={15} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
