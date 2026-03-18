import rateLimit from 'express-rate-limit';

/**
 * loginLimiter — límite estricto para /api/auth/login (anti brute-force)
 * 10 intentos por IP cada 15 minutos
 */
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' }
});

/**
 * globalApiLimiter — límite general para todas las rutas /api/*
 * 100 solicitudes por IP por minuto (previene scraping y abuso)
 */
export const globalApiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' }
});
