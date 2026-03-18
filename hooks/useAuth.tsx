import { useState, useEffect } from 'react';

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

export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>({
        isAuthenticated: false,
        user: null,
        token: null
    });

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        const userStr = localStorage.getItem('auth_user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setAuthState({
                    isAuthenticated: true,
                    user,
                    token
                });
            } catch (err) {
                console.error('Error parsing user data:', err);
                // Clear invalid data
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }
    }, []);

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
