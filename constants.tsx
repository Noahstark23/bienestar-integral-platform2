import { Patient, Session, Expense } from './types';
import { Brain, MessageCircle, BookOpen, Users, Video, GraduationCap } from 'lucide-react';
import React from 'react';

// --- Static Content ---

export const CONTACT_INFO = {
  phone: "87171712",
  socials: {
    facebook: "#",
    instagram: "#",
    tiktok: "#"
  },
  locations: ["Estelí, Nicaragua", "Matagalpa, Nicaragua"]
};

export const SERVICES_LIST = [
  {
    title: "Consulta Psicológica",
    description: "Espacio seguro para abordar ansiedad, depresión y manejo emocional.",
    icon: <Users className="w-8 h-8 text-brand-600" />
  },
  {
    title: "Consulta Online",
    description: "Atención profesional desde la comodidad de tu hogar vía videollamada segura.",
    icon: <Video className="w-8 h-8 text-brand-600" />
  },
  {
    title: "Neuropsicología",
    description: "Evaluación y rehabilitación de funciones cognitivas y procesos mentales.",
    icon: <Brain className="w-8 h-8 text-brand-600" />
  },
  {
    title: "Terapia de Lenguaje",
    description: "Intervención especializada para dificultades en la comunicación y el habla.",
    icon: <MessageCircle className="w-8 h-8 text-brand-600" />
  },
  {
    title: "Talleres y Cursos",
    description: "Espacios de aprendizaje grupal sobre bienestar, crianza y salud mental.",
    icon: <GraduationCap className="w-8 h-8 text-brand-600" />
  },
  {
    title: "Orientación Vocacional",
    description: "Guía profesional para la toma de decisiones académicas y de carrera.",
    icon: <BookOpen className="w-8 h-8 text-brand-600" />
  }
];

// --- Mock Database (Simulating Prisma Query Results) ---

export const MOCK_PATIENTS: Patient[] = [
  { id: 1, nombre: "Juan Pérez", edad: 25, telefono: "8888-8888", motivo: "Ansiedad Generalizada", createdAt: "2023-10-15T00:00:00Z" },
  { id: 2, nombre: "María González", edad: 32, telefono: "8899-7766", motivo: "Terapia de Pareja", createdAt: "2023-11-01T00:00:00Z" },
  { id: 3, nombre: "Carlitos Ruiz", edad: 8, telefono: "Madre: 8877-6655", motivo: "Dificultad de Aprendizaje", createdAt: "2024-01-10T00:00:00Z" },
];

export const MOCK_SESSIONS: Session[] = [
  { id: 101, patientId: 1, patientName: "Juan Pérez", fecha: "2024-05-01", notas: "Paciente reporta mejoría en el sueño.", pago: 40, estadoPago: "Pagado" },
  { id: 102, patientId: 2, patientName: "María González", fecha: "2024-05-02", notas: "Sesión focalizada en comunicación asertiva.", pago: 50, estadoPago: "Pagado" },
  { id: 103, patientId: 3, patientName: "Carlitos Ruiz", fecha: "2024-05-03", notas: "Evaluación neuropsicológica inicial completa.", pago: 60, estadoPago: "Pendiente" },
  { id: 104, patientId: 1, patientName: "Juan Pérez", fecha: "2024-05-10", notas: "Recaída leve por estrés laboral.", pago: 40, estadoPago: "Pagado" },
  { id: 105, patientId: 2, patientName: "María González", fecha: "2024-05-12", notas: "Cancelada por el paciente.", pago: 0, estadoPago: "Pendiente" },
];

export const MOCK_EXPENSES: Expense[] = [
  { id: 1, concepto: "Renta Consultorio Estelí", monto: 200, fecha: "2024-05-01", categoria: "Fijo" },
  { id: 2, concepto: "Internet & Servicios", monto: 40, fecha: "2024-05-05", categoria: "Fijo" },
  { id: 3, concepto: "Material Didáctico Niños", monto: 35, fecha: "2024-05-10", categoria: "Variable" },
  { id: 4, concepto: "Publicidad Facebook", monto: 20, fecha: "2024-05-15", categoria: "Variable" },
];