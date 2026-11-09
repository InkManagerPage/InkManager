'use client';

import Link from 'next/link';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthControls } from '@/components/auth/AuthControls';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/store/AuthProvider';
import styles from './suscripcion.module.css';

type Plan = 'INDIVIDUAL' | 'ESTUDIO';
type Ciclo = 'MENSUAL' | 'ANUAL';
type MedioPago = 'MERCADO_PAGO' | 'TARJETA';

interface CardFormController {
  getCardFormData(): unknown;
  unmount?: () => void;
}

interface CardFormConfig {
  amount: string;
  iframe: true;
  form: {
    id: string;
    cardNumber: { id: string; placeholder: string };
    expirationDate: { id: string; placeholder: string };
    securityCode: { id: string; placeholder: string };
    cardholderName: { id: string; placeholder: string };
    identificationType: { id: string; placeholder: string };
    identificationNumber: { id: string; placeholder: string };
    cardholderEmail: { id: string; placeholder: string };
  };
  callbacks: {
    onFormMounted: (error: unknown) => void;
    onSubmit: (event: { preventDefault: () => void }) => void;
  };
}

interface MercadoPagoClient {
  cardForm(config: CardFormConfig): CardFormController;
}

type MercadoPagoConstructor = new (
  publicKey: string,
  options: { locale: string },
) => MercadoPagoClient;

function esConstructorMercadoPago(valor: unknown): valor is MercadoPagoConstructor {
  return typeof valor === 'function';
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object';
}

const planes: Record<Plan, { titulo: string; mensual: number; rol: string }> = {
  INDIVIDUAL: { titulo: 'Individual', mensual: 12000, rol: 'ARTISTA' },
  ESTUDIO: { titulo: 'Estudio', mensual: 35000, rol: 'ESTUDIO_ADMIN' },
};

const moneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ?? '';

