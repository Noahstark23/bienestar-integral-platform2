import nodemailer from 'nodemailer';
import logger from './logger.js';

// El transporter se crea sólo si SMTP está configurado
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    logger.info('Mailer: SMTP configurado correctamente');
} else {
    logger.warn('Mailer: Variables SMTP no configuradas — los emails no se enviarán');
}

const FROM = process.env.SMTP_FROM || '"Bienestar Integral" <noreply@bienestarintegral.com>';

/**
 * Envía confirmación de cita al paciente.
 * Solo envía si `appointment.email` es no vacío y SMTP está configurado.
 */
export async function sendAppointmentConfirmation(appointment) {
    if (!transporter || !appointment.email) return;

    const fecha = new Date(appointment.fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-NI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaStr = fecha.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #4f46e5; margin-bottom: 4px;">Bienestar Integral</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 0;">Consultorio Psicológico</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
            <h3 style="font-size: 18px;">✅ Tu cita ha sido confirmada</h3>
            <p>Hola <strong>${appointment.nombrePaciente}</strong>,</p>
            <p>Tu cita ha sido confirmada para el:</p>
            <div style="background: #f0f4ff; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>${fechaStr}</strong></p>
                <p style="margin: 4px 0 0; font-size: 15px; color: #4f46e5;">🕐 ${horaStr}</p>
            </div>
            <p>Por favor, llega 5 minutos antes. Si necesitas reprogramar, contáctanos con anticipación.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— Lic. Esmirna García · Bienestar Integral</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: FROM,
            to: appointment.email,
            subject: `✅ Cita confirmada – ${fechaStr}`,
            html
        });
        logger.info(`Email de confirmación enviado a ${appointment.email}`);
    } catch (err) {
        logger.error(`Error enviando email a ${appointment.email}`, err);
    }
}

/**
 * Envía recordatorio de cita 24h antes.
 */
export async function sendAppointmentReminder(appointment) {
    if (!transporter || !appointment.email) return;

    const fecha = new Date(appointment.fechaHora);
    const fechaStr = fecha.toLocaleDateString('es-NI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaStr = fecha.toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' });

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #4f46e5; margin-bottom: 4px;">Bienestar Integral</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 0;">Consultorio Psicológico</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
            <h3 style="font-size: 18px;">🔔 Recordatorio: tienes una cita mañana</h3>
            <p>Hola <strong>${appointment.nombrePaciente}</strong>,</p>
            <p>Te recordamos que tienes una cita programada para mañana:</p>
            <div style="background: #f0f4ff; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; font-size: 16px;"><strong>${fechaStr}</strong></p>
                <p style="margin: 4px 0 0; font-size: 15px; color: #4f46e5;">🕐 ${horaStr}</p>
                ${appointment.servicio ? `<p style="margin: 4px 0 0; color: #64748b;">${appointment.servicio}</p>` : ''}
            </div>
            <p>Por favor llega 5 minutos antes. Si necesitas cancelar o reprogramar, contáctanos con anticipación.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— Lic. Esmirna García · Bienestar Integral</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: FROM,
            to: appointment.email,
            subject: `🔔 Recordatorio: Cita mañana a las ${horaStr}`,
            html
        });
        logger.info(`Recordatorio 24h enviado a ${appointment.email}`);
    } catch (err) {
        logger.error(`Error enviando recordatorio a ${appointment.email}`, err);
    }
}

/**
 * Envía recordatorio de factura pendiente al paciente.
 */
export async function sendInvoiceReminder(invoice) {
    if (!transporter) return;
    const patientEmail = invoice.patient?.email;
    if (!patientEmail) return;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; color: #1e293b;">
            <h2 style="color: #4f46e5;">Bienestar Integral</h2>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
            <h3>🔔 Recordatorio de pago pendiente</h3>
            <p>Hola <strong>${invoice.patient.nombre}</strong>,</p>
            <p>Te recordamos que tienes una factura pendiente de pago:</p>
            <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Factura:</strong> ${invoice.numeroFactura}</p>
                <p style="margin: 4px 0 0;"><strong>Saldo pendiente:</strong> C$ ${invoice.saldo.toFixed(2)}</p>
                <p style="margin: 4px 0 0;"><strong>Vencimiento:</strong> ${new Date(invoice.fechaVencimiento).toLocaleDateString('es-NI')}</p>
            </div>
            <p>Por favor realiza tu pago a la brevedad posible. Si ya realizaste el pago, ignora este mensaje.</p>
            <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— Lic. Esmirna García · Bienestar Integral</p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: FROM,
            to: patientEmail,
            subject: `🔔 Recordatorio de pago – ${invoice.numeroFactura}`,
            html
        });
        logger.info(`Email recordatorio enviado a ${patientEmail}`);
    } catch (err) {
        logger.error(`Error enviando recordatorio a ${patientEmail}`, err);
    }
}
