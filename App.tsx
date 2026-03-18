import React, { useState } from 'react';
import { Menu, X, Instagram, Facebook, Phone, MapPin, ExternalLink, Lock, Share2, Mail, Check, Copy, MessageCircle, Video } from 'lucide-react';
import { ChatWidget } from './components/ChatWidget';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginPage } from './components/LoginPage';
import { BookingModal } from './components/BookingModal';
import { VirtualWaitingRoom } from './components/VirtualWaitingRoom';
import { JitsiMeetComponent } from './components/JitsiMeetComponent';
import { PatientPortal } from './components/PatientPortal';
import { useAuth } from './hooks/useAuth';
import { SERVICES_LIST, CONTACT_INFO } from './constants';
import { ViewState } from './types';

function App() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Share Modal State ---
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // --- Booking Modal State ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // --- Virtual Room / Jitsi State ---
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [jitsiDisplayName, setJitsiDisplayName] = useState('');

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = "Te recomiendo este consultorio psicológico: Bienestar Integral";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Si no está autenticado y intenta acceder a admin, mostrar login
  if (!isAuthenticated && currentView === 'admin') {
    return <LoginPage onLoginSuccess={(token, user) => {
      login(token, user);
      setCurrentView('admin');
    }} />;
  }

  // --- Landing Page Layout Components ---

  const Navbar = () => (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center gap-2">
            {/* Logo Placeholder */}
            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-brand-200 shadow-lg">
              B
            </div>
            <div>
              <span className="block text-lg font-bold text-brand-900 leading-none">Bienestar Integral</span>
              <span className="block text-xs text-slate-500 font-medium">Consultorio Psicológico</span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">Inicio</a>
            <a href="#sobre-mi" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">Sobre Mí</a>
            <a href="#servicios" className="text-slate-600 hover:text-brand-600 font-medium transition-colors">Servicios</a>
            <button
              onClick={() => setCurrentView('virtual-room')}
              className="text-brand-600 hover:text-brand-800 font-medium transition-colors flex items-center gap-1"
            >
              <Video size={18} />
              Consultorio Virtual
            </button>
            <button
              onClick={() => setCurrentView('portal')}
              className="text-slate-600 hover:text-brand-600 font-medium transition-colors flex items-center gap-1"
            >
              <MessageCircle size={18} />
              Portal Paciente
            </button>
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="bg-brand-600 text-white px-5 py-2.5 rounded-full font-medium shadow-md hover:bg-brand-700 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Agendar Cita
            </button>
            <button onClick={() => setCurrentView('admin')} className="text-slate-400 hover:text-slate-600" title="Acceso Admin">
              <Lock size={18} />
            </button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-100">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <a
              href="#inicio"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-slate-700 font-medium"
            >
              Inicio
            </a>
            <a
              href="#sobre-mi"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-slate-700 font-medium"
            >
              Sobre Mí
            </a>
            <a
              href="#servicios"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block px-3 py-2 text-slate-700 font-medium"
            >
              Servicios
            </a>

            <button
              onClick={() => {
                setCurrentView('virtual-room');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-brand-600 font-medium hover:text-brand-800 transition-colors"
            >
              <Video size={18} /> Consultorio Virtual
            </button>
            <button
              onClick={() => {
                setCurrentView('portal');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-slate-600 font-medium hover:text-brand-600 transition-colors"
            >
              <MessageCircle size={18} /> Portal Paciente
            </button>

            {/* Admin Access Mobile */}
            <button
              onClick={() => {
                setCurrentView('admin');
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-slate-500 font-medium hover:text-brand-600 transition-colors"
            >
              <Lock size={18} /> Acceso Administrativo
            </button>

            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="w-full mt-4 bg-brand-600 text-white px-5 py-3 rounded-lg font-bold"
            >
              Agendar Cita
            </button>
          </div>
        </div>
      )}
    </nav>
  );

  const ShareModal = ({ onClose }: { onClose: () => void }) => {
    if (!isShareModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800">Compartir</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-1 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-full flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white transition-all">
                  <Phone size={24} className="rotate-90" />
                </div>
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">WhatsApp</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center group-hover:bg-[#1877F2] group-hover:text-white transition-all">
                  <Facebook size={24} />
                </div>
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Facebook</span>
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent("Consulta Psicológica Bienestar Integral")}&body=${encodeURIComponent(shareText + '\n\n' + shareUrl)}`}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-all">
                  <Mail size={24} />
                </div>
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">Email</span>
              </a>

              {/* Twitter/X Icon */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-12 h-12 bg-black/5 text-slate-800 rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </div>
                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">X</span>
              </a>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-sm font-medium text-slate-700 block">Copiar enlace</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${copySuccess ? 'bg-green-500 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
                    }`}
                >
                  {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  {copySuccess ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Hero = () => (
    <section id="inicio" className="relative pt-20 pb-32 overflow-hidden bg-brand-50">
      <div className="absolute inset-0 z-0 opacity-30 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-1.5 bg-brand-100 text-brand-700 rounded-full font-semibold text-sm mb-2">
              Salud Mental & Bienestar
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
              Brindando atención integral con <span className="text-brand-600 relative">
                modelos flexibles
                <svg className="absolute w-full h-3 -bottom-1 left-0 text-brand-300 -z-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                </svg>
              </span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
              Lic. Esmirna García. Espacio terapéutico profesional en Estelí y Matagalpa. Neuropsicología, terapia de lenguaje y consulta clínica para recuperar tu equilibrio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="bg-brand-600 text-white px-8 py-3.5 rounded-lg font-bold shadow-lg hover:bg-brand-700 transition-all"
              >
                Reserva tu Cita
              </button>
              <button className="bg-white text-slate-700 border border-slate-200 px-8 py-3.5 rounded-lg font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
                Conocer Más
              </button>
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="bg-white text-slate-700 border border-slate-200 px-4 py-3.5 rounded-lg font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                title="Compartir página"
                aria-label="Compartir"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
          <div className="relative">
            {/* Abstract organic shapes behind image */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-200/50 rounded-full blur-3xl -z-10"></div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white rotate-2 hover:rotate-0 transition-all duration-500">
              <img
                src="https://picsum.photos/600/700?grayscale"
                alt="Lic. Esmirna García Consultorio"
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 text-white">
                <p className="font-bold text-lg">Lic. Esmirna García</p>
                <p className="text-sm opacity-90">Psicóloga Clínica</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const About = () => (
    <section id="sobre-mi" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Experiencia y Profesionalismo</h2>
          <p className="text-slate-600 text-lg">
            Comprometida con la salud mental de Nicaragua, combinando la práctica clínica con la docencia universitaria.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-brand-700 mb-2">Formación Académica</h3>
            <p className="text-slate-600">Licenciada por la UNAN-Managua. Máster en Psicología Clínica y especializaciones en Neurodesarrollo.</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-brand-700 mb-2">Enfoque Integral</h3>
            <p className="text-slate-600">Abordaje biopsicosocial que integra al paciente en su contexto familiar y social para resultados sostenibles.</p>
          </div>
          <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-brand-700 mb-2">Ubicación</h3>
            <p className="text-slate-600">Atención presencial en clínicas equipadas en Estelí y Matagalpa. Modalidad virtual disponible.</p>
          </div>
        </div>
      </div>
    </section>
  );

  const Services = () => (
    <section id="servicios" className="py-24 bg-brand-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestros Servicios</h2>
            <p className="text-brand-100 text-lg">Soluciones terapéuticas adaptadas a cada etapa de la vida.</p>
          </div>
          <button className="hidden md:flex items-center gap-2 text-brand-200 hover:text-white transition-colors font-medium">
            Ver lista de precios <ExternalLink size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES_LIST.map((service, idx) => (
            <div key={idx} className="bg-brand-800 p-6 rounded-xl hover:bg-brand-700 transition-colors duration-300 group">
              <div className="mb-4 bg-brand-900 w-14 h-14 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                {service.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{service.title}</h3>
              <p className="text-brand-200 text-sm leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const Footer = () => (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white text-xl font-bold mb-4">Consultorio Bienestar Integral</h3>
            <p className="max-w-sm mb-6">Tu salud mental es nuestra prioridad. Agenda tu cita hoy y comienza el camino hacia el equilibrio emocional.</p>
            <div className="flex space-x-4">
              <a href="#" className="bg-slate-800 p-2 rounded-full hover:bg-brand-600 transition-colors text-white"><Instagram size={20} /></a>
              <a href="#" className="bg-slate-800 p-2 rounded-full hover:bg-brand-600 transition-colors text-white"><Facebook size={20} /></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Contacto</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2"><Phone size={16} className="text-brand-500" /> {CONTACT_INFO.phone}</li>
              {CONTACT_INFO.locations.map((loc, i) => (
                <li key={i} className="flex items-start gap-2"><MapPin size={16} className="text-brand-500 mt-1" /> {loc}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-brand-400">Política de Privacidad</a></li>
              <li><a href="#" className="hover:text-brand-400">Términos de Servicio</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Consultorio Bienestar Integral. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );

  // --- Main Render ---

  // --- Virtual Room State ---


  if (currentView === 'admin') {
    return (
      <div className="min-h-screen">
        {/* Logout + Back buttons */}
        <div className="fixed bottom-4 left-4 z-50 flex gap-2">
          <button
            onClick={() => {
              logout();
              setCurrentView('landing');
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
          >
            <Lock size={16} />
            Cerrar Sesión
          </button>
          <button
            onClick={() => setCurrentView('landing')}
            className="bg-slate-800 text-white px-4 py-2 rounded shadow-lg opacity-50 hover:opacity-100"
          >
            ← Volver al Sitio Web
          </button>
        </div>
        <AdminDashboard />
      </div>
    );
  }

  if (currentView === 'portal') {
    return <PatientPortal onBack={() => setCurrentView('landing')} />;
  }

  if (currentView === 'virtual-room') {
    if (activeRoom) {
      return (
        <JitsiMeetComponent
          roomName={activeRoom}
          displayName={jitsiDisplayName || 'Paciente'}
          onLeave={() => {
            setActiveRoom(null);
            setCurrentView('landing');
          }}
        />
      );
    }
    return (
      <div className="relative">
        <button
          onClick={() => setCurrentView('landing')}
          className="absolute top-4 left-4 z-50 bg-white/80 p-2 rounded-full hover:bg-white"
        >
          <X size={24} />
        </button>
        <VirtualWaitingRoom
          patientName="Invitado"
          onJoinSession={(room, name) => {
            setJitsiDisplayName(name); // Use the name from the waiting room
            setActiveRoom(room);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {currentView === 'landing' ? (
        <>
          <Navbar />
          <Hero />
          <Services />
          <About />
          <Footer />
          <ChatWidget onOpenBooking={() => setIsBookingModalOpen(true)} />

          {/* Share Modal */}
          {isShareModalOpen && (
            <ShareModal onClose={() => setIsShareModalOpen(false)} />
          )}
          {isBookingModalOpen && (
            <BookingModal onClose={() => setIsBookingModalOpen(false)} />
          )}
        </>
      ) : null}
    </div>
  );
}

export default App;