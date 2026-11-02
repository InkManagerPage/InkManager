'use client';
import Link from 'next/link';
import { AuthControls } from '@/components/auth/AuthControls';
import { useAuth } from '@/store/AuthProvider';
export default function InvitacionEquipoPage() {
  const { usuario, cargando } = useAuth();
  return (
    <main className="container py-5" style={{ maxWidth: 680 }}>
      <Link href="/" className="text-dark text-decoration-none">
        InkManager
      </Link>
      <h1 className="mt-5 mb-3">Tu lugar en el estudio</h1>
      {cargando ? (
        <p role="status">Consultando tu sesión…</p>
      ) : usuario?.rol === 'ARTISTA' ? (
        <>
          <p>Revisá tus invitaciones y elegí si querés formar parte del equipo.</p>
          <Link href="/artista/estudio" className="btn btn-dark mt-3">
            Ver mis invitaciones
          </Link>
        </>
      ) : (
        <>
          <p>
            Ingresá con una cuenta de artista y el email que recibió la invitación. Si todavía no
            tenés cuenta, registrate como artista y verificá tu email.
          </p>
          {usuario && (
            <p>
              La cuenta actual tiene otro rol. Cerrá la sesión para ingresar con tu cuenta de
              artista.
            </p>
          )}
          <div className="mt-4">
            <AuthControls contextoRegistro="profesional" />
          </div>
        </>
      )}
    </main>
  );
}
