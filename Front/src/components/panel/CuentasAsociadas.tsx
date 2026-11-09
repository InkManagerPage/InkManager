import { Suspense } from 'react';
import { ConexionInstagram } from './ConexionInstagram';
import { ConexionWhatsApp } from './ConexionWhatsApp';
import styles from './workspace.module.css';

export function CuentasAsociadas({ estudio = false }: { estudio?: boolean }) {
  return (
    <section
      id="cuentas-asociadas"
      className={styles.settingsSection}
      aria-labelledby="titulo-cuentas-asociadas"
    >
      <div>
        <h2 id="titulo-cuentas-asociadas">Cuentas asociadas</h2>
        <p>Administrá los canales que reciben mensajes en tu bandeja.</p>
      </div>
      <div className="d-grid gap-2">
        <Suspense fallback={<p role="status">Consultando Instagram…</p>}>
          <ConexionInstagram />
        </Suspense>
        {estudio && <ConexionWhatsApp />}
      </div>
    </section>
  );
}
