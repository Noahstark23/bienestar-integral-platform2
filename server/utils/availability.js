
/**
 * Genera el contexto de disponibilidad para Molbot en tiempo real
 * @param {import('@prisma/client').PrismaClient} prisma 
 */
export async function getAvailabilityContext(prisma) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    let context = "\nDISPONIBILIDAD EN TIEMPO REAL (Próximos 3 días):\n";

    const today = new Date();

    // Check next 3 days
    for (let i = 1; i <= 3; i++) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + i);

        const dayOfWeek = targetDate.getDay();

        // Format manual date string for display (DD/MM)
        const dateStr = `${targetDate.getDate().toString().padStart(2, '0')}/${(targetDate.getMonth() + 1).toString().padStart(2, '0')}`;

        // Get slots for this day of week
        const slots = await prisma.availabilitySlot.findMany({
            where: { dayOfWeek: dayOfWeek, isActive: true },
            orderBy: { startTime: 'asc' }
        });

        if (slots.length === 0) {
            // context += `- ${days[dayOfWeek]} (${dateStr}): CERRADO\n`;
            // Skip closed days to be concise, or mention them if explicit
            continue;
        }

        // Get appointment count for this specific date
        // Start of day
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        // End of day
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        const appointmentCount = await prisma.appointment.count({
            where: {
                fechaHora: { gte: startOfDay, lte: endOfDay },
                estado: { notIn: ['Cancelada', 'Rechazada'] }
            }
        });

        const sessionCount = await prisma.session.count({
            where: {
                fecha: { gte: startOfDay, lte: endOfDay }
            }
        });

        const totalBusy = appointmentCount + sessionCount;
        const hours = slots.map(s => `${s.startTime}-${s.endTime}`).join(', ');

        // Simple heuristic: > 8 appointments/sessions = Busy
        let status = "✅ Espacios disponibles";
        if (totalBusy >= 5) status = "⚠️ Pocos espacios";
        if (totalBusy >= 10) status = "❌ Muy lleno (preguntar)";

        context += `- ${days[dayOfWeek]} ${dateStr}: ${hours} | ${status} (${totalBusy} citas agendadas)\n`;
    }

    return context;
}  
