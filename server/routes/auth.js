import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import prisma from '../lib/prisma.js';
import { loginLimiter } from '../middleware/rateLimiter.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../lib/logger.js';

const router = Router();

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }

        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        // Si 2FA está habilitado, emitir token temporal de 5 minutos
        if (user.twoFactorEnabled && user.twoFactorSecret) {
            const tempToken = jwt.sign(
                { id: user.id, type: 'temp-2fa' },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            return res.json({ requires2FA: true, tempToken });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol }
        });
    } catch (err) {
        logger.error('POST /api/auth/login', err);
        next(err);
    }
});

// POST /api/auth/verify-2fa — valida TOTP con tempToken
router.post('/verify-2fa', async (req, res, next) => {
    try {
        const { tempToken, code } = req.body;
        if (!tempToken || !code) {
            return res.status(400).json({ error: 'Token temporal y código requeridos' });
        }

        let decoded;
        try {
            decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        } catch {
            return res.status(403).json({ error: 'Token temporal inválido o expirado' });
        }

        if (decoded.type !== 'temp-2fa') {
            return res.status(403).json({ error: 'Token inválido' });
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || !user.twoFactorSecret) {
            return res.status(403).json({ error: 'Usuario no encontrado' });
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });

        if (!valid) {
            return res.status(401).json({ error: 'Código incorrecto. Intenta de nuevo.' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, nombre: user.nombre, rol: user.rol }
        });
    } catch (err) {
        logger.error('POST /api/auth/verify-2fa', err);
        next(err);
    }
});

// GET /api/auth/2fa/setup — genera secret y QR (requiere auth)
router.get('/2fa/setup', authenticateToken, async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const secret = speakeasy.generateSecret({
            name: `Bienestar Integral (${user.username})`,
            length: 20,
        });

        // Guardar el secret temporal (se activa definitivamente en /2fa/enable)
        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorSecret: secret.base32 },
        });

        const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({ secret: secret.base32, qrCode: qrDataUrl });
    } catch (err) {
        logger.error('GET /api/auth/2fa/setup', err);
        next(err);
    }
});

// POST /api/auth/2fa/enable — confirma código y activa 2FA
router.post('/2fa/enable', authenticateToken, async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Código TOTP requerido' });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: 'Primero ejecuta /2fa/setup' });
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });

        if (!valid) {
            return res.status(401).json({ error: 'Código incorrecto. Intenta de nuevo.' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorEnabled: true },
        });

        res.json({ success: true, message: '2FA activado correctamente' });
    } catch (err) {
        logger.error('POST /api/auth/2fa/enable', err);
        next(err);
    }
});

// POST /api/auth/2fa/disable — desactiva 2FA (requiere código válido)
router.post('/2fa/disable', authenticateToken, async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Código TOTP requerido para desactivar' });

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user || !user.twoFactorSecret) {
            return res.status(400).json({ error: '2FA no está configurado' });
        }

        const valid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 1,
        });

        if (!valid) {
            return res.status(401).json({ error: 'Código incorrecto' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorEnabled: false, twoFactorSecret: null },
        });

        res.json({ success: true, message: '2FA desactivado correctamente' });
    } catch (err) {
        logger.error('POST /api/auth/2fa/disable', err);
        next(err);
    }
});

export default router;
