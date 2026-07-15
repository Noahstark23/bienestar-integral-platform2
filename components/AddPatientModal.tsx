import React, { useState } from 'react';
import { X, User, Calendar, Phone, FileText, Users, Save } from 'lucide-react';

interface AddPatientModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        edad: '',
        fechaNacimiento: '',
        telefono: '',
        motivo: '',
        ocupacion: '',
        escolaridad: '',
        estadoCivil: '',
        tutorNombre: '',
        tutorRelacion: '',
        // Datos ampliados: se auto-rellenan en los instrumentos/documentos
        sexo: '',
        direccion: '',
        barrio: '',
        lugarNacimiento: '',
        remision: '',
        situacionLaboral: '',
        numHijos: '',
        apodo: '',
        nombreMadre: '',
        telefonoMadre: '',
        nombrePadre: '',
        telefonoPadre: '',
        tutorIdentificacion: '',
        email: ''
    });

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age.toString();
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const birthDate = e.target.value;
        setFormData(prev => ({
            ...prev,
            fechaNacimiento: birthDate,
            edad: calculateAge(birthDate)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validación básica
            if (!formData.nombre || !formData.edad || !formData.telefono || !formData.motivo) {
                setError('Por favor completa todos los campos requeridos');
                setLoading(false);
                return;
            }

            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
                },
                body: JSON.stringify({
                    ...formData,
                    edad: parseInt(formData.edad)
                })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || `Error al crear paciente (${response.status})`);
            }

            // Éxito
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error creating patient:', err);
            setError(err?.message || 'Error al crear paciente. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const isMinor = parseInt(formData.edad) < 18;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Nuevo Paciente</h2>
                            <p className="text-brand-100 text-sm">Expediente Clínico</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Datos Básicos */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <User size={20} className="text-brand-600" />
                                Información Personal
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Nombre Completo <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="Ej: María José García López"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Fecha de Nacimiento <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fechaNacimiento}
                                        onChange={handleDateChange}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Edad <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.edad}
                                        onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
                                        placeholder="Auto-calculado"
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Teléfono <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="Ej: 8888-8888"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Ocupación
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ocupacion}
                                        onChange={(e) => setFormData({ ...formData, ocupacion: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        placeholder="Ej: Estudiante, Profesor..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Escolaridad
                                    </label>
                                    <select
                                        value={formData.escolaridad}
                                        onChange={(e) => setFormData({ ...formData, escolaridad: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Ninguna">Ninguna</option>
                                        <option value="Primaria">Primaria</option>
                                        <option value="Secundaria">Secundaria</option>
                                        <option value="Técnico">Técnico</option>
                                        <option value="Universitaria">Universitaria</option>
                                        <option value="Postgrado">Postgrado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Estado Civil
                                    </label>
                                    <select
                                        value={formData.estadoCivil}
                                        onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Soltero/a">Soltero/a</option>
                                        <option value="Casado/a">Casado/a</option>
                                        <option value="Divorciado/a">Divorciado/a</option>
                                        < option value="Viudo/a">Viudo/a</option>
                                        <option value="Unión Libre">Unión Libre</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Datos para el expediente y los documentos (auto-relleno de instrumentos) */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <FileText size={20} className="text-brand-600" />
                                Datos para el Expediente
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Opcionales — se reflejan automáticamente en la entrevista, el historial clínico y los consentimientos.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sexo / Género</label>
                                    <select
                                        value={formData.sexo}
                                        onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                {[
                                    { label: 'Correo electrónico', key: 'email', placeholder: 'correo@ejemplo.com' },
                                    { label: 'Dirección', key: 'direccion', placeholder: 'Dirección de domicilio' },
                                    { label: 'Barrio', key: 'barrio', placeholder: 'Barrio / comunidad' },
                                    { label: 'Lugar de nacimiento', key: 'lugarNacimiento', placeholder: 'Ciudad, departamento' },
                                    { label: 'Remisión / Referente', key: 'remision', placeholder: '¿Quién lo refiere?' },
                                    { label: 'Situación laboral', key: 'situacionLaboral', placeholder: 'Empleado, desempleado...' },
                                    { label: 'N° de hijas/os', key: 'numHijos', placeholder: 'Ej: 2' },
                                    { label: 'Cómo le llaman en casa', key: 'apodo', placeholder: 'Apodo familiar' },
                                    { label: 'Nombre de la madre', key: 'nombreMadre', placeholder: 'Nombre completo' },
                                    { label: 'Teléfono de la madre', key: 'telefonoMadre', placeholder: 'Ej: 8888-8888' },
                                    { label: 'Nombre del padre', key: 'nombrePadre', placeholder: 'Nombre completo' },
                                    { label: 'Teléfono del padre', key: 'telefonoPadre', placeholder: 'Ej: 8888-8888' },
                                ].map(f => (
                                    <div key={f.key}>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">{f.label}</label>
                                        <input
                                            type="text"
                                            value={(formData as any)[f.key]}
                                            onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            placeholder={f.placeholder}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tutor Info (si es menor) */}
                        {isMinor && (
                            <div className="border-t pt-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-brand-600" />
                                    Información del Tutor <span className="text-xs text-slate-500 font-normal">(menor de edad)</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Nombre del Tutor
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.tutorNombre}
                                            onChange={(e) => setFormData({ ...formData, tutorNombre: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            placeholder="Ej: Ana María López"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Relación
                                        </label>
                                        <select
                                            value={formData.tutorRelacion}
                                            onChange={(e) => setFormData({ ...formData, tutorRelacion: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="Madre">Madre</option>
                                            <option value="Padre">Padre</option>
                                            <option value="Tutor Legal">Tutor Legal</option>
                                            <option value="Abuelo/a">Abuelo/a</option>
                                            <option value="Tío/a">Tío/a</option>
                                            <option value="Otro">Otro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Identificación del Tutor (cédula)
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.tutorIdentificacion}
                                            onChange={(e) => setFormData({ ...formData, tutorIdentificacion: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                            placeholder="Ej: 001-123456-0000X"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Motivo de Consulta */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-brand-600" />
                                Motivo de Consulta
                            </h3>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    ¿Por qué consulta? <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={formData.motivo}
                                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    rows={4}
                                    placeholder="Describe brevemente el motivo de consulta, síntomas o preocupaciones principales..."
                                    required
                                />
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {error}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="border-t p-6 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>Guardando...</>
                        ) : (
                            <>
                                <Save size={18} />
                                Crear Paciente
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
