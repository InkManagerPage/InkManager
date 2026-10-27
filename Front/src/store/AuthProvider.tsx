'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import * as auth from '@/services/auth.service';
import type { UsuarioSesion } from '@/types/auth';
interface AuthContextValue {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  error: string;
  reintentar: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const consulta = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    consulta.current = controller;
    auth
      .obtenerSesion(controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) {
          setUsuario(user);
          setError('');
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'No pudimos consultar tu sesión.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });
    return () => controller.abort();
  }, [intento]);
  async function login(email: string, password: string) {
    consulta.current?.abort();
    const { user } = await auth.iniciarSesion(email, password);
    setUsuario(user);
    setError('');
    setCargando(false);
    if (user.rol === 'ARTISTA') router.replace('/artista/trabajos');
  }
  async function logout() {
    consulta.current?.abort();
    await auth.cerrarSesion();
    setUsuario(null);
    setError('');
  }
  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        error,
        reintentar: () => {
          setCargando(true);
          setIntento((value) => value + 1);
        },
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}
