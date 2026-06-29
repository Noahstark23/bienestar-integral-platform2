# Manual del Sistema — Consultorio Psicológico Bienestar Integral

Plataforma web integral para la práctica clínica de la **Lic. Esmirna Isabel García Hernández**.
Incluye sitio público, agenda en línea, expediente clínico, facturación, telemedicina,
talleres, asistente con IA (Isabel) y generación de documentos.

> **Sitio:** psicoisabel.com · **Profesional:** Lic. Esmirna García — Cód. MINSA 89952 · **Contacto:** 87171412

---

## 1. Sitio público (landing)
Lo que ve cualquier visitante en psicoisabel.com:
- Presentación profesional: inicio, "Sobre mí", servicios, galería de fotos.
- **Reserva de cita en línea** en 3 pasos: datos del paciente → selección de fecha/hora (según disponibilidad real) → confirmación.
- Accesos directos a **WhatsApp** y contacto.
- **Chat público** (burbuja) con IA para responder dudas de visitantes.
- Botón discreto de **acceso administrativo** (para la psicóloga).
- Optimizado para buscadores (SEO, sitemap, datos estructurados de "clínica médica").

## 2. Acceso y seguridad
- **Inicio de sesión** con usuario y contraseña (contraseñas cifradas con bcrypt).
- **Autenticación en dos pasos (2FA)** opcional con app tipo Google Authenticator (TOTP).
- Sesión protegida con **JWT**.
- **Límite de peticiones** (anti-abuso) y cabeceras de seguridad.
- **Registro de auditoría**: queda traza de acciones importantes (crear/editar/eliminar pacientes, facturas, sesiones, etc.).

## 3. Agenda y disponibilidad
- **Calendario** de citas y sesiones.
- **Gestión de disponibilidad**: define los días y horas en que atiendes (presencial).
- **Disponibilidad para telemedicina** por separado.
- Las reservas en línea solo ofrecen los horarios libres que configures.
- **Solicitudes de cita**: las que llegan del sitio quedan como "Pendiente" para que las confirmes o canceles.

## 4. Pacientes y expediente clínico
Cada paciente tiene un **expediente** con varias pestañas:

- **General**: datos demográficos (edad, teléfono, ocupación, escolaridad, estado civil, fecha de nacimiento), motivo de consulta, tutor/guardián (para menores), fecha de registro.
- **Clínica (Anamnesis)**: antecedentes médicos, antecedentes familiares, historia del desarrollo y diagnóstico (DSM-5 / CIE-10).
- **Plan** *(nuevo)*: análisis de resultados de pruebas, **perfil clínico**, **plan de intervención** y la **fase del proceso** del paciente.
- **Historial**: línea de tiempo de todas las sesiones con **notas SOAP** (Subjetivo, Objetivo, Análisis, Plan), editables.
- **Objetivos**: metas terapéuticas con estado (Pendiente / En progreso / Logrado / Abandonado), progreso y fechas.
- **Documentos** *(nuevo)*: genera y descarga en PDF los documentos del paciente (ver sección 8).
- **Paquetes**: paquetes de sesiones (ej. "10 sesiones"), con control de usadas/restantes.
- **Escalas**: aplicación de pruebas psicológicas (ver sección 6).

Además: **alta del paciente** (con motivo), estados Activo / En pausa / Alta, e historial de pagos.

## 5. Proceso clínico (la forma de trabajar de la Lic. Esmirna)
El sistema refleja tu flujo de trabajo y la fase de cada paciente:
1. **Evaluación inicial** — entrevista, historia clínica, consentimiento, motivo, antecedentes; si hay tiempo, pruebas.
2. **Procesamiento de resultados** — calificación, corrección e integración de pruebas.
3. **Perfil clínico** — triangulación de la información.
4. **Plan de intervención** — priorización de problemáticas, objetivos jerárquicos, enfoques y técnicas.
5. **Devolución (3ª sesión)** — presentación de resultados, perfil y plan; acuerdos.
6. **Intervención** — trabajo por objetivos; cada sesión va en el **Registro de sesiones**.
7. **Alta / cierre**.
8. **Seguimiento** — tras el alta, las sesiones de mantenimiento se marcan como **"Seguimiento"**, separadas del registro.

## 6. Pruebas psicológicas (escalas)
- Aplicación de escalas **PHQ-9** (depresión) y **GAD-7** (ansiedad).
- Cálculo automático de puntaje e **interpretación** (Mínimo / Leve / Moderado / Moderado-Severo / Severo).
- Las evaluaciones quedan guardadas y fechadas en el expediente, vinculables a una sesión.

## 7. Isabel — Asistente con Inteligencia Artificial
Secretaria virtual con IA (Google Gemini) disponible en el panel admin. Puede:
- **Resumir el día**: citas, sesiones registradas, solicitudes pendientes, facturas vencidas.
- **Crear citas**, **confirmar/cancelar** citas.
- **Registrar sesiones** (con nota clínica y pago).
- **Crear pacientes** y **agregar objetivos** terapéuticos.
- **Ver el historial** completo de un paciente.
- **Responder sobre tu proceso clínico, protocolos y plantillas** (gracias al RAG, ver sección 9).
- **Generar documentos** de un paciente y **actualizar** perfil/plan/fase.

