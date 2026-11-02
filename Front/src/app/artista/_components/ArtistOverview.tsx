'use client';
import { useConsultas } from '@/hooks/useConsultas';
import { relojEnZona } from '@/lib/agenda';

import Link from 'next/link';
import { useArtistPanel } from './ArtistPanelProvider';
import { useArtistProfile } from './ArtistProfileProvider';
import { Avatar, EmptyState, PageHeader, PanelIcon, StatusBadge } from './PanelUI';
import { cantidad, horaFin, mostrarFecha, moverFecha } from '@/lib/panel-artista';
import { camposPendientes } from '@/lib/perfil-artista';
import styles from '@/components/panel/workspace.module.css';

export function ArtistOverview() {
  const { datos, buscarCliente } = useArtistPanel();
  const { perfil } = useArtistProfile();
  const { datos: fuente } = useConsultas();
  const { fecha: hoy, hora: horaActual } = relojEnZona(
    fuente?.contexto.zonaHoraria || 'America/Argentina/Buenos_Aires',
  );
  const pendientes = datos.consultas
    .filter((item) => ['NUEVA', 'EN_REVISION'].includes(item.estado))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const nuevas = pendientes.filter((item) => item.estado === 'NUEVA').length;
  const citas = datos.citas
    .filter((item) => item.fecha >= hoy && !['CANCELADA', 'COMPLETADA'].includes(item.estado))
    .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
  const semana = citas.filter((item) => item.fecha <= moverFecha(hoy, 6));
  const porConfirmar = semana.filter((item) => item.estado === 'PENDIENTE');
  const hoyCitas = datos.citas
    .filter((item) => item.fecha === hoy && item.estado !== 'CANCELADA')
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const proxima = citas.find(
    (item) => item.fecha > hoy || horaFin(item.hora, item.duracion) > horaActual,
  );
  const mensajes = datos.conversaciones.reduce((total, item) => total + item.sinLeer, 0);
  const faltantes = perfil ? camposPendientes(perfil) : [];
  const agendaProxima = `/artista/agenda?fecha=${hoy}&rango=proximos&vista=LISTA`;
  return (
    <>
      <PageHeader
        titulo="Resumen"
        descripcion={mostrarFecha(hoy, { weekday: 'long', day: 'numeric', month: 'long' })}
      >
        <Link href="/artista/agenda?nueva=1" className={styles.button}>
          <PanelIcon nombre="mas" size={17} />
          Agendar sesión
        </Link>
      </PageHeader>
      {Boolean(fuente?.invitaciones?.length) && (
        <div className={styles.notice}>
          <span>
            Tenés {cantidad(fuente?.invitaciones?.length || 0, 'invitación', 'invitaciones')} de
            estudios.
          </span>{' '}
          <Link href="/artista/estudio" className={styles.textButton}>
            Revisar invitaciones
          </Link>
        </div>
      )}
      <div className={styles.todayLayout}>
        <section className={styles.surface} aria-labelledby="today-title">
          <div className={styles.surfaceHeading}>
            <h2 id="today-title">Hoy</h2>
            <span>{cantidad(hoyCitas.length, 'turno')}</span>
          </div>
          {hoyCitas.length ? (
            hoyCitas.map((cita) => (
              <div className={styles.agendaItem} key={cita.id}>
                <time>{cita.hora}</time>
                <div>
                  <h3>
                    <Link href={`/artista/agenda?fecha=${hoy}&cita=${cita.id}`}>
                      {buscarCliente(cita.clienteId).nombre}
                    </Link>
                  </h3>
                  <p>
                    {cita.titulo} · hasta las {horaFin(cita.hora, cita.duracion)}
                  </p>
                  <StatusBadge estado={cita.estado} />
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              titulo="Sin turnos para hoy"
              detalle="Tu próximo encuentro aparecerá en la agenda."
            />
          )}
          <div className={styles.sectionFoot}>
            <Link href={`/artista/agenda?fecha=${hoy}&vista=DIA`} className={styles.textButton}>
              Ver agenda <PanelIcon nombre="flecha" size={16} />
            </Link>
          </div>
        </section>
        <section className={styles.actionSummary} aria-labelledby="next-title">
          <span className={styles.todayDate}>Próximo turno</span>
          {proxima ? (
            <>
              <h2 id="next-title">{buscarCliente(proxima.clienteId).nombre}</h2>
              <p>{proxima.titulo}</p>
              <p>
                <strong>
                  {proxima.fecha === hoy
                    ? 'Hoy'
                    : mostrarFecha(proxima.fecha, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                  · {proxima.hora} — {horaFin(proxima.hora, proxima.duracion)}
                </strong>
              </p>
              <Link
                className={styles.button}
                href={`/artista/agenda?fecha=${proxima.fecha}&cita=${proxima.id}`}
              >
                Ver turno <PanelIcon nombre="flecha" size={16} />
              </Link>
            </>
          ) : (
            <>
              <h2 id="next-title">Tu agenda está libre</h2>
              <p>Agendá una sesión para organizar tus próximos días.</p>
              <Link href="/artista/agenda?nueva=1" className={styles.button}>
                Agendar sesión
              </Link>
            </>
          )}
        </section>
      </div>
      <div className={styles.stats}>
        <Link href="/artista/consultas?estado=PENDIENTES" className={styles.stat}>
          <span>Consultas por revisar</span>
          <strong>{pendientes.length}</strong>
          <small>{cantidad(nuevas, 'nueva')}</small>
        </Link>
        <Link href={agendaProxima} className={styles.stat}>
          <span>Turnos próximos</span>
          <strong>{semana.length}</strong>
          <small>Próximos 7 días</small>
        </Link>
        <Link href={`${agendaProxima}&estado=PENDIENTE`} className={styles.stat}>
          <span>Por confirmar</span>
          <strong>{porConfirmar.length}</strong>
          <small>Próximos 7 días</small>
        </Link>
        <Link href="/artista/mensajes?sinLeer=1" className={styles.stat}>
          <span>Mensajes sin leer</span>
          <strong>{mensajes}</strong>
          <small>
            {cantidad(
              datos.conversaciones.filter((item) => item.sinLeer > 0).length,
              'conversación',
              'conversaciones',
            )}
          </small>
        </Link>
      </div>
      <div className={styles.split}>
        <div className={styles.stack}>
          <section className={styles.surface} aria-labelledby="pending-queries">
            <div className={styles.surfaceHeading}>
              <h2 id="pending-queries">Consultas por revisar</h2>
              <Link href="/artista/consultas?estado=PENDIENTES" className={styles.textButton}>
                Ver todas <PanelIcon nombre="flecha" size={16} />
              </Link>
            </div>
            {pendientes.length ? (
              pendientes.slice(0, 4).map((consulta) => (
                <div className={styles.agendaItem} key={consulta.id}>
                  <Avatar nombre={buscarCliente(consulta.clienteId).nombre} />
                  <div>
                    <h3>
                      <Link href={`/artista/consultas?estado=PENDIENTES&consulta=${consulta.id}`}>
                        {buscarCliente(consulta.clienteId).nombre}
                      </Link>
                    </h3>
                    <p>{consulta.titulo}</p>
                    <StatusBadge estado={consulta.estado} />
                    <small className="d-block mt-2">
                      Recibida el {mostrarFecha(consulta.fecha)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                titulo="Estás al día"
                detalle="No tenés consultas pendientes de revisión."
              />
            )}
          </section>
          <section className={styles.surface} aria-labelledby="week-title">
            <div className={styles.surfaceHeading}>
              <h2 id="week-title">Los próximos días</h2>
              <Link href={agendaProxima} className={styles.textButton}>
                Abrir agenda
              </Link>
            </div>
            <div className={styles.surfaceBody}>
              <div className={styles.weekStrip}>
                {Array.from({ length: 7 }, (_, indice) => {
                  const fecha = moverFecha(hoy, indice);
                  const total = semana.filter((cita) => cita.fecha === fecha).length;
                  return (
                    <Link
                      key={fecha}
                      href={`/artista/agenda?fecha=${fecha}&vista=DIA`}
                      className={`${styles.weekDay} ${indice === 0 ? styles.today : ''}`}
                      aria-label={`${mostrarFecha(fecha, { weekday: 'long', day: 'numeric', month: 'long' })}, ${cantidad(total, 'turno')}`}
                    >
                      <small>{mostrarFecha(fecha, { weekday: 'short' })}</small>
                      <strong>{mostrarFecha(fecha, { day: 'numeric' })}</strong>
                      <span>
                        {Array.from({ length: Math.min(total, 4) }, (_, punto) => (
                          <i key={punto} />
                        ))}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
        <div className={styles.stack}>
          <section className={styles.surface} aria-labelledby="pending-sessions">
            <div className={styles.surfaceHeading}>
              <h2 id="pending-sessions">Confirmaciones pendientes</h2>
            </div>
            {porConfirmar.length ? (
              porConfirmar.slice(0, 3).map((cita) => (
                <div className={styles.agendaItem} key={cita.id}>
                  <PanelIcon nombre="reloj" size={18} />
                  <div>
                    <h3>{buscarCliente(cita.clienteId).nombre}</h3>
                    <p>
                      {mostrarFecha(cita.fecha)} · {cita.hora}
                    </p>
                    <Link
                      href={`/artista/agenda?fecha=${cita.fecha}&cita=${cita.id}`}
                      className={styles.textButton}
                    >
                      Revisar confirmación <PanelIcon nombre="flecha" size={15} />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                titulo="Todo confirmado"
                detalle="No hay confirmaciones pendientes en los próximos 7 días."
              />
            )}
          </section>
          {perfil && faltantes.length > 0 && (
            <section className={styles.profileNote}>
              <PanelIcon nombre="perfil" />
              <div>
                <h2>Completá tu perfil</h2>
                <p>Pendiente: {faltantes.join(', ')}.</p>
                <Link href="/artista/perfil" className={styles.textButton}>
                  Editar mi perfil
                </Link>
              </div>
            </section>
          )}
          {datos.invitacion && (
            <section className={styles.profileNote}>
              <PanelIcon nombre="estudio" />
              <div>
                <h2>Una invitación para vos</h2>
                <p>{datos.invitacion.nombre} te invitó a formar parte de su equipo.</p>
                <Link href="/artista/estudio" className={styles.textButton}>
                  Ver invitación
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
