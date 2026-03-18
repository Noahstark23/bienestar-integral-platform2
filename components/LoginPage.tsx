import React, { useState } from 'react';
import { Lock, User, AlertCircle, Shield } from 'lucide-react';

interface LoginPageProps {
    onLoginSuccess: (token: string, user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 2FA state
    const [step, setStep] = useState<'credentials' | 'totp'>('credentials');
    const [tempToken, setTempToken] = useState('');
    const [totpCode, setTotpCode] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.requires2FA) {
                // Pasar al paso 2FA
                setTempToken(data.tempToken);
                setStep('totp');
            } else if (response.ok && data.success) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_user', JSON.stringify(data.user));
                onLoginSuccess(data.token, data.user);
            } else {
                setError(data.error || 'Error al iniciar sesión');
            }
        } catch (err) {
            console.error('Error de login:', err);
            setError('Error de conexión. Verifica que el servidor esté corriendo.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyTotp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/verify-2fa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tempToken, code: totpCode })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('auth_user', JSON.stringify(data.user));
                onLoginSuccess(data.token, data.user);
            } else {
                setError(data.error || 'Código incorrecto');
                setTotpCode('');
            }
        } catch (err) {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            {step === 'totp' ? <Shield className="text-blue-600" size={40} /> : <Lock className="text-blue-600" size={40} />}
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">Bienestar Integral</h1>
                        <p className="text-blue-100">{step === 'totp' ? 'Verificación en dos pasos' : 'Panel Administrativo'}</p>
                    </div>

                    {step === 'credentials' ? (
                        <form onSubmit={handleSubmit} className="p-8">
                            <div className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User className="text-gray-400" size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="lic.esmirna"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="text-gray-400" size={20} />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                                </button>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <p className="text-xs text-gray-500 text-center">
                                    🔐 Acceso protegido con cifrado de 256 bits
                                </p>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyTotp} className="p-8">
                            <div className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                )}

                                <div className="text-center text-slate-600 text-sm">
                                    <Shield size={32} className="text-blue-500 mx-auto mb-3" />
                                    <p>Ingresa el código de 6 dígitos de tu aplicación autenticadora (Google Authenticator, Authy, etc.).</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Código de verificación</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]{6}"
                                        maxLength={6}
                                        value={totpCode}
                                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full text-center text-3xl tracking-[0.5em] font-mono py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="000000"
                                        required
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || totpCode.length !== 6}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Verificando...' : 'Verificar'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setStep('credentials'); setTotpCode(''); setError(''); }}
                                    className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
                                >
                                    ← Volver al inicio de sesión
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-600">
                        NORTEX © 2026 - Sistema Clínico Seguro
                    </p>
                </div>
            </div>
        </div>
    );
};
