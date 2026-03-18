import React, { useState } from 'react';
import { X, DollarSign, Calendar, User, FileText, CreditCard, Download, Trash2, Plus } from 'lucide-react';

interface Invoice {
    id: number;
    numeroFactura: string;
    patient: {
        id: number;
        nombre: string;
        telefono: string;
    };
    sessions: Array<{
        monto: number;
        session: {
            id: number;
            fecha: string;
            tipo: string;
        };
    }>;
    workshops?: Array<{
        monto: number;
        enrollment: {
            workshop: {
                titulo: string;
            };
            fechaInscripcion: string;
        };
    }>;
    items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
    }>;
    payments: Array<{
        id: number;
        monto: number;
        metodoPago: string;
        referencia: string;
        fechaPago: string;
        notas: string;
    }>;
    subtotal: number;
    descuento: number;
    iva: number;
    total: number;
    pagado: number;
    saldo: number;
    fechaEmision: string;
    fechaVencimiento: string;
    estado: string;
    notas: string;
}

interface Props {
    invoice: Invoice;
    onClose: () => void;
    onUpdate: () => void;
    onRegisterPayment: (invoice: Invoice) => void;
}

export const InvoiceDetails: React.FC<Props> = ({ invoice, onClose, onUpdate, onRegisterPayment }) => {
    const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);

    const formatCurrency = (amount: number) => {
        return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-NI', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-NI', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDeletePayment = async (paymentId: number) => {
        if (!confirm('¿Estás seguro de eliminar este pago? Esta acción restaurará el saldo pendiente.')) {
            return;
        }

        setDeletingPaymentId(paymentId);
        try {
            const res = await fetch(`/api/payments/${paymentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                onUpdate();
            } else {
                const error = await res.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error('Error al eliminar pago:', error);
            alert('Error al eliminar pago');
        } finally {
            setDeletingPaymentId(null);
        }
    };

    const getEstadoBadge = () => {
        if (invoice.estado === 'Pagada') {
            return <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">Pagada</span>;
        }

        const vencida = new Date(invoice.fechaVencimiento) < new Date();
        if (vencida) {
            return <span className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-700">Vencida</span>;
        }

        return <span className="px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">Pendiente</span>;
    };

    const handleDownloadPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;

            const doc = new jsPDF();

            // ... Header and Info ...
            // Colors
            const brandColor = [79, 70, 229]; // Indigo-600

            // Header
            doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
            doc.rect(0, 0, 210, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text("Bienestar Integral", 14, 25);
            doc.setFontSize(12);
            doc.text("Consultorio Psicológico", 14, 32);

            // Invoke Info Right
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.text("FACTURA", 150, 20);
            doc.setFontSize(10);
            doc.text(`# ${invoice.numeroFactura}`, 150, 26);
            doc.text(`Fecha: ${formatDate(invoice.fechaEmision)}`, 150, 32);

            // Patient & Clinic Details
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(11);

            // Left Column (Patient)
            doc.text("Facturado a:", 14, 55);
            doc.setFontSize(12);
            doc.text(invoice.patient.nombre, 14, 62);
            doc.setFontSize(10);
            doc.text(`Tel: ${invoice.patient.telefono}`, 14, 68);

            // Right Column (Status)
            doc.text("Estado:", 150, 55);
            doc.setTextColor(invoice.estado === 'Pagada' ? 22 : 200, invoice.estado === 'Pagada' ? 163 : 50, 77);
            doc.text(invoice.estado.toUpperCase(), 150, 62);
            doc.setTextColor(50, 50, 50); // Reset

            // Prepare Table Rows
            const tableRows = [];

            // Sessions
            if (invoice.sessions) {
                invoice.sessions.forEach(item => {
                    tableRows.push([
                        `Sesión: ${item.session.tipo}`,
                        formatDate(item.session.fecha),
                        `C$ ${item.monto.toFixed(2)}`
                    ]);
                });
            }

            // Workshops
            if (invoice.workshops) {
                invoice.workshops.forEach(item => {
                    tableRows.push([
                        `Taller: ${item.enrollment.workshop.titulo}`,
                        formatDate(item.enrollment.fechaInscripcion),
                        `C$ ${item.monto.toFixed(2)}`
                    ]);
                });
            }

            // Custom Items
            if (invoice.items) {
                invoice.items.forEach(item => {
                    tableRows.push([
                        `${item.description} (x${item.quantity})`,
                        '-',
                        `C$ ${item.amount.toFixed(2)}`
                    ]);
                });
            }

            const tableColumn = ["Descripción", "Fecha", "Monto"];

            autoTable(doc, {
                startY: 80,
                head: [tableColumn],
                body: tableRows,
                headStyles: { fillColor: brandColor },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { top: 80 },
            });

            // ... Totals ...
            // @ts-ignore
            const finalY = doc.lastAutoTable.finalY + 10;
            // ... (rest of PDF gen)

            doc.text("Subtotal:", 140, finalY);
            doc.text(`C$ ${invoice.subtotal.toFixed(2)}`, 170, finalY);

            if (invoice.descuento > 0) {
                doc.text("Descuento:", 140, finalY + 6);
                doc.setTextColor(220, 50, 50);
                doc.text(`- C$ ${invoice.descuento.toFixed(2)}`, 170, finalY + 6);
                doc.setTextColor(50, 50, 50);
            }

            doc.text("IVA (15%):", 140, finalY + 12);
            doc.text(`C$ ${invoice.iva.toFixed(2)}`, 170, finalY + 12);

            doc.setFontSize(14);
            doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
            doc.text("TOTAL:", 140, finalY + 22);
            doc.text(`C$ ${invoice.total.toFixed(2)}`, 170, finalY + 22);

            // Footer / Notes
            if (invoice.notas) {
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text("Notas:", 14, finalY + 35);
                doc.text(invoice.notas, 14, finalY + 40);
            }

            doc.save(`Factura-${invoice.numeroFactura}.pdf`);
        } catch (error) {
            console.error("Error generating PDF", error);
            alert("Error al generar PDF");
        }
    };

    // ... UI Rendering changes ...

    // ... UI Rendering changes ... included below

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
                {/* Header */}
                <div className="bg-brand-600 text-white p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">{invoice.numeroFactura}</h2>
                        <p className="text-brand-100">Factura de servicios clínicos</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {getEstadoBadge()}
                        <button
                            onClick={onClose}
                            className="text-white hover:text-brand-100 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Información del Paciente */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <User className="text-brand-600" size={20} />
                                <h3 className="font-semibold text-slate-800">Paciente</h3>
                            </div>
                            <p className="text-lg font-medium text-slate-900">{invoice.patient.nombre}</p>
                            <p className="text-sm text-slate-600">{invoice.patient.telefono}</p>
                        </div>

                        {/* Fechas */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="text-brand-600" size={20} />
                                <h3 className="font-semibold text-slate-800">Fechas</h3>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm">
                                    <span className="text-slate-600">Emisión:</span>{' '}
                                    <span className="font-medium text-slate-900">{formatDate(invoice.fechaEmision)}</span>
                                </p>
                                <p className="text-sm">
                                    <span className="text-slate-600">Vencimiento:</span>{' '}
                                    <span className="font-medium text-slate-900">{formatDate(invoice.fechaVencimiento)}</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Detalle de Servicios */}
                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <FileText size={20} className="text-brand-600" />
                            Detalle de Servicios
                        </h3>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Descripción</th>
                                        <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Fecha</th>
                                        <th className="text-right py-2 px-4 text-sm font-semibold text-slate-700">Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.sessions.map((item, idx) => (
                                        <tr key={`s-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td className="py-2 px-4 text-sm text-slate-700">
                                                <span className="block font-medium">Sesión: {item.session.tipo}</span>
                                            </td>
                                            <td className="py-2 px-4 text-sm text-slate-600">
                                                {formatDate(item.session.fecha)}
                                            </td>
                                            <td className="py-2 px-4 text-sm text-right font-medium text-slate-700">
                                                {formatCurrency(item.monto)}
                                            </td>
                                        </tr>
                                    ))}
                                    {invoice.workshops?.map((item, idx) => (
                                        <tr key={`w-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td className="py-2 px-4 text-sm text-slate-700">
                                                <span className="block font-medium">Taller: {item.enrollment.workshop.titulo}</span>
                                            </td>
                                            <td className="py-2 px-4 text-sm text-slate-600">
                                                {formatDate(item.enrollment.fechaInscripcion)}
                                            </td>
                                            <td className="py-2 px-4 text-sm text-right font-medium text-slate-700">
                                                {formatCurrency(item.monto)}
                                            </td>
                                        </tr>
                                    ))}
                                    {invoice.items?.map((item, idx) => (
                                        <tr key={`i-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td className="py-2 px-4 text-sm text-slate-700">
                                                <span className="block font-medium">{item.description}</span>
                                                {item.quantity > 1 && <span className="text-xs text-slate-500">Cantidad: {item.quantity} x {formatCurrency(item.unitPrice)}</span>}
                                            </td>
                                            <td className="py-2 px-4 text-sm text-slate-600">-</td>
                                            <td className="py-2 px-4 text-sm text-right font-medium text-slate-700">
                                                {formatCurrency(item.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Resumen Financiero */}
                    <div className="bg-gradient-to-br from-blue-50 to-brand-50 p-6 rounded-lg border border-brand-200 mb-6">
                        <h3 className="font-semibold text-slate-800 mb-4">Resumen Financiero</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Subtotal ({invoice.sessions.length} sesiones):</span>
                                <span className="font-medium text-slate-900">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            {invoice.descuento > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Descuento:</span>
                                    <span className="font-medium text-red-600">- {formatCurrency(invoice.descuento)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-600">IVA (15%):</span>
                                <span className="font-medium text-slate-900">{formatCurrency(invoice.iva)}</span>
                            </div>
                            <div className="border-t border-brand-300 pt-3 flex justify-between">
                                <span className="font-bold text-slate-800">TOTAL:</span>
                                <span className="font-bold text-xl text-brand-600">{formatCurrency(invoice.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Pagado:</span>
                                <span className="font-medium text-green-600">{formatCurrency(invoice.pagado)}</span>
                            </div>
                            <div className="border-t border-brand-300 pt-3 flex justify-between">
                                <span className="font-bold text-slate-800">SALDO PENDIENTE:</span>
                                <span className="font-bold text-2xl text-red-600">{formatCurrency(invoice.saldo)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Historial de Pagos */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <CreditCard size={20} className="text-brand-600" />
                                Historial de Pagos ({invoice.payments.length})
                            </h3>
                            {invoice.saldo > 0 && (
                                <button
                                    onClick={() => onRegisterPayment(invoice)}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Registrar Pago
                                </button>
                            )}
                        </div>

                        {invoice.payments.length === 0 ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-500">
                                No hay pagos registrados
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Fecha</th>
                                            <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Método</th>
                                            <th className="text-left py-2 px-4 text-sm font-semibold text-slate-700">Referencia</th>
                                            <th className="text-right py-2 px-4 text-sm font-semibold text-slate-700">Monto</th>
                                            <th className="text-center py-2 px-4 text-sm font-semibold text-slate-700">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.payments.map((payment) => (
                                            <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-2 px-4 text-sm text-slate-700">
                                                    {formatDateTime(payment.fechaPago)}
                                                </td>
                                                <td className="py-2 px-4">
                                                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-medium">
                                                        {payment.metodoPago}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-4 text-sm text-slate-600">
                                                    {payment.referencia || '-'}
                                                </td>
                                                <td className="py-2 px-4 text-sm text-right font-medium text-green-600">
                                                    {formatCurrency(payment.monto)}
                                                </td>
                                                <td className="py-2 px-4 text-center">
                                                    <button
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                        disabled={deletingPaymentId === payment.id}
                                                        className="text-red-600 hover:text-red-700 disabled:opacity-50"
                                                        title="Eliminar pago"
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

                    {/* Notas */}
                    {invoice.notas && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-semibold text-yellow-900 mb-2">Notas:</h4>
                            <p className="text-sm text-yellow-800">{invoice.notas}</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-slate-50 border-t border-slate-200 p-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                    >
                        Cerrar
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex-1 bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download size={18} />
                        Descargar PDF
                    </button>
                </div>
            </div>
        </div>
    );
};
