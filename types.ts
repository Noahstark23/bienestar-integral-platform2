import React from 'react';

// Equivalente al Prisma Schema solicitado
// Se usa aquí como interfaces de TypeScript para el frontend

export interface Patient {
  id: number;
  nombre: string;
  edad: number;
  telefono: string;
  motivo: string;

  // Nuevos campos demográficos
  ocupacion?: string;
  estadoCivil?: string;
  escolaridad?: string;
  fechaNacimiento?: string;
  tutorNombre?: string;
  tutorRelacion?: string;

  // Fase del proceso clínico
  faseProceso?: string; // EvaluacionInicial | Procesamiento | Perfil | Plan | Devolucion | Intervencion | Seguimiento | Alta

  createdAt: string; // DateTime string ISO
  clinicalRecord?: ClinicalRecord;
  sessions?: Session[];
}

export interface ClinicalRecord {
  id: number;
  patientId: number;
  antecedentesMedicos: string;
  antecedentesFamiliares: string;
  historiaDesarrollo: string;
  diagnostico: string;
  // Integración del proceso clínico
  analisisPruebas?: string;
  perfilClinico?: string;
  planIntervencion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: number;
  patientId: number;
  patientName?: string; // Joined for UI convenience
  fecha: string;
  notas: string;
  pago: number; // Decimal in Prisma
  estadoPago: 'Pendiente' | 'Pagado';
  tipo?: string; // 'Evaluacion' | 'Terapia' | 'Orientacion'
  resumen?: string; // SOAP notes
  categoria?: 'Registro' | 'Seguimiento';
  objetivoTrabajado?: string;
  tecnicas?: string;
}

export interface ClinicalDocumentSection {
  heading: string;
  lines: string[];
}

export interface ClinicalDocument {
  tipo: string;
  titulo: string;
  paciente: { id: number; nombre: string };
  fecha: string;
  profesional: { nombre: string; codigoMinsa: string; consultorio: string };
  secciones: ClinicalDocumentSection[];
  texto: string;
}

export interface Expense {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
  categoria: 'Fijo' | 'Variable';
}

export interface Appointment {
  id: number;
  nombrePaciente: string;
  telefono: string;
  email: string;
  motivo: string;
  fechaHora: string;
  estado: 'Pendiente' | 'Confirmada' | 'Cancelada';
  createdAt: string;
}

// UI specific types
export interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export type ViewState = 'landing' | 'admin' | 'virtual-room' | 'portal';
export type AdminTab = 'dashboard' | 'patients' | 'calendar' | 'solicitudes' | 'billing' | 'workshops' | 'teleconsultas' | 'config';