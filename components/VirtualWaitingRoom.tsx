import React, { useState, useEffect } from 'react';
import { Camera, Mic, Video, VideoOff, MicOff, Monitor, Lock, AlertCircle, Phone, Clock, Calendar, Heart, Loader2, CheckCircle, ArrowLeft, Send } from 'lucide-react';

interface Props {
    onJoinSession: (roomName: string, displayName: string) => void;
    patientName: string;
}

interface AvailabilitySlot {
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const VirtualWaitingRoom: React.FC<Props> = ({ onJoinSession, patientName }) => {
    const [mode, setMode] = useState<'select' | 'request' | 'join'>('select');

    // Join mode state
    const [name, setName] = useState(patientName);
    const [code, setCode] = useState('');
    const [joinError, setJoinError] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Request mode state
    const [reqName, setReqName] = useState('');
    const [reqPhone, setReqPhone] = useState('');
    const [reqDate, setReqDate] = useState('');
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
    const [isRequesting, setIsRequesting] = useState(false);
    const [requestSent, setRequestSent] = useState(false);

    // Camera preview
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [permissionError, setPermissionError] = useState(false);

    useEffect(() => {
        fetchAvailability();
    }, []);

    useEffect(() => {
        if (mode === 'join') {
            startCamera();
            return () => {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }
            };
        }
    }, [mode]);

