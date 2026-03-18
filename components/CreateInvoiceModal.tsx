import React, { useState, useEffect } from 'react';
import { X, Search, Check, Plus, Trash2, Calendar, User, FileText } from 'lucide-react';

interface Patient {
    id: number;
    nombre: string;
}

interface Session {
    id: number;
    fecha: string;
    tipo: string;
    pago: number;
}

interface Workshop {
    id: number;
    titulo: string;
    precio: number;
}

interface Enrollment {
    id: number;
    fechaInscripcion: string;
    workshop: Workshop;
}

interface CustomItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
}

interface Props {
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateInvoiceModal: React.FC<Props> = ({ onClose, onSuccess }) => {
    // State
    const [patients, setPatients] = useState<Patient[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

    // Selection State
    const [selectedPatientId, setSelectedPatientId] = useState<number | ''>('');
    const [selectedSessionIds, setSelectedSessionIds] = useState<number[]>([]);
    const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<number[]>([]);

    // Price Overrides
    const [sessionPriceOverrides, setSessionPriceOverrides] = useState<Record<number, number>>({});
    const [enrollmentPriceOverrides, setEnrollmentPriceOverrides] = useState<Record<number, number>>({});

    // Custom Items State
    const [customItems, setCustomItems] = useState<CustomItem[]>([]);
    const [newItem, setNewItem] = useState({ description: '', quantity: 1, unitPrice: 0 });

    // Discount & Notes
    const [descuento, setDescuento] = useState(0);
    const [notas, setNotas] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
    });

    // Fetch Patients on mount
    useEffect(() => {
        fetch('/api/patients', { headers: getAuthHeaders() })
            .then(res => res.json())
            .then(data => setPatients(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []))
            .catch(err => console.error('Error fetching patients:', err));
    }, []);

    // Fetch Items when Patient Selected
    useEffect(() => {
        if (!selectedPatientId) {
            setSessions([]);
            setEnrollments([]);
            return;
        }

        const fetchItems = async () => {
            try {
                // Fetch unbilled sessions
                const resSessions = await fetch(`/api/sessions?patientId=${selectedPatientId}&facturada=false`, { headers: getAuthHeaders() });
                if (resSessions.ok) {
                    const sessData = await resSessions.json();
                    setSessions(Array.isArray(sessData) ? sessData : []);
                }

                // Fetch unbilled enrollments
                const resEnrollments = await fetch(`/api/patients/${selectedPatientId}/unbilled-enrollments`, { headers: getAuthHeaders() });
                if (resEnrollments.ok) {
                    const enrData = await resEnrollments.json();
                    setEnrollments(Array.isArray(enrData) ? enrData : []);
                }
            } catch (error) {
                console.error('Error fetching items:', error);
            }
        };

        fetchItems();
    }, [selectedPatientId]);

