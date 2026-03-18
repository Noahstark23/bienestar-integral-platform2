import jwt from 'jsonwebtoken';

/**
 * Middleware JWT — protege rutas que requieren autenticación.
 * Uso: router.get('/ruta', authenticateToken, handler)
 */
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado. Inicia sesión nuevamente.' });
    }
}
