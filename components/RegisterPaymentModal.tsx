import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

interface Invoice {
    id: number;
    numeroFactura: string;
    saldo: number;
}

interface Props {
    invoice: Invoice;
    onClose: () => void;
    onSuccess: () => void;
}

export const RegisterPaymentModal: React.FC<Props> = ({ invoice, onClose, onSuccess }) => {
    const [monto, setMonto] = useState<string>('');
    const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
    const [referencia, setReferencia] = useState('');
    const [notas, setNotas] = useState('');
    const [loading, setLoading] = useState(false);

    const montoNum = parseFloat(monto) || 0;
    const nuevoSaldo = invoice.saldo - montoNum;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (montoNum <= 0) {
            alert('El monto debe ser mayor a cero');
            return;
        }

        if (montoNum > invoice.saldo) {
            alert('El monto no puede ser mayor al saldo pendiente');
            return;
        }

        setLoading(true);
        const getAuthHeaders = () => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        });

        try {
            const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    monto: montoNum,
                    metodoPago,
                    referencia,
                    notas
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
            console.error('Error al registrar pago:', error);
            alert('Error al registrar pago');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `C$ ${amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`;
    };

    const setMontoCompleto = () => {
        setMonto(invoice.saldo.toFixed(2));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="bg-green-600 text-white p-6 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Registrar Pago</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-green-100 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="space-y-5">
                        {/* Info de Factura */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <p className="text-sm text-slate-600 mb-1">Factura</p>
                            <p className="text-lg font-bold text-slate-800 mb-2">{invoice.numeroFactura}</p>
                            <p className="text-sm text-slate-600">Saldo pendiente:</p>
                            <p className="text-2xl font-bold text-red-600">{formatCurrency(invoice.saldo)}</p>
                        </div>

                        {/* Monto */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Monto a Pagar *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">
                                    C$
                                </span>
                                <input
                                    type="number"
                                    min="0.01"
                                    max={invoice.saldo}
                                    step="0.01"
                                    value={monto}
                                    onChange={(e) => setMonto(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg font-medium"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <button
                                type="button"
                                onClick={setMontoCompleto}
                                className="text-sm text-green-600 hover:text-green-700 font-medium mt-1"
                            >
                                Pagar monto completo
                            </button>
                        </div>

                        {/* Método de Pago */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Método de Pago *
                            </label>
                            <select
                                value={metodoPago}
                                onChange={(e) => setMetodoPago(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 "
                                required
                            >
                                <option value="Efectivo">Efectivo</option>
                                <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                                <option value="Transferencia">Transferencia Bancaria</option>
                                <option value="Sinpe">Sinpe Móvil</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>

                        {/* Referencia */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Referencia/Comprobante{' '}
                                <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <input
                                type="text"
                                value={referencia}
                                onChange={(e) => setReferencia(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="# de transacción, # de cheque, etc."
                            />
                        </div>

                        {/* Notas */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Notas{' '}
                                <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <textarea
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Observaciones sobre este pago..."
                            />
                        </div>

                        {/* Preview */}
                        {montoNum > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-green-700">Nuevo saldo:</span>
                                    <span className={`text-xl font-bold ${nuevoSaldo === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                        {formatCurrency(nuevoSaldo)}
                                    </span>
                                </div>
                                {nuevoSaldo === 0 && (
                                    <p className="text-sm text-green-600 font-medium">
                                        ✓ La factura quedará totalmente pagada
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || montoNum <= 0}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <DollarSign size={18} />
                            {loading ? 'Registrando...' : 'Registrar Pago'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