    const fetchAvailability = async () => {
        try {
            const res = await fetch('/api/telmed/availability');
            if (res.ok) setAvailability(await res.json());
        } catch (e) { console.error(e); }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(mediaStream);
            setPermissionError(false);
            const videoElement = document.getElementById('preview-video') as HTMLVideoElement;
            if (videoElement) videoElement.srcObject = mediaStream;
        } catch (err) {
            console.error("Error accessing media devices", err);
            setPermissionError(true);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => track.enabled = !isVideoOn);
            setIsVideoOn(!isVideoOn);
        }
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => track.enabled = !isMicOn);
            setIsMicOn(!isMicOn);
        }
    };

    const handleJoin = async () => {
        if (!code.trim()) {
            setJoinError('Ingresa tu código de sesión');
            return;
        }
        setIsJoining(true);
        setJoinError('');

        try {
            const res = await fetch('/api/virtual-sessions/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo: code.trim() })
            });

            const data = await res.json();

            if (!res.ok) {
                setJoinError(data.error || 'Error al validar el código');
                setIsJoining(false);
                return;
            }

            // Stop camera preview before joining Jitsi
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            onJoinSession(data.roomName, name || data.nombrePaciente || 'Paciente');
        } catch (err) {
            setJoinError('Error de conexión. Intenta de nuevo.');
            setIsJoining(false);
        }
    };

    const handleRequest = async () => {
        if (!reqName || !reqPhone || !reqDate) return;
        setIsRequesting(true);

        try {
            const res = await fetch('/api/virtual-sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombrePaciente: reqName,
                    telefono: reqPhone,
                    fechaHora: reqDate
                })
            });

            if (res.ok) {
                setRequestSent(true);
            } else {
                const data = await res.json();
                alert(data.error || 'Error al enviar solicitud');
            }
        } catch (err) {
            alert('Error de conexión');
        }
        setIsRequesting(false);
    };

    // ===== SELECT MODE (Landing) =====
    if (mode === 'select') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    {/* Empathetic Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-100 rounded-full mb-4">
                            <Heart className="text-brand-600" size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-3">Consultorio Virtual</h1>
                        <p className="text-lg text-slate-600 max-w-md mx-auto">
                            Estamos aquí para ayudarte. La atención psicológica está a un clic de distancia.
                        </p>
                    </div>

                    {/* Two Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Request Card */}
                        <button
                            onClick={() => setMode('request')}
                            className="bg-white rounded-2xl border-2 border-slate-200 p-8 text-left hover:border-brand-400 hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="bg-brand-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-200 transition">
                                <Calendar className="text-brand-600" size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Solicitar Teleconsulta</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Agenda una consulta virtual. Ve los horarios disponibles y solicita tu cita.
                            </p>
                            {availability.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                        Horarios disponibles
                                    </span>
                                </div>
                            )}
                        </button>

                        {/* Join Card */}
                        <button
                            onClick={() => setMode('join')}
                            className="bg-white rounded-2xl border-2 border-slate-200 p-8 text-left hover:border-brand-400 hover:shadow-xl transition-all duration-300 group"
                        >
                            <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
                                <Video className="text-blue-600" size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Ya tengo mi código</h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Si ya recibiste tu código de sesión, ingresa aquí para conectarte con tu terapeuta.
                            </p>
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <span className="text-xs font-semibold text-brand-600 flex items-center gap-1">
                                    <Lock size={12} />
                                    Conexión segura y encriptada
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Available Hours Preview */}
                    {availability.length > 0 && (
                        <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
                            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <Clock size={16} className="text-brand-600" />
                                Horarios de Atención Virtual
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {availability.map(slot => (
                                    <span key={slot.id} className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-sm font-medium">
                                        {DAYS[slot.dayOfWeek]} {slot.startTime} - {slot.endTime}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ===== REQUEST MODE =====
    if (mode === 'request') {
        if (requestSent) {
            return (
                <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-brand-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-10 text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="text-green-600" size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">¡Solicitud Enviada!</h2>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Hemos recibido tu solicitud. La Lic. García revisará tu caso y te enviará un código de acceso por WhatsApp.
                        </p>
                        <div className="bg-brand-50 rounded-xl p-4 mb-6 text-sm text-brand-700">
                            <strong>¿Necesitas ayuda urgente?</strong>
                            <br />
                            Llama al <a href="tel:+505XXXXXXXX" className="underline font-semibold">+505 XXXX-XXXX</a>
                        </div>
                        <button
                            onClick={() => { setMode('select'); setRequestSent(false); }}
                            className="text-brand-600 font-medium hover:text-brand-800"
                        >
                            ← Volver al inicio
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
                    {/* Header */}
                    <div className="bg-brand-600 p-6 text-white">
                        <button onClick={() => setMode('select')} className="text-brand-200 hover:text-white mb-3 flex items-center gap-1 text-sm">
                            <ArrowLeft size={16} /> Volver
                        </button>
                        <h2 className="text-xl font-bold">Solicitar Teleconsulta</h2>
                        <p className="text-brand-100 text-sm mt-1">Completa tus datos y te contactaremos pronto</p>
                    </div>

                    {/* Availability Display */}
                    {availability.length > 0 && (
                        <div className="px-6 pt-5">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Horarios Disponibles</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {availability.map(slot => (
                                    <span key={slot.id} className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full text-xs font-medium">
                                        {DAYS[slot.dayOfWeek]} {slot.startTime}-{slot.endTime}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Form */}
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tu Nombre Completo *</label>
                            <input
                                type="text"
                                value={reqName}
                                onChange={e => setReqName(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                placeholder="Ej. María López"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp *</label>
                            <input
                                type="tel"
                                value={reqPhone}
                                onChange={e => setReqPhone(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                placeholder="+505 8888-8888"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha y Hora Preferida *</label>
                            <input
                                type="datetime-local"
                                value={reqDate}
                                onChange={e => setReqDate(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                            />
                        </div>

                        <button
                            onClick={handleRequest}
                            disabled={!reqName || !reqPhone || !reqDate || isRequesting}
                            className="w-full bg-brand-600 text-white py-3.5 rounded-xl font-bold text-lg hover:bg-brand-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isRequesting ? (
                                <><Loader2 size={20} className="animate-spin" /> Enviando...</>
                            ) : (
                                <><Send size={20} /> Enviar Solicitud</>
                            )}
                        </button>

                        <p className="text-xs text-slate-400 text-center">
                            Tu información es confidencial y está protegida.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ===== JOIN MODE (with camera preview) =====
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row">
                {/* Left: Video Preview */}
                <div className="w-full md:w-2/3 bg-black relative aspect-video md:aspect-auto">
                    {!permissionError ? (
                        <video
                            id="preview-video"
                            autoPlay
                            muted
                            playsInline
                            className={`w-full h-full object-cover transform scale-x-[-1] ${!isVideoOn ? 'hidden' : ''}`}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                            <AlertCircle size={48} className="text-red-500 mb-4" />
                            <p className="text-lg font-semibold">No se pudo acceder a la cámara</p>
                            <p className="text-sm text-slate-400">Por favor permite el acceso en tu navegador.</p>
                        </div>
                    )}

                    {!isVideoOn && !permissionError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                                <span className="text-3xl font-bold text-white">{name.charAt(0) || '?'}</span>
                            </div>
                        </div>
                    )}

                    {/* Controls Overlay */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                        <button
                            onClick={toggleMic}
                            className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-slate-700/80 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                        >
                            {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`p-4 rounded-full transition-all ${isVideoOn ? 'bg-slate-700/80 hover:bg-slate-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                        >
                            {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
                        </button>
                    </div>
                </div>

                {/* Right: Join Info */}
                <div className="w-full md:w-1/3 p-8 flex flex-col justify-between bg-white overflow-y-auto">
                    <div>
                        <button
                            onClick={() => {
                                if (stream) stream.getTracks().forEach(t => t.stop());
                                setMode('select');
                            }}
                            className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1"
                        >
                            <ArrowLeft size={14} /> Volver
                        </button>

                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-sm font-medium text-green-600">Sistema listo</span>
                        </div>

                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Ingresar a Sesión</h1>
                        <p className="text-slate-500 mb-6">Ingresa tu código para conectarte.</p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tu Nombre</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                    placeholder="Ej. Juan Pérez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Código de Sesión</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none uppercase tracking-widest font-mono text-center text-lg"
                                    placeholder="VS-XXXXXX"
                                    maxLength={9}
                                />
                            </div>

                            {joinError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-700">{joinError}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <Lock size={14} className="text-brand-600" />
                                <span>Encriptación de extremo a extremo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Monitor size={14} className="text-brand-600" />
                                <span>Calidad HD habilitada</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button
                            onClick={handleJoin}
                            disabled={!name || !code || isJoining}
                            className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isJoining ? (
                                <><Loader2 size={24} className="animate-spin" /> Conectando...</>
                            ) : (
                                <><Video size={24} /> Entrar a Consulta</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
