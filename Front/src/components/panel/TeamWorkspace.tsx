'use client';
import { Suspense, useState, useRef } from 'react';
import Link from 'next/link';
import Modal from 'react-bootstrap/Modal';
import Dropdown from 'react-bootstrap/Dropdown';
import { useAuth } from '@/store/AuthProvider';
import { useConsultas } from '@/hooks/useConsultas';
import { usePanelFilters } from '@/hooks/usePanelFilters';
import { useDiscardChanges } from '@/components/forms/UnsavedChanges';
import { PageHeader, EmptyState, Avatar, SearchField } from './PanelUI';
import { PanelForm, PanelField } from './PanelForm';
import { InvitationList, type AccionInvitacion } from './InvitationList';
import {
  invitarArtista,
  cambiarIntegrante,
  gestionarInvitacion,
  responderInvitacion,
} from '@/services/equipo.service';
import { solicitarCorreoCuenta } from '@/services/auth.service';
import { cantidad } from '@/lib/panel-artista';
import type { IntegranteGuardado, AccionIntegrante, InvitacionEquipo } from '@/types/equipo';
import styles from './workspace.module.css';

type Confirmacion =
  | { tipo: 'INTEGRANTE'; artista: IntegranteGuardado; accion: AccionIntegrante }
  | { tipo: 'INVITACION'; invitacion: InvitacionEquipo; accion: AccionInvitacion };