export function Checkout({ planInicial }: { planInicial: Plan }) {
  const router = useRouter();
  const { usuario, cargando } = useAuth();
  const [plan, setPlan] = useState<Plan>(planInicial);
  const [ciclo, setCiclo] = useState<Ciclo>('MENSUAL');
  const [medioPago, setMedioPago] = useState<MedioPago>('MERCADO_PAGO');
  const [procesando, setProcesando] = useState(false);
  const [formularioListo, setFormularioListo] = useState(false);
  const [error, setError] = useState('');
  const precio = ciclo === 'ANUAL' ? planes[plan].mensual * 10 : planes[plan].mensual;
  const cuentaCompatible =
    usuario?.rol === planes[plan].rol && (plan !== 'INDIVIDUAL' || !usuario.estudioId);

  async function continuar() {
    setProcesando(true);
    setError('');
    try {
      const response = await apiFetch('/pagos/crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, ciclo }),
      });
      const resultado: { checkoutUrl?: string } = await response.json();
      if (!resultado.checkoutUrl) {
        throw new Error('Mercado Pago no devolvió el enlace de pago.');
      }
      window.location.assign(resultado.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar el pago.');
      setProcesando(false);
    }
  }

  useEffect(() => {
    if (medioPago !== 'TARJETA' || !usuario || !cuentaCompatible || !publicKey) {
      return;
    }

    let cancelado = false;
    let cardForm: CardFormController | undefined;

    async function montarFormulario() {
      try {
        const sdk = await loadMercadoPago();
        if (cancelado) return;
        if (!esConstructorMercadoPago(sdk)) {
          throw new Error('No pudimos cargar el formulario seguro de Mercado Pago.');
        }

        const mp = new sdk(publicKey, { locale: 'es-AR' });
        cardForm = mp.cardForm({
          amount: String(precio),
          iframe: true,
          form: {
            id: 'form-checkout-card',
            cardNumber: {
              id: 'form-checkout-card__cardNumber',
              placeholder: 'Número de tarjeta',
            },
            expirationDate: {
              id: 'form-checkout-card__expirationDate',
              placeholder: 'MM/AAAA',
            },
            securityCode: {
              id: 'form-checkout-card__securityCode',
              placeholder: 'CVV',
            },
            cardholderName: {
              id: 'form-checkout-card__cardholderName',
              placeholder: 'Nombre del titular',
            },
            identificationType: {
              id: 'form-checkout-card__identificationType',
              placeholder: 'Tipo de documento',
            },
            identificationNumber: {
              id: 'form-checkout-card__identificationNumber',
              placeholder: 'Número de documento',
            },
            cardholderEmail: {
              id: 'form-checkout-card__cardholderEmail',
              placeholder: 'Correo electrónico',
            },
          },
          callbacks: {
            onFormMounted(formError) {
              if (cancelado) return;
              if (formError) {
                setError('No pudimos cargar el formulario seguro de tarjeta.');
                return;
              }
              setFormularioListo(true);
            },
            onSubmit(event) {
              event.preventDefault();
              const datos = cardForm?.getCardFormData();
              const token = esObjeto(datos) ? datos.token : undefined;
              if (typeof token !== 'string' || token.length < 8) {
                setError('Revisá los datos de la tarjeta e intentá nuevamente.');
                return;
              }

              setProcesando(true);
              setError('');
              void (async () => {
                try {
                  const response = await apiFetch('/pagos/crear-suscripcion', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      plan,
                      ciclo,
                      card_token_id: token,
                    }),
                  });
                  const resultado: { paymentProcessing?: boolean } = await response.json();
                  if (resultado.paymentProcessing !== true) {
                    throw new Error('Mercado Pago no pudo iniciar el pago con tarjeta.');
                  }
                  router.replace('/suscripcion/resultado');
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : 'No pudimos iniciar el pago.');
                  setProcesando(false);
                }
              })();
            },
          },
        });
      } catch (cause) {
        if (!cancelado) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'No pudimos cargar el formulario seguro de Mercado Pago.',
          );
        }
      }
    }

    void montarFormulario();
    return () => {
      cancelado = true;
      cardForm?.unmount?.();
    };
  }, [ciclo, cuentaCompatible, medioPago, plan, precio, router, usuario]);

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="checkout-title">
        <Link href="/estudios#planes" className={styles.back}>
          ← Volver a planes
        </Link>
        <p className={styles.eyebrow}>Suscripción InkManager</p>
        <h1 id="checkout-title">Elegí tu plan y forma de pago.</h1>
        <p className={styles.intro}>
          Elegí cómo pagar. Si ingresás una tarjeta, sus datos se tokenizan en los campos seguros de
          Mercado Pago y nunca pasan por los servidores de InkManager.
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
                onChange={() => {
                  setFormularioListo(false);
                  setPlan(clave);
                }}
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
              onChange={() => {
                setFormularioListo(false);
                setCiclo('MENSUAL');
              }}
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
              onChange={() => {
                setFormularioListo(false);
                setCiclo('ANUAL');
              }}
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
              onChange={() => {
                setMedioPago('MERCADO_PAGO');
                setFormularioListo(false);
                setError('');
              }}
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
              onChange={() => {
                setMedioPago('TARJETA');
                setFormularioListo(false);
                setError('');
              }}
            />
            <span>
              <strong>Ingresar una tarjeta de crédito o débito</strong>
              <small>Completá los datos en los campos seguros de Mercado Pago.</small>
            </span>
          </label>
        </fieldset>

        <div className={styles.paymentNote} role="note">
          <strong>Pago protegido por Mercado Pago</strong>
          <span>
            {medioPago === 'TARJETA'
              ? 'La tarjeta se tokeniza de forma segura para configurar los cobros recurrentes. InkManager no recibe el número ni el código de seguridad.'
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
              El plan {planes[plan].titulo} está disponible para{' '}
              {plan === 'INDIVIDUAL' ? 'artistas independientes' : 'titulares de un estudio'}.
            </p>
            <AuthControls contextoRegistro="profesional" />
          </div>
        ) : medioPago === 'MERCADO_PAGO' ? (
          <button type="button" className={styles.submit} onClick={continuar} disabled={procesando}>
            {procesando ? 'Conectando con Mercado Pago…' : 'Continuar con Mercado Pago'}
          </button>
        ) : !publicKey ? (
          <p className={styles.error} role="alert">
            Falta configurar NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY en Front/.env.local para habilitar
            el pago con tarjeta.
          </p>
        ) : (
          <form id="form-checkout-card" className={styles.cardForm}>
            <label className={styles.cardField}>
              <span>Número de tarjeta</span>
              <div id="form-checkout-card__cardNumber" className={styles.secureInput} />
            </label>
            <div className={styles.cardFieldsRow}>
              <label className={styles.cardField}>
                <span>Vencimiento</span>
                <div id="form-checkout-card__expirationDate" className={styles.secureInput} />
              </label>
              <label className={styles.cardField}>
                <span>Código de seguridad</span>
                <div id="form-checkout-card__securityCode" className={styles.secureInput} />
              </label>
            </div>
            <label className={styles.cardField}>
              <span>Nombre del titular</span>
              <input
                id="form-checkout-card__cardholderName"
                className={styles.cardInput}
                placeholder="Nombre como figura en la tarjeta"
                autoComplete="cc-name"
                required
              />
            </label>
            <label className={styles.cardField}>
              <span>Tipo de documento</span>
              <select
                id="form-checkout-card__identificationType"
                className={styles.cardInput}
                required
                defaultValue=""
              >
                <option value="" disabled>
                  Seleccioná el tipo
                </option>
              </select>
            </label>
            <label className={styles.cardField}>
              <span>Número de documento</span>
              <input
                id="form-checkout-card__identificationNumber"
                className={styles.cardInput}
                autoComplete="off"
                inputMode="numeric"
                required
              />
            </label>
            <label className={styles.cardField}>
              <span>Correo electrónico</span>
              <input
                id="form-checkout-card__cardholderEmail"
                className={styles.cardInput}
                type="email"
                autoComplete="email"
                defaultValue={usuario.email}
                required
              />
            </label>
            <button
              type="submit"
              className={styles.submit}
              disabled={procesando || !formularioListo}
            >
              {procesando
                ? 'Procesando tarjeta…'
                : formularioListo
                  ? `Pagar ${moneda.format(precio)}`
                  : 'Cargando formulario seguro…'}
            </button>
          </form>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <p className={styles.footnote}>
          La suscripción se activa únicamente después de que Mercado Pago confirme el primer pago.
          Podés cancelar la renovación desde el enlace seguro que recibirás por correo.
        </p>
      </section>
    </main>
  );
}
