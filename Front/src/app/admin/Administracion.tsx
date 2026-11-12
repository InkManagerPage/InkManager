'use client';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import Modal from 'react-bootstrap/Modal';
import { useAuth } from '@/store/AuthProvider';
import { PanelShell } from '@/components/panel/PanelShell';
import { EmptyState, PageHeader } from '@/components/panel/PanelUI';
import { PanelForm, PanelField, PanelSubmitButton } from '@/components/panel/PanelForm';
import { mutarPanel, usePanelData } from '@/hooks/usePanelData';
import styles from '@/components/panel/workspace.module.css';

const vistas = ['Resumen', 'Cuentas', 'Suscripciones', 'Historial'] as const;
const roles: Record<string, string> = {
  CLIENTE: 'Cliente',
  ARTISTA: 'Artista',
  ESTUDIO_ADMIN: 'Titular de estudio',
  SUPERADMIN: 'Administrador',
};
const secciones = [
  { nombre: 'Administración', ruta: '/admin', icono: 'estadisticas' as const, grupo: 'Plataforma' },
];
const fecha = (valor: string) =>
  new Date(valor).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

export function Administracion() {
  const { usuario, cargando, error, reintentar } = useAuth();
  const [vista, setVista] = useState<(typeof vistas)[number]>('Resumen');
  if (cargando)
    return (
      <main className="container py-5">
        <p role="status">Consultando sesión…</p>
      </main>
    );
  if (error)
    return (
      <main className="container py-5">
        <p role="alert">{error}</p>
        <button onClick={reintentar}>Reintentar</button>
      </main>
    );
  if (usuario?.rol !== 'SUPERADMIN')
    return (
      <main className="container py-5">
        <h1>Acceso restringido</h1>
        <p>Ingresá con una cuenta de administración para continuar.</p>
        <Link href="/">Volver al inicio</Link>
      </main>
    );
  return (
    <PanelShell
      secciones={secciones}
      nombre={usuario.nombre || 'Administración'}
      subtitulo="InkManager"
      perfil="/admin"
    >
      <PageHeader titulo="Administración" descripcion="Actividad y gestión de InkManager." />
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Vistas de administración">
          {vistas.map((v) => (
            <button
              key={v}
              aria-pressed={vista === v}
              className={vista === v ? styles.tabActive : ''}
              onClick={() => setVista(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {vista === 'Resumen' && <Resumen />}
      {vista === 'Cuentas' && <Listado tipo="cuentas" />}
      {vista === 'Suscripciones' && <Listado tipo="suscripciones" />}
      {vista === 'Historial' && <Historial />}
    </PanelShell>
  );
}

type ResumenDatos = {
  altas: { rol: string; _count: { _all: number } }[];
  estudios: number;
  consultas: number;
  presupuestos: number;
  turnos: number;
  fallidos: number;
  suscripciones: { estado: string; _count: { _all: number } }[];
  cobros: { moneda: string; monto: number }[];
};
function EstadoCarga({
  cargando,
  error,
  recargar,
}: {
  cargando: boolean;
  error: string;
  recargar: () => Promise<void>;
}) {
  if (cargando) return <p role="status">Cargando datos…</p>;
  if (!error) return null;
  return (
    <div className="alert alert-danger" role="alert">
      {error}{' '}
      <button className={styles.textButton} onClick={() => void recargar()}>
        Reintentar
      </button>
    </div>
  );
}
function Resumen() {
  const [filtro, setFiltro] = useState('');
  const estado = usePanelData<ResumenDatos>('/admin/resumen' + filtro);
  const d = estado.datos;
  function aplicar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const query = new URLSearchParams();
    for (const clave of ['desde', 'hasta'])
      if (form.get(clave)) query.set(clave, String(form.get(clave)));
    setFiltro(query.size ? '?' + query.toString() : '');
  }
  return (
    <div className={styles.stack}>
      <form className={styles.toolbar} onSubmit={aplicar}>
        <label>
          Desde
          <input name="desde" type="date" className="form-control" />
        </label>
        <label>
          Hasta
          <input name="hasta" type="date" className="form-control" />
        </label>
        <button className={styles.secondaryButton}>Aplicar período</button>
      </form>
      <EstadoCarga {...estado} />
      {d && (
        <>
          <div className={styles.stats}>
            {[
              ['Altas de cuentas', d.altas.reduce((n, a) => n + a._count._all, 0)],
              ['Estudios creados', d.estudios],
              ['Consultas', d.consultas],
              ['Presupuestos', d.presupuestos],
              ['Turnos completados', d.turnos],
              ['Cobros rechazados', d.fallidos],
            ].map(([etiqueta, valor]) => (
              <div className={styles.stat} key={etiqueta}>
                <span>{etiqueta}</span>
                <strong>{valor}</strong>
              </div>
            ))}
          </div>
          <section className={styles.surface}>
            <div className={styles.surfaceHeading}>
              <h2>Altas por rol</h2>
            </div>
            <div className={styles.surfaceBody}>
              {d.altas.length
                ? d.altas.map((a) => (
                    <p key={a.rol}>
                      {roles[a.rol]} · {a._count._all}
                    </p>
                  ))
                : 'Sin altas en el período.'}
            </div>
          </section>
          <section className={styles.surface}>
            <div className={styles.surfaceHeading}>
              <h2>Suscripciones y cobros</h2>
            </div>
            <div className={styles.surfaceBody}>
              <p className={styles.muted}>
                Estado actual de las suscripciones. Cobros aprobados dentro del período.
              </p>
              {d.suscripciones.map((s) => (
                <p key={s.estado}>
                  {s.estado} · {s._count._all}
                </p>
              ))}
              {d.cobros.length ? (
                d.cobros.map((c) => (
                  <p key={c.moneda}>
                    Cobrado ·{' '}
                    {new Intl.NumberFormat('es-AR', {
                      style: 'currency',
                      currency: c.moneda,
                    }).format(c.monto)}
                  </p>
                ))
              ) : (
                <p>Sin cobros aprobados en el período.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

type Cuenta = {
  id: string;
  nombre: string | null;
  email: string;
  rol: string;
  estudioId: string | null;
  suspendidoAt: string | null;
  createdAt: string;
};
type Suscripcion = {
  id: string;
  plan: string;
  ciclo: string;
  bonificada: boolean;
  renovacion: boolean;
  periodoHasta: string | null;
  estado: string;
  monto: string;
  moneda: string;
  usuario: { email: string };
  pagos: { estado: string }[];
};
type Accion = {
  ruta: string;
  metodo: 'POST' | 'PATCH';
  titulo: string;
  email: string;
  suspendida?: boolean;
  bonificar?: boolean;
};

function Tabla({ encabezados, children }: { encabezados: string[]; children: ReactNode }) {
  return (
    <div className={styles.surface}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {encabezados.map((e) => (
                <th key={e} scope="col">
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
function Listado({ tipo }: { tipo: 'cuentas' | 'suscripciones' }) {
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [aviso, setAviso] = useState('');
  const query = new URLSearchParams({ q: busqueda, pagina: String(pagina) });
  const estado = usePanelData<{ filas: (Cuenta | Suscripcion)[]; siguiente: boolean }>(
    '/admin/' + tipo + '?' + query,
  );
  const filas = estado.datos?.filas || [];
  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusqueda(String(new FormData(e.currentTarget).get('busqueda') || '').trim());
    setPagina(1);
  }
  return (
    <>
      <form className={styles.toolbar} onSubmit={buscar}>
        <label>
          Buscar
          <input
            type="search"
            name="busqueda"
            className="form-control"
            placeholder={tipo === 'cuentas' ? 'Nombre o email' : 'Email de la cuenta'}
            maxLength={254}
          />
        </label>
        <button className={styles.secondaryButton}>Buscar</button>
      </form>
      {aviso && (
        <p className={styles.notice} role="status">
          {aviso}
        </p>
      )}
      <EstadoCarga {...estado} />
      {estado.datos &&
        (filas.length ? (
          <Tabla
            encabezados={
              tipo === 'cuentas'
                ? ['Cuenta', 'Rol', 'Estado', 'Acciones']
                : ['Cuenta', 'Plan', 'Estado', 'Último cobro', 'Acciones']
            }
          >
            {filas.map((f) =>
              'rol' in f ? (
                <tr key={f.id}>
                  <td>
                    <strong>{f.nombre || 'Cuenta'}</strong>
                    <br />
                    {f.email}
                  </td>
                  <td>{roles[f.rol]}</td>
                  <td>{f.suspendidoAt ? 'Suspendida' : 'Habilitada'}</td>
                  <td>
                    {!f.suspendidoAt &&
                      ((f.rol === 'ARTISTA' && !f.estudioId) ||
                        (f.rol === 'ESTUDIO_ADMIN' && f.estudioId)) && (
                        <button
                          className={styles.textButton + ' me-3'}
                          onClick={() =>
                            setAccion({
                              ruta: '/admin/cuentas/' + f.id + '/plan-bonificado',
                              metodo: 'POST',
                              titulo:
                                f.rol === 'ESTUDIO_ADMIN'
                                  ? 'Bonificar plan Estudio'
                                  : 'Bonificar plan Individual',
                              email: f.email,
                              bonificar: true,
                            })
                          }
                        >
                          Bonificar plan
                        </button>
                      )}
                    {f.rol !== 'SUPERADMIN' && (
                      <button
                        className={styles.textButton}
                        onClick={() =>
                          setAccion({
                            ruta: '/admin/cuentas/' + f.id,
                            metodo: 'PATCH',
                            titulo: f.suspendidoAt ? 'Reactivar cuenta' : 'Suspender cuenta',
                            email: f.email,
                            suspendida: !f.suspendidoAt,
                          })
                        }
                      >
                        {f.suspendidoAt ? 'Reactivar' : 'Suspender'}
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <tr key={f.id}>
                  <td>{f.usuario.email}</td>
                  <td>
                    {f.plan} · {f.bonificada ? 'Bonificado' : f.ciclo}
                    {f.bonificada && (
                      <>
                        <br />
                        {f.periodoHasta ? 'Hasta el ' + fecha(f.periodoHasta) : 'Sin vencimiento'}
                      </>
                    )}
                  </td>
                  <td>{f.estado}</td>
                  <td>{f.pagos[0]?.estado || 'Sin cobros'}</td>
                  <td>
                    {f.bonificada && f.estado === 'ACTIVA' && (
                      <button
                        className={styles.textButton}
                        onClick={() =>
                          setAccion({
                            ruta: '/admin/suscripciones/' + f.id + '/revocar-bonificacion',
                            metodo: 'POST',
                            titulo: 'Revocar plan bonificado',
                            email: f.usuario.email,
                          })
                        }
                      >
                        Revocar acceso
                      </button>
                    )}
                    {!f.bonificada &&
                      (f.estado === 'PENDIENTE' ||
                        (f.renovacion && ['ACTIVA', 'PAUSADA'].includes(f.estado))) && (
                        <button
                          className={styles.textButton}
                          onClick={() =>
                            setAccion({
                              ruta: '/admin/suscripciones/' + f.id + '/cancelar',
                              metodo: 'POST',
                              titulo:
                                f.estado === 'PENDIENTE'
                                  ? 'Cancelar intento'
                                  : 'Cancelar renovación',
                              email: f.usuario.email,
                            })
                          }
                        >
                          {f.estado === 'PENDIENTE' ? 'Cancelar intento' : 'Cancelar renovación'}
                        </button>
                      )}
                  </td>
                </tr>
              ),
            )}
          </Tabla>
        ) : (
          <EmptyState titulo="Sin resultados" />
        ))}
      <div className={styles.toolbar}>
        <button
          className={styles.secondaryButton}
          disabled={pagina === 1}
          onClick={() => setPagina(pagina - 1)}
        >
          Anterior
        </button>
        <span>Página {pagina}</span>
        <button
          className={styles.secondaryButton}
          disabled={!estado.datos?.siguiente}
          onClick={() => setPagina(pagina + 1)}
        >
          Siguiente
        </button>
      </div>
      <Modal show={Boolean(accion)} onHide={() => setAccion(null)} centered>
        <Modal.Header closeButton closeLabel="Cerrar">
          <Modal.Title as="h2">{accion?.titulo}</Modal.Title>
        </Modal.Header>
        {accion && (
          <Modal.Body>
            <p>{accion.email}</p>
            <PanelForm
              key={accion.ruta}
              initialValues={{ motivo: '', dias: 30 as number | '' }}
              validate={({ motivo, dias }) => ({
                ...(motivo.trim().length < 5 && {
                  motivo: 'Indicá un motivo de al menos 5 caracteres.',
                }),
                ...(accion.bonificar &&
                  dias !== '' &&
                  (!Number.isInteger(dias) || dias < 1 || dias > 730) && {
                    dias: 'Indicá entre 1 y 730 días.',
                  }),
              })}
              onSave={async ({ motivo, dias }) => {
                await mutarPanel(accion.ruta, accion.metodo, {
                  motivo,
                  suspendida: accion.suspendida,
                  ...(accion.bonificar && { dias: dias === '' ? null : dias }),
                });
                await estado.recargar();
              }}
              onSaved={() => {
                setAviso('Cambio aplicado.');
                setAccion(null);
              }}
            >
              {accion.bonificar && (
                <PanelField
                  name="dias"
                  type="number"
                  label="Días de vigencia"
                  min={1}
                  max={730}
                  step={1}
                  hint="Dejá el campo vacío para otorgar acceso sin vencimiento."
                />
              )}
              <PanelField name="motivo" label="Motivo" required maxLength={240} />
              <PanelSubmitButton>Confirmar</PanelSubmitButton>
            </PanelForm>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
}

type Entrada = {
  id: string;
  accion: string;
  motivo: string;
  createdAt: string;
  autor: { email: string };
  cuenta: { email: string };
};
function Historial() {
  const estado = usePanelData<Entrada[]>('/admin/historial');
  return (
    <>
      <EstadoCarga {...estado} />
      {estado.datos &&
        (estado.datos.length ? (
          <Tabla encabezados={['Fecha', 'Administrador', 'Cuenta', 'Acción', 'Motivo']}>
            {estado.datos.map((e) => (
              <tr key={e.id}>
                <td>{fecha(e.createdAt)}</td>
                <td>{e.autor.email}</td>
                <td>{e.cuenta.email}</td>
                <td>{e.accion.toLowerCase().replaceAll('_', ' ')}</td>
                <td>{e.motivo}</td>
              </tr>
            ))}
          </Tabla>
        ) : (
          <EmptyState titulo="Todavía no hay acciones administrativas" />
        ))}
    </>
  );
}