export function TeamWorkspace() {
  return (
    <Suspense fallback={<p role="status">Cargando equipo…</p>}>
      <Team />
    </Suspense>
  );
}
function Team() {
  const { datos, cargando, error, recargar, actualizarEquipo } = useConsultas();
  const { usuario, reintentar } = useAuth(),
    { params, update } = usePanelFilters(),
    descartar = useDiscardChanges();
  const [invitar, setInvitar] = useState(false),
    [aviso, setAviso] = useState(''),
    [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const resultado = useRef('');
  const titular = usuario?.rol === 'ESTUDIO_ADMIN',
    base = titular ? '/estudio' : '/artista';
  const filtro = params.get('estado') || '',
    busqueda = params.get('buscar') || '',
    artista = params.get('artista');
  const equipo = (datos?.equipo || []).filter(
    (a) =>
      (!filtro || a.estado === filtro) &&
      (!artista || a.id === artista) &&
      `${a.nombre} ${a.email} ${a.estilos}`
        .toLocaleLowerCase('es')
        .includes(busqueda.toLocaleLowerCase('es')),
  );
  async function ejecutar() {
    if (!confirmacion) return;
    if (confirmacion.tipo === 'INTEGRANTE')
      resultado.current = await cambiarIntegrante(
        confirmacion.artista.id,
        confirmacion.accion,
        confirmacion.artista.version,
      );
    else {
      const { invitacion: i, accion } = confirmacion;
      resultado.current = await (accion === 'ACEPTAR' || accion === 'RECHAZAR'
        ? responderInvitacion(i.id, accion, i.version)
        : gestionarInvitacion(i.id, accion, i.version));
    }
    await actualizarEquipo();
  }
  return (
    <>
      <PageHeader
        titulo={titular ? 'Equipo' : 'Mi estudio'}
        descripcion={
          datos?.contexto.tipo === 'ESTUDIO' ? datos.contexto.nombre : 'Artista independiente'
        }
      >
        <button
          className={styles.secondaryButton}
          onClick={() => {
            void recargar();
          }}
        >
          Actualizar
        </button>
        {titular && (
          <button
            className={styles.button}
            disabled={!datos?.contexto.emailVerificado}
            onClick={() => setInvitar(true)}
          >
            Invitar artista
          </button>
        )}
      </PageHeader>
      {error && (
        <p role="alert" className="alert alert-danger">
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className={styles.notice}>
          {aviso}
        </p>
      )}
      {datos && !datos.contexto.emailVerificado && (
        <div className={styles.notice}>
          <p>Verificá tu email para {titular ? 'enviar' : 'ver y responder'} invitaciones.</p>
          <button
            className={styles.textButton}
            onClick={() => {
              void solicitarCorreoCuenta(usuario!.email, true)
                .then(setAviso)
                .catch((e) =>
                  setAviso(e instanceof Error ? e.message : 'No pudimos enviar el correo.'),
                );
            }}
          >
            Enviar correo de verificación
          </button>
        </div>
      )}
      {cargando && !datos ? (
        <p role="status">Cargando equipo…</p>
      ) : (
        datos && (
          <>
            {datos.contexto.tipo === 'ESTUDIO' ? (
              <>
                <div className={styles.toolbar}>
                  <div className={styles.tabs}>
                    {[
                      ['', 'Todos'],
                      ['ACTIVO', 'Activos'],
                      ['SUSPENDIDO', 'Suspendidos'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        className={filtro === key ? styles.tabActive : ''}
                        aria-pressed={filtro === key}
                        onClick={() => update({ estado: key || null })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <SearchField
                    placeholder="Buscar artista"
                    value={busqueda}
                    onChange={(v) => update({ buscar: v || null })}
                  />
                </div>
                {artista && (
                  <button className={styles.textButton} onClick={() => update({ artista: null })}>
                    Ver todo el equipo
                  </button>
                )}
                <section className={styles.surface} aria-label="Integrantes del estudio">
                  {equipo.length ? (
                    equipo.map((a) => (
                      <article className={styles.mobileItem} key={a.id}>
                        <div className={styles.mobileItemHeader}>
                          <div className={styles.identity}>
                            <Avatar nombre={a.nombre} />
                            <div>
                              <strong>
                                {a.nombre}
                                {a.id === usuario?.id ? ' · vos' : ''}
                              </strong>
                              <small>{a.estilos}</small>
                            </div>
                          </div>
                          <span className={styles.status}>
                            {a.estado === 'ACTIVO' ? 'Activo' : 'Suspendido'}
                          </span>
                        </div>
                        {a.email && <p>{a.email}</p>}
                        <div className={styles.headerActions}>
                          <Link
                            className={styles.textButton}
                            href={`${base}/consultas?artista=${a.id}`}
                          >
                            Ver consultas
                          </Link>
                          {titular && (
                            <Link
                              className={styles.textButton}
                              href={`${base}/agenda?artista=${a.id}&rango=todos&vista=LISTA&canceladas=1`}
                            >
                              {cantidad(a.turnosPendientes, 'turno')} pendiente
                              {a.turnosPendientes === 1 ? '' : 's'}
                            </Link>
                          )}
                          {titular && (
                            <Link
                              className={styles.textButton}
                              href={`/estudio/disponibilidad?artista=${a.id}`}
                            >
                              Horarios y bloqueos
                            </Link>
                          )}
                          {titular && (
                            <Dropdown>
                              <Dropdown.Toggle
                                variant="outline-dark"
                                size="sm"
                                aria-label={`Administrar a ${a.nombre}`}
                              >
                                Administrar
                              </Dropdown.Toggle>
                              <Dropdown.Menu align="end">
                                <Dropdown.Item
                                  onClick={() =>
                                    setConfirmacion({
                                      tipo: 'INTEGRANTE',
                                      artista: a,
                                      accion: a.estado === 'ACTIVO' ? 'SUSPENDER' : 'HABILITAR',
                                    })
                                  }
                                >
                                  {a.estado === 'ACTIVO' ? 'Suspender' : 'Habilitar'}
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item
                                  className="text-danger"
                                  onClick={() =>
                                    setConfirmacion({
                                      tipo: 'INTEGRANTE',
                                      artista: a,
                                      accion: 'DESVINCULAR',
                                    })
                                  }
                                >
                                  Desvincular del estudio
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <EmptyState
                      titulo={
                        datos.equipo.length
                          ? 'No hay artistas con esos filtros'
                          : 'Todavía no hay artistas en el equipo'
                      }
                    />
                  )}
                </section>
              </>
            ) : (
              <section className={styles.surface}>
                <EmptyState titulo="Trabajás de forma independiente" />
              </section>
            )}
            <InvitationList
              invitaciones={datos.invitaciones || []}
              titular={titular}
              puedeAceptar={
                datos.contexto.tipo === 'INDEPENDIENTE' && datos.contexto.emailVerificado
              }
              onAction={(i, a) => setConfirmacion({ tipo: 'INVITACION', invitacion: i, accion: a })}
            />
          </>
        )
      )}
      <Modal show={invitar} onHide={() => descartar(() => setInvitar(false))} centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            Invitar artista
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {invitar && (
            <PanelForm
              initialValues={{ email: '' }}
              validate={(v) =>
                !v.email.trim() ||
                v.email.length > 254 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())
                  ? { email: 'Ingresá un email válido.' }
                  : {}
              }
              onSave={async (v) => {
                resultado.current = await invitarArtista(v.email);
                await actualizarEquipo();
              }}
              onSaved={() => {
                setInvitar(false);
                setAviso(resultado.current);
              }}
            >
              <PanelField
                name="email"
                label="Email del artista"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
              <p className={styles.muted}>
                La invitación vence en 7 días. El artista debe aceptarla con una cuenta registrada
                con este email.
              </p>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => descartar(() => setInvitar(false))}
                >
                  Volver
                </button>
                <button type="submit" className={styles.button}>
                  Enviar invitación
                </button>
              </div>
            </PanelForm>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={Boolean(confirmacion)} onHide={() => setConfirmacion(null)} centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2" className="fs-5">
            {tituloConfirmacion(confirmacion)}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {confirmacion && (
            <PanelForm
              key={
                confirmacion.tipo === 'INTEGRANTE'
                  ? confirmacion.artista.id + confirmacion.accion
                  : confirmacion.invitacion.id + confirmacion.accion
              }
              initialValues={{}}
              validate={() => ({})}
              onSave={ejecutar}
              onSaved={() => {
                const acepta =
                  confirmacion.tipo === 'INVITACION' && confirmacion.accion === 'ACEPTAR';
                setConfirmacion(null);
                setAviso(resultado.current);
                if (acepta) reintentar();
              }}
            >
              <ConfirmationContent valor={confirmacion} base={base} />
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setConfirmacion(null)}
                >
                  Volver
                </button>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={
                    confirmacion.tipo === 'INTEGRANTE' &&
                    confirmacion.accion === 'DESVINCULAR' &&
                    Boolean(
                      confirmacion.artista.turnosPendientes ||
                      confirmacion.artista.consultasAsignadas,
                    )
                  }
                >
                  {confirmacion.tipo === 'INTEGRANTE'
                    ? {
                        SUSPENDER: 'Suspender artista',
                        HABILITAR: 'Habilitar artista',
                        DESVINCULAR: 'Desvincular artista',
                      }[confirmacion.accion]
                    : {
                        ACEPTAR: 'Aceptar y unirme',
                        RECHAZAR: 'Rechazar invitación',
                        CANCELAR: 'Cancelar invitación',
                        REENVIAR: 'Reenviar invitación',
                      }[confirmacion.accion]}
                </button>
              </div>
            </PanelForm>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
function tituloConfirmacion(v: Confirmacion | null) {
  if (!v) return '';
  return v.tipo === 'INTEGRANTE'
    ? `${{ SUSPENDER: 'Suspender', HABILITAR: 'Habilitar', DESVINCULAR: 'Desvincular' }[v.accion]} a ${v.artista.nombre}`
    : v.accion === 'ACEPTAR'
      ? `Sumarte a ${v.invitacion.estudioNombre}`
      : {
          RECHAZAR: 'Rechazar invitación',
          CANCELAR: 'Cancelar invitación',
          REENVIAR: 'Reenviar invitación',
        }[v.accion];
}
function ConfirmationContent({ valor: v, base }: { valor: Confirmacion; base: string }) {
  if (v.tipo === 'INVITACION')
    return (
      <p>
        {v.accion === 'ACEPTAR'
          ? 'Vas a trabajar como integrante del estudio. Tu perfil y tus trabajos siguen siendo tuyos. Primero debés tener resueltas tus consultas y sesiones independientes.'
          : v.accion === 'REENVIAR'
            ? `Se enviará nuevamente la invitación a ${v.invitacion.email}.`
            : 'Esta invitación dejará de estar disponible.'}
      </p>
    );
  const a = v.artista;
  if (v.accion === 'SUSPENDER')
    return (
      <p>
        El artista podrá consultar sus turnos y proyectos asignados, pero no cotizar ni
        modificarlos. Sus turnos y consultas se conservan.
      </p>
    );
  if (v.accion === 'HABILITAR')
    return <p>El artista podrá volver a presentar propuestas y gestionar sus turnos.</p>;
  return (
    <>
      <p>
        Se quitará su acceso al estudio. Su cuenta y portafolio se conservan, al igual que el
        historial del estudio.
      </p>
      {Boolean(a.turnosPendientes || a.consultasAsignadas) && (
        <div className={styles.notice}>
          <p>Primero resolvé los turnos pendientes y reasigná o archivá sus consultas.</p>
          <p>
            <Link href={`${base}/agenda?artista=${a.id}&rango=todos&vista=LISTA`}>
              {cantidad(a.turnosPendientes, 'turno')} pendiente{a.turnosPendientes === 1 ? '' : 's'}
            </Link>
          </p>
          <Link href={`${base}/consultas?artista=${a.id}`}>
            {cantidad(a.consultasAsignadas, 'consulta')} asignada
            {a.consultasAsignadas === 1 ? '' : 's'}
          </Link>
        </div>
      )}
    </>
  );
}
