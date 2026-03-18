import logger from '../lib/logger.js';

/**
 * AppError — errores operacionales que deben llegar al cliente.
 * Lanzar desde route handlers con: throw new AppError('mensaje', statusCode)
 */
export class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * errorHandler — middleware global de errores de Express.
 * Debe registrarse ÚLTIMO en index.js: app.use(errorHandler)
 * Requiere exactamente 4 parámetros para que Express lo trate como error middleware.
 */
export function errorHandler(err, req, res, next) {
    logger.error(`${req.method} ${req.path} — ${err.message}`, err);

    // Errores operacionales controlados (AppError)
    if (err.isOperational) {
        return res.status(err.statusCode).json({ error: err.message });
    }

    // Errores de Prisma conocidos
    if (err.code === 'P2002') {
        const field = err.meta?.target?.[0] || 'campo';
        return res.status(409).json({
            error: `Ya existe un registro con ese ${field}. Verifica los datos e intenta de nuevo.`
        });
    }

    if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Registro no encontrado.' });
    }

    // Errores JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ error: 'Token inválido.' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ error: 'Token expirado. Inicia sesión nuevamente.' });
    }

    // Error desconocido — no exponer internals
    return res.status(500).json({ error: 'Error interno del servidor. Intenta de nuevo.' });
}

/**
 * notFoundHandler — captura rutas que no coinciden con ningún router.
 * Registrar ANTES de errorHandler pero DESPUÉS de todas las rutas.
 */
export function notFoundHandler(req, res, next) {
    next(new AppError(`Ruta no encontrada: ${req.method} ${req.path}`, 404));
}