    // Formatters
    const formatCurrency = (amount: number) => `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;
    const formatDate = (date: string) => new Date(date).toLocaleDateString('es-NI');

    // Handlers
    const toggleSession = (id: number) => {
        setSelectedSessionIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const toggleEnrollment = (id: number) => {
        setSelectedEnrollmentIds(prev =>
            prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
        );
    };

    const addCustomItem = () => {
        if (!newItem.description || newItem.unitPrice <= 0) return;
        setCustomItems([...customItems, { ...newItem, id: Date.now() }]);
        setNewItem({ description: '', quantity: 1, unitPrice: 0 });
    };

    const removeCustomItem = (id: number) => {
        setCustomItems(customItems.filter(i => i.id !== id));
    };

    // Calculations
    const selectedSessionsList = sessions.filter(s => selectedSessionIds.includes(s.id));
    const selectedEnrollmentsList = enrollments.filter(e => selectedEnrollmentIds.includes(e.id));

    const subtotalSessions = selectedSessionsList.reduce((sum, s) => {
        const price = sessionPriceOverrides[s.id] !== undefined ? sessionPriceOverrides[s.id] : (s.pago || 0);
        return sum + price;
    }, 0);

    const subtotalWorkshops = selectedEnrollmentsList.reduce((sum, e) => {
        const price = enrollmentPriceOverrides[e.id] !== undefined ? enrollmentPriceOverrides[e.id] : (e.workshop.precio || 0);
        return sum + price;
    }, 0);

    const subtotalCustom = customItems.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

    const subtotal = subtotalSessions + subtotalWorkshops + subtotalCustom;
    const iva = (subtotal - descuento) * 0.15;
    const total = (subtotal - descuento) + iva;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (selectedSessionIds.length === 0 && selectedEnrollmentIds.length === 0 && customItems.length === 0) {
            alert('Selecciona al menos un ítem para facturar');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/invoices', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    patientId: selectedPatientId,
                    sessionIds: selectedSessionIds,
                    enrollmentIds: selectedEnrollmentIds,
                    customItems,
                    descuento,
                    notas,
                    sessionPriceOverrides,
                    enrollmentPriceOverrides
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('Error al crear factura');
        } finally {
            setLoading(false);
        }
    };

    // Filtered patients for search
    const filteredPatients = patients.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Nueva Factura</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Patient Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Paciente</label>
                            {!selectedPatientId ? (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar paciente..."
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                                        {filteredPatients.map(patient => (
                                            <button
                                                key={patient.id}
                                                type="button"
                                                onClick={() => setSelectedPatientId(patient.id)}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex justify-between items-center"
                                            >
                                                <span>{patient.nombre}</span>
                                                <span className="text-xs text-brand-600 font-medium">Seleccionar</span>
                                            </button>
                                        ))}
                                        {filteredPatients.length === 0 && (
                                            <div className="p-4 text-center text-slate-500 text-sm">No se encontraron pacientes</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center p-3 bg-brand-50 border border-brand-100 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-brand-100 p-2 rounded-full">
                                            <User size={20} className="text-brand-600" />
                                        </div>
                                        <span className="font-medium text-brand-900">
                                            {patients.find(p => p.id === selectedPatientId)?.nombre}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedPatientId('');
                                            setSelectedSessionIds([]);
                                            setSelectedEnrollmentIds([]);
                                            setSessionPriceOverrides({});
                                            setEnrollmentPriceOverrides({});
                                            setCustomItems([]);
                                        }}
                                        className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                                    >
                                        Cambiar
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedPatientId && (
                            <>
                                {/* Sessions Selection */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <Calendar size={18} className="text-brand-500" />
                                        Sesiones Pendientes ({sessions.length})
                                    </h3>
                                    {sessions.length > 0 ? (
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="w-10 p-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedSessionIds.length === sessions.length && sessions.length > 0}
                                                                onChange={() => {
                                                                    if (selectedSessionIds.length === sessions.length) setSelectedSessionIds([]);
                                                                    else setSelectedSessionIds(sessions.map(s => s.id));
                                                                }}
                                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                            />
                                                        </th>
                                                        <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase">Fecha</th>
                                                        <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                                                        <th className="text-right p-3 text-xs font-semibold text-slate-600 uppercase">Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {sessions.map(session => (
                                                        <tr key={session.id} className="hover:bg-slate-50">
                                                            <td className="p-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedSessionIds.includes(session.id)}
                                                                    onChange={() => toggleSession(session.id)}
                                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                                />
                                                            </td>
                                                            <td className="p-3 text-sm text-slate-700">{formatDate(session.fecha)}</td>
                                                            <td className="p-3 text-sm text-slate-700">{session.tipo}</td>

                                                            <td className="p-3 text-sm text-right font-medium text-slate-700">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={sessionPriceOverrides[session.id] !== undefined ? sessionPriceOverrides[session.id] : session.pago}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        setSessionPriceOverrides(prev => ({ ...prev, [session.id]: isNaN(val) ? 0 : val }));
                                                                    }}
                                                                    className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:ring-brand-500 focus:border-brand-500 text-sm"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No hay sesiones pendientes de facturación.</p>
                                    )}
                                </div>

                                {/* Enrollments Selection */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <FileText size={18} className="text-brand-500" />
                                        Talleres Pendientes ({enrollments.length})
                                    </h3>
                                    {enrollments.length > 0 ? (
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="w-10 p-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedEnrollmentIds.length === enrollments.length && enrollments.length > 0}
                                                                onChange={() => {
                                                                    if (selectedEnrollmentIds.length === enrollments.length) setSelectedEnrollmentIds([]);
                                                                    else setSelectedEnrollmentIds(enrollments.map(e => e.id));
                                                                }}
                                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                            />
                                                        </th>
                                                        <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase">Taller</th>
                                                        <th className="text-left p-3 text-xs font-semibold text-slate-600 uppercase">Inscripción</th>
                                                        <th className="text-right p-3 text-xs font-semibold text-slate-600 uppercase">Precio</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {enrollments.map(enrollment => (
                                                        <tr key={enrollment.id} className="hover:bg-slate-50">
                                                            <td className="p-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedEnrollmentIds.includes(enrollment.id)}
                                                                    onChange={() => toggleEnrollment(enrollment.id)}
                                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                                />
                                                            </td>
                                                            <td className="p-3 text-sm text-slate-700 font-medium">{enrollment.workshop.titulo}</td>
                                                            <td className="p-3 text-sm text-slate-600">{formatDate(enrollment.fechaInscripcion)}</td>

                                                            <td className="p-3 text-sm text-right font-medium text-slate-700">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={enrollmentPriceOverrides[enrollment.id] !== undefined ? enrollmentPriceOverrides[enrollment.id] : enrollment.workshop.precio}
                                                                    onChange={(e) => {
                                                                        const val = parseFloat(e.target.value);
                                                                        setEnrollmentPriceOverrides(prev => ({ ...prev, [enrollment.id]: isNaN(val) ? 0 : val }));
                                                                    }}
                                                                    className="w-24 px-2 py-1 text-right border border-slate-300 rounded focus:ring-brand-500 focus:border-brand-500 text-sm"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No hay talleres pendientes de facturación.</p>
                                    )}
                                </div>

                                {/* Custom Items */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 mb-3 border-b pb-2 pt-4">Ítems Adicionales</h3>

                                    <div className="flex gap-2 mb-4 items-end">
                                        <div className="flex-grow">
                                            <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                                            <input
                                                type="text"
                                                value={newItem.description}
                                                onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                                placeholder="Ej. Libro, Crema..."
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="text-xs text-slate-500 mb-1 block">Cant.</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={newItem.quantity}
                                                onChange={e => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-xs text-slate-500 mb-1 block">Precio Unit.</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={newItem.unitPrice}
                                                onChange={e => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addCustomItem}
                                            className="bg-brand-100 text-brand-700 p-2.5 rounded-lg hover:bg-brand-200 transition-colors"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    {customItems.length > 0 && (
                                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-700">Descripción</th>
                                                        <th className="text-center py-2 px-4 text-xs font-semibold text-slate-700">Cant.</th>
                                                        <th className="text-right py-2 px-4 text-xs font-semibold text-slate-700">Total</th>
                                                        <th className="w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {customItems.map(item => (
                                                        <tr key={item.id}>
                                                            <td className="py-2 px-4 text-sm">{item.description}</td>
                                                            <td className="py-2 px-4 text-sm text-center">{item.quantity}</td>
                                                            <td className="py-2 px-4 text-sm text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                                                            <td className="py-2 px-4 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeCustomItem(item.id)}
                                                                    className="text-red-500 hover:text-red-700"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Financial Summary */}
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Descuento Global (C$)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={descuento}
                                            onChange={(e) => setDescuento(Number(e.target.value))}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Notas / Observaciones</label>
                                        <textarea
                                            value={notas}
                                            onChange={(e) => setNotas(e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                            placeholder="Detalles adicionales para la factura..."
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-slate-200 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Subtotal</span>
                                            <span className="font-medium">{formatCurrency(subtotal)}</span>
                                        </div>
                                        {descuento > 0 && (
                                            <div className="flex justify-between text-sm text-red-600">
                                                <span>Descuento</span>
                                                <span>- {formatCurrency(descuento)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">IVA (15%)</span>
                                            <span className="font-medium">{formatCurrency(iva)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold text-slate-800 pt-2">
                                            <span>Total</span>
                                            <span className="text-brand-600">{formatCurrency(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !selectedPatientId || (selectedSessionIds.length === 0 && selectedEnrollmentIds.length === 0 && customItems.length === 0 && subtotal === 0)} // Allow 0 if it's a 100% discount, but generally require items.
                                className="flex-1 px-4 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                                {loading ? 'Procesando...' : 'Crear Factura'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
