'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import * as auth from '@/services/auth.service';
import type { UsuarioSesion } from '@/types/auth';
interface AuthContextValue {
  usuario: UsuarioSesion | null;
  cargando: boolean;
  error: string;
  reintentar: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  eliminarCuenta: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const consulta = useRef<AbortController | null>(null);
  const reintentar = useCallback(() => {
    setCargando(true);
    setIntento((value) => value + 1);
  }, []);
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
    if (user.rol === 'SUPERADMIN') router.replace('/admin');
    if (!pathname.startsWith('/suscripcion') && pathname !== '/invitacion-equipo') {
      if (user.rol === 'ARTISTA') router.replace('/artista');
      if (user.rol === 'ESTUDIO_ADMIN') router.replace('/estudio');
    }
  }
  async function logout() {
    consulta.current?.abort();
    await auth.cerrarSesion();
    setUsuario(null);
    setError('');
  }
  async function eliminarCuenta() {
    consulta.current?.abort();
    await auth.eliminarMiCuenta();
    setUsuario(null);
    setError('');
    window.location.assign('/?cuenta_eliminada=true');
  }
  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        error,
        reintentar,
        login,
        logout,
        eliminarCuenta,
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
