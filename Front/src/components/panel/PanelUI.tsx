import type { ReactNode } from 'react';
import styles from './workspace.module.css';

const iconos = {
  estadisticas: 'M3 3v18h18M7 16v-4M12 16V8M17 16V5',
  resumen: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  consultas: 'M5 3h14v18H5zM9 8h6M9 12h6M9 16h3',
  agenda: 'M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2',
  clientes:
    'M15 21v-3a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v3M17 14a4 4 0 0 1 4 4v3M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 3a4 4 0 0 1 0 7',
  mensajes: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H3l1.7-4A8.5 8.5 0 1 1 21 11.5zM8 10h8M8 14h5',
  trabajos: 'M3 3h18v18H3zM3 16l5-5 5 5 3-3 5 5M16 7h.01',
  perfil: 'M20 21v-2a7 7 0 0 0-14 0v2M13 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  estudio: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-7h6v7M9 10h6',
  ajustes: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  campana: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  flecha: 'M5 12h14M14 7l5 5-5 5',
  volver: 'M19 12H5M10 7l-5 5 5 5',
  chevron: 'M9 5l7 7-7 7',
  menu: 'M4 6h16M4 12h16M4 18h16',
  cerrar: 'M6 6l12 12M18 6 6 18',
  buscar: 'M21 21l-5-5M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14',
  mas: 'M12 5v14M5 12h14',
  check: 'M5 12l4 4L19 6',
  salir: 'M9 21H4V3h5M12 12h9M17 8l4 4-4 4',
  reloj: 'M12 8v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  enviar: 'm22 2-7 20-4-9-9-4 20-7zM22 2 11 13',
  suscripcion: 'M3 5h18v14H3zM3 10h18M7 15h4',
  recordatorios: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M18 3l3 3M3 6l3-3',
} as const;
export type IconoPanel = keyof typeof iconos;
export function PanelIcon({ nombre, size = 20 }: { nombre: IconoPanel; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconos[nombre]} />
    </svg>
  );
}
export function PageHeader({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
      </div>
      {children && <div className={styles.headerActions}>{children}</div>}
    </header>
  );
}
export function Avatar({ nombre, grande = false }: { nombre: string; grande?: boolean }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('');
  return (
    <span className={`${styles.avatar} ${grande ? styles.avatarLarge : ''}`} aria-hidden="true">
      {iniciales}
    </span>
  );
}
const estados: Record<string, { nombre: string; clase: string }> = {
  NUEVA: { nombre: 'Nueva', clase: 'statusNew' },
  EN_REVISION: { nombre: 'En revisión', clase: 'statusPending' },
  PRESUPUESTADA: { nombre: 'Presupuestada', clase: 'statusGood' },
  ARCHIVADA: { nombre: 'Archivada', clase: 'statusMuted' },
  PENDIENTE: { nombre: 'Por confirmar', clase: 'statusPending' },
  CONFIRMADA: { nombre: 'Confirmada', clase: 'statusGood' },
  COMPLETADA: { nombre: 'Completada', clase: 'statusMuted' },
  CANCELADA: { nombre: 'Cancelada', clase: 'statusMuted' },
};
export function StatusBadge({ estado }: { estado: string }) {
  const opcion = estados[estado];
  return (
    <span className={`${styles.status} ${opcion ? styles[opcion.clase] : ''}`}>
      {opcion?.nombre || estado}
    </span>
  );
}
export function EmptyState({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle?: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.emptyState}>
      <PanelIcon nombre="consultas" size={28} />
      <h2>{titulo}</h2>
      {detalle && <p>{detalle}</p>}
      {children}
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = 'Buscar…',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className={styles.search}>
      <PanelIcon nombre="buscar" size={18} />
      <span className="visually-hidden">{placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