> Isabel necesita una API de Gemini con cuota activa (facturación) para conversar.

## 8. Generación de documentos clínicos
Rellena tus plantillas con los datos del paciente y los descarga en **PDF** (o vista previa):
- **Contrato terapéutico (adultos)** — consentimiento informado.
- **Asentimiento informado (infantil)** — consentimiento del representante legal.
- **Entrevista psicológica** — formato de primera sesión.
- **Historial clínico (anamnesis)** — historia completa.
- **Perfil clínico** — resultados, perfil e impresión diagnóstica.
- **Plan de intervención** — objetivos jerárquicos y técnicas.

## 9. RAG — Base de conocimiento del consultorio
Es lo que hace que Isabel "conozca tu consultorio" y no invente respuestas:
- Contiene tu **proceso clínico** (el flujograma), la **estructura del expediente**, los **protocolos** (honorarios, duración, cancelaciones) y las **4 plantillas**.
- Al preguntarle algo, busca los fragmentos más relevantes y responde fundamentada en ellos.
- Búsqueda **semántica** (con IA) cuando hay cuota de Gemini; **por palabras clave** como respaldo.
- **Ampliable**: para que Isabel aprenda algo nuevo, basta con agregar un documento; no hay que reprogramar.

## 10. Telemedicina (teleconsultas)
- **Sesiones virtuales** con videollamada integrada (Jitsi).
- Cada sesión genera un **código** para el paciente.
- **Sala de espera virtual** para el paciente.
- Estados del flujo: Solicitada → Aprobada → En curso → Completada (o Cancelada / No-show).
- Notas posteriores a la sesión.

## 11. Facturación y pagos
- **Facturas** numeradas (ej. FAC-2026-001) con subtotal, descuento, **IVA (15%, Nicaragua)** y total.
- Facturación de **sesiones**, **talleres** e **ítems personalizados**.
- **Registro de pagos** (Efectivo, Tarjeta, Transferencia, Sinpe) con saldo pendiente.
- Estados: Pendiente / Pagada / Vencida / Cancelada.
- **Paquetes de sesiones** prepagados.
- **Historial de pagos** por paciente.

## 12. Talleres y cursos
- Creación de **talleres** (título, fechas, horario, ubicación, precio, cupo).
- **Inscripciones** de pacientes y **lista de espera** cuando se llena el cupo.
- Vinculación con facturación.

## 13. Finanzas y reportes
- Registro de **ingresos** (por consultas) y **egresos** (gastos, por categoría).
- **Reportes** financieros y balance.
- Equivalente digital del "Registro Contable" mensual/anual.

## 14. Recordatorios y notificaciones
- **Recordatorios automáticos** de citas por correo electrónico (tarea programada).
- Notificaciones por email (configurables vía SMTP).

## 15. Portal del paciente
- Acceso para que el paciente consulte información relevante de su proceso.

---

## Resumen técnico (para referencia)
- **Frontend:** React + Vite (TypeScript), Tailwind.
- **Backend:** Node.js + Express.
- **Base de datos:** PostgreSQL con Prisma (ORM).
- **IA:** Google Gemini (chat/función de Isabel) + embeddings `text-embedding-004` (RAG).
- **Video:** Jitsi Meet. **PDF:** jsPDF. **Auth:** JWT + 2FA (TOTP).
- **Despliegue:** Docker en droplet DigitalOcean, gestionado con Coolify, detrás de Cloudflare.

### Endpoints principales de la API
`/api/auth`, `/api/patients`, `/api/sessions`, `/api/goals`, `/api/expenses`,
`/api/appointments`, `/api/calendar`, `/api/availability`, `/api/telmed`,
`/api/virtual-sessions`, `/api/invoices`, `/api/payments`, `/api/finance`,
`/api/reports`, `/api/workshops`, `/api/packages`, `/api/audit`, `/api/portal`,
`/api/agent` (Isabel), `/api/chat` (chat público), `/api/knowledge` (RAG),
`/api/documents` (generación de documentos).

### Requisitos para que todo funcione
- Variables en el servidor (Coolify): `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY` (con **facturación activa** para que Isabel converse), `GEMINI_MODEL` (por defecto `gemini-2.0-flash`), `ALLOWED_ORIGIN`, SMTP (para correos).

---

## Qué funciona sin Gemini y qué lo necesita
- **No necesitan IA:** todo el expediente, agenda, facturación, talleres, telemedicina, escalas, **pestañas Plan y Documentos**, y la **descarga de PDFs**.
- **Necesitan Gemini con cuota/billing:** que **Isabel converse** y que el chat público responda; y que la búsqueda del RAG sea **semántica** (sin cuota, opera por palabras clave).

*Documento generado para la Lic. Esmirna García — Consultorio Psicológico Bienestar Integral.*
