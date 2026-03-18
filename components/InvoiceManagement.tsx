import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, AlertCircle, Plus, Search, Download } from 'lucide-react';

const downloadCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
};

interface Invoice {
    id: number;
    numeroFactura: string;
    patient: {
        id: number;
        nombre: string;
        telefono: string;
    };
    sessions: any[];
    subtotal: number;
    descuento: number;
    iva: number;
    total: number;
    pagado: number;
    saldo: number;
    fechaEmision: string;
    fechaVencimiento: string;
    estado: string;
    payments: any[];
}

interface Props {
    onCreateInvoice: () => void;
    onViewInvoice: (invoice: Invoice) => void;
}

export const InvoiceManagement: React.FC<Props> = ({ onCreateInvoice, onViewInvoice }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<string>('all'); // all, Pendiente, Pagada, Vencida
    const [searchTerm, setSearchTerm] = useState('');

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
    });

    useEffect(() => {
        fetchInvoices();
    }, [filter]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const url = filter === 'all'
                ? '/api/invoices'
                : `/api/invoices?estado=${filter}`;

            const res = await fetch(url, { headers: getAuthHeaders() });
            const data = await res.json();
            setInvoices(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error al cargar facturas:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    // Calcular totales
    const totalPendiente = invoices
        .filter(inv => inv.estado === 'Pendiente')
        .reduce((sum, inv) => sum + inv.saldo, 0);

    const totalVencidas = invoices
        .filter(inv => {
            if (inv.estado !== 'Pendiente') return false;
            const vencimiento = new Date(inv.fechaVencimiento);
            return vencimiento < new Date();
        })
        .reduce((sum, inv) => sum + inv.saldo, 0);

    const totalCobradoMes = invoices
        .filter(inv => {
            const emision = new Date(inv.fechaEmision);
            const now = new Date();
            return emision.getMonth() === now.getMonth() &&
                emision.getFullYear() === now.getFullYear();
        })
        .reduce((sum, inv) => sum + inv.pagado, 0);

    // Filtrar por búsqueda
    const filteredInvoices = invoices.filter(inv =>
        inv.numeroFactura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.patient.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getEstadoBadge = (invoice: Invoice) => {
        if (invoice.estado === 'Pagada') {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Pagada</span>;
        }

        const vencida = new Date(invoice.fechaVencimiento) < new Date();
        if (vencida) {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Vencida</span>;
        }

        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pendiente</span>;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-NI', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleExportCSV = () => {
        const headers = ['Nro Factura', 'Paciente', 'Teléfono', 'Fecha Emisión', 'Fecha Vencimiento', 'Total', 'Pagado', 'Saldo', 'Estado'];
        const rows = filteredInvoices.map(inv => [
            inv.numeroFactura,
            inv.patient.nombre,
            inv.patient.telefono,
            new Date(inv.fechaEmision).toLocaleDateString('es-NI'),
            new Date(inv.fechaVencimiento).toLocaleDateString('es-NI'),
            inv.total.toFixed(2),
            inv.pagado.toFixed(2),
            inv.saldo.toFixed(2),
            inv.estado
        ]);
        downloadCSV([headers, ...rows], `facturas-${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600 font-medium">Total Pendiente</p>
                            <p className="text-2xl font-bold text-yellow-800 mt-1">
                                {formatCurrency(totalPendiente)}
                            </p>
                        </div>
                        <DollarSign className="text-yellow-500" size={32} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600 font-medium">Facturas Vencidas</p>
                            <p className="text-2xl font-bold text-red-800 mt-1">
                                {formatCurrency(totalVencidas)}
                            </p>
                        </div>
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600 font-medium">Cobrado Este Mes</p>
                            <p className="text-2xl font-bold text-green-800 mt-1">
                                {formatCurrency(totalCobradoMes)}
                            </p>
                        </div>
                        <FileText className="text-green-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all'
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilter('Pendiente')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'Pendiente'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setFilter('Pagada')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'Pagada'
                                    ? 'bg-green-500 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            Pagadas
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar factura o paciente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        <button
                            onClick={handleExportCSV}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                            title="Exportar facturas visibles a CSV"
                        >
                            <Download size={18} />
                            CSV
                        </button>
                        <button
                            onClick={onCreateInvoice}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus size={18} />
                            Nueva Factura
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Cargando facturas...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <FileText className="mx-auto text-slate-300 mb-3" size={48} />
                        <p>No hay facturas para mostrar</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Factura</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Paciente</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Emisión</th>
                                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Vencimiento</th>
                                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total</th>
                                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Pagado</th>
                                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Saldo</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Estado</th>
                                    <th className="text-center py-3 px-4 font-semibold text-slate-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((invoice) => (
                                    <tr
                                        key={invoice.id}
                                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                                    >
                                        <td className="py-3 px-4 font-mono text-sm text-brand-600 font-medium">
                                            {invoice.numeroFactura}
                                        </td>
                                        <td className="py-3 px-4 text-slate-700">
                                            {invoice.patient.nombre}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 text-sm">
                                            {formatDate(invoice.fechaEmision)}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 text-sm">
                                            {formatDate(invoice.fechaVencimiento)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-green-600">
                                            {formatCurrency(invoice.pagado)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-red-600">
                                            {formatCurrency(invoice.saldo)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {getEstadoBadge(invoice)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button
                                                onClick={() => onViewInvoice(invoice)}
                                                className="text-brand-600 hover:text-brand-700 font-medium text-sm"
                                            >
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
