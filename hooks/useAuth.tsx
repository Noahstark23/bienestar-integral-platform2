import { useState } from 'react';

interface User {
    id: number;
    username: string;
    nombre: string;
    rol: string;
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
}

// Lee la sesión guardada de forma síncrona para que el primer render ya sepa
// si el usuario está autenticado (evita el parpadeo de login al recargar).
const readStoredAuth = (): AuthState => {
    if (typeof window === 'undefined') {
        return { isAuthenticated: false, user: null, token: null };
    }
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    if (token && userStr) {
        try {
            return { isAuthenticated: true, user: JSON.parse(userStr), token };
        } catch (err) {
            console.error('Error parsing user data:', err);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
        }
    }
    return { isAuthenticated: false, user: null, token: null };
};

export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>(readStoredAuth);

    const login = (token: string, user: User) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        setAuthState({
            isAuthenticated: true,
            user,
            token
        });
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setAuthState({
            isAuthenticated: false,
            user: null,
            token: null
        });
    };

    return {
        ...authState,
        login,
        logout
    };
};
