'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AuthControls } from '@/components/auth/AuthControls';
import { InvitationList } from '@/components/panel/InvitationList';
import { usePanelData } from '@/hooks/usePanelData';
import { responderInvitacion } from '@/services/equipo.service';
import type { InvitacionEquipo } from '@/types/equipo';
import { useAuth } from '@/store/AuthProvider';

function InvitacionesRecibidas({ vinculado }: { vinculado: boolean }) {
  const { datos, error, cargando, recargar } = usePanelData<{
    invitaciones: InvitacionEquipo[];
    emailVerificado: boolean;
  }>('/invitaciones-equipo/recibidas');
  const { reintentar } = useAuth();
  const [seleccion, setSeleccion] = useState<{ invitacion: InvitacionEquipo; accion: 'ACEPTAR' | 'RECHAZAR' } | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  async function confirmar() {
    if (!seleccion || procesando) return;
    setProcesando(true);
    try {
      await responderInvitacion(seleccion.invitacion.id, seleccion.accion, seleccion.invitacion.version);
      setSeleccion(null);
      if (seleccion.accion === 'ACEPTAR') reintentar();
      await recargar();
    } catch (cause) {
      setErrorAccion(cause instanceof Error ? cause.message : 'No pudimos responder la invitación.');
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) return <p role="status">Cargando invitaciones…</p>;
  if (error) return <p role="alert">{error} <button className="btn btn-link" onClick={() => void recargar()}>Reintentar</button></p>;
  if (vinculado) return <Link href="/artista" className="btn btn-dark">Ir a mi panel</Link>;
  if (!datos?.emailVerificado) return <p>Verificá tu correo para ver las invitaciones que recibiste.</p>;
  if (!datos.invitaciones.length) return <p>No tenés invitaciones pendientes.</p>;

  return (
    <>
      <InvitationList
        invitaciones={datos.invitaciones}
        titular={false}
        puedeAceptar
        onAction={(invitacion, accion) => {
          if (accion !== 'ACEPTAR' && accion !== 'RECHAZAR') return;
          setErrorAccion('');
          setSeleccion({ invitacion, accion });
        }}
      />
      {seleccion && (
        <section className="mt-3" aria-label="Confirmar respuesta">
          <p>{seleccion.accion === 'ACEPTAR' ? 'Vas a incorporarte a' : 'Vas a rechazar la invitación de'} {seleccion.invitacion.estudioNombre}.</p>
          {errorAccion && <p className="text-danger" role="alert">{errorAccion}</p>}
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-outline-dark" disabled={procesando} onClick={() => setSeleccion(null)}>Volver</button>
            <button type="button" className="btn btn-dark" disabled={procesando} onClick={() => void confirmar()}>
              {seleccion.accion === 'ACEPTAR' ? 'Aceptar y unirme' : 'Confirmar rechazo'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

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
        <InvitacionesRecibidas key={usuario.id} vinculado={Boolean(usuario.estudioId)} />
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
