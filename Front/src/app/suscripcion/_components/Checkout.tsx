'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthControls } from '@/components/auth/AuthControls';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/store/AuthProvider';
import styles from './suscripcion.module.css';

type Plan = 'INDIVIDUAL' | 'ESTUDIO';
type Ciclo = 'MENSUAL' | 'ANUAL';
type MedioPago = 'MERCADO_PAGO' | 'TARJETA';

const planes: Record<Plan, { titulo: string; mensual: number; rol: string }> = {
  INDIVIDUAL: { titulo: 'Individual', mensual: 12000, rol: 'ARTISTA' },
  ESTUDIO: { titulo: 'Estudio', mensual: 35000, rol: 'ESTUDIO_ADMIN' },
};

const moneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function Checkout({ planInicial }: { planInicial: Plan }) {
  const { usuario, cargando } = useAuth();
  const [plan, setPlan] = useState<Plan>(planInicial);
  const [ciclo, setCiclo] = useState<Ciclo>('MENSUAL');
  const [medioPago, setMedioPago] = useState<MedioPago>('MERCADO_PAGO');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const precio = ciclo === 'ANUAL' ? planes[plan].mensual * 10 : planes[plan].mensual;
  const cuentaCompatible = usuario?.rol === planes[plan].rol;

  async function continuar() {
    setProcesando(true);
    setError('');
    try {
      const response = await apiFetch('/pagos/crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, ciclo }),
      });
      const resultado: { checkoutUrl: string } = await response.json();
      window.location.assign(resultado.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar el pago.');
      setProcesando(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="checkout-title">
        <Link href="/estudios#planes" className={styles.back}>
          ← Volver a planes
        </Link>
        <p className={styles.eyebrow}>Suscripción InkManager</p>
        <h1 id="checkout-title">Elegí tu plan y forma de pago.</h1>
        <p className={styles.intro}>
          El pago se completa en el checkout seguro de Mercado Pago. InkManager no recibe ni
          almacena los datos de tu tarjeta.
        </p>

        <fieldset className={styles.fieldset}>
          <legend>Plan</legend>
          {(Object.keys(planes) as Plan[]).map((clave) => (
            <label className={styles.option} key={clave}>
              <input
                type="radio"
                name="plan"
                value={clave}
                checked={plan === clave}
                onChange={() => setPlan(clave)}
              />
              <span>
                <strong>{planes[clave].titulo}</strong>
                <small>
                  {moneda.format(planes[clave].mensual)} por mes ·{' '}
                  {moneda.format(planes[clave].mensual * 10)} por año
                </small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Frecuencia de cobro</legend>
          <label className={styles.option}>
            <input
              type="radio"
              name="ciclo"
              value="MENSUAL"
              checked={ciclo === 'MENSUAL'}
              onChange={() => setCiclo('MENSUAL')}
            />
            <span>
              <strong>Mensual</strong>
              <small>{moneda.format(planes[plan].mensual)} cada mes</small>
            </span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="ciclo"
              value="ANUAL"
              checked={ciclo === 'ANUAL'}
              onChange={() => setCiclo('ANUAL')}
            />
            <span>
              <strong>Anual · 2 meses bonificados</strong>
              <small>{moneda.format(planes[plan].mensual * 10)} cada 12 meses</small>
            </span>
          </label>
        </fieldset>

        <div className={styles.summary}>
          <span>
            {planes[plan].titulo} · {ciclo === 'ANUAL' ? 'anual' : 'mensual'}
          </span>
          <strong>{moneda.format(precio)}</strong>
        </div>

        <fieldset className={styles.fieldset}>
          <legend>¿Cómo querés pagar?</legend>
          <label className={styles.option}>
            <input
              type="radio"
              name="medio-pago"
              value="MERCADO_PAGO"
              checked={medioPago === 'MERCADO_PAGO'}
              onChange={() => setMedioPago('MERCADO_PAGO')}
            />
            <span>
              <strong>Con mi cuenta de Mercado Pago</strong>
              <small>Usá un medio de pago guardado o las opciones disponibles en tu cuenta.</small>
            </span>
          </label>
          <label className={styles.option}>
            <input
              type="radio"
              name="medio-pago"
              value="TARJETA"
              checked={medioPago === 'TARJETA'}
              onChange={() => setMedioPago('TARJETA')}
            />
            <span>
              <strong>Ingresar una tarjeta de crédito o débito</strong>
              <small>Podés continuar como invitado en el checkout seguro de Mercado Pago.</small>
            </span>
          </label>
        </fieldset>

        <div className={styles.paymentNote} role="note">
          <strong>Pago protegido por Mercado Pago</strong>
          <span>
            {medioPago === 'TARJETA'
              ? 'La tarjeta se ingresa únicamente en Mercado Pago. InkManager nunca recibe ni almacena el número o código de seguridad. La renovación seguirá el ciclo elegido.'
              : 'Mercado Pago confirma el medio disponible para los cargos recurrentes. La renovación seguirá el ciclo elegido.'}
          </span>
        </div>

        {cargando ? (
          <p role="status">Comprobando tu sesión…</p>
        ) : !usuario ? (
          <div className={styles.auth}>
            <p>Iniciá sesión o creá una cuenta profesional para continuar.</p>
            <AuthControls contextoRegistro="profesional" />
          </div>
        ) : !cuentaCompatible ? (
          <div className={styles.auth}>
            <p className={styles.error} role="alert">
              El plan {planes[plan].titulo} requiere una cuenta de tipo {planes[plan].rol}. Cerrá
              sesión para entrar con otra cuenta o elegí el plan que corresponda a tu perfil.
            </p>
            <AuthControls contextoRegistro="profesional" />
          </div>
        ) : (
          <button type="button" className={styles.submit} onClick={continuar} disabled={procesando}>
            {procesando
              ? 'Conectando con Mercado Pago…'
              : medioPago === 'TARJETA'
                ? 'Continuar para ingresar tarjeta'
                : 'Continuar con Mercado Pago'}
          </button>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.footnote}>
          Podés cancelar la renovación desde el enlace seguro que recibirás por correo al
          confirmarse el primer pago.
        </p>
      </section>
    </main>
  );
}
