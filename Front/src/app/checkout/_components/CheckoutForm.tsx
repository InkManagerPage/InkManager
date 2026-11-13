'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { LoginModal } from '@/app/(auth)/Login/Login';
import { RegisterModal } from '@/app/(auth)/Register/Register';
import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/store/AuthProvider';
import styles from './checkout.module.css';

type PlanId = 'INDIVIDUAL' | 'ESTUDIO';
type Brand = 'VISA' | 'MASTERCARD' | 'AMEX' | 'DISCOVER' | 'DINERS' | 'MAESTRO' | null;
type CardFields = {
  number: string;
  holder: string;
  expiry: string;
  securityCode: string;
  identificationNumber: string;
};
type FieldErrors = Partial<Record<keyof CardFields, string>>;
type Plan = {
  id: PlanId;
  nombre: string;
  mensual: number;
  anual: number;
  moneda: 'ARS';
};
type BillingCycle = 'MENSUAL' | 'ANUAL';
type PaymentOption = 'CARD' | 'CHECKOUT_PRO';
type PaymentMethod = { id: string; payment_type_id?: string };
type MercadoPago = {
  createCardToken: (card: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<{ id: string }>;
  getPaymentMethods: (params: { bin: string }) => Promise<{ results?: PaymentMethod[] }>;
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options: { locale: 'es-AR' }) => MercadoPago;
  }
}

const initialFields: CardFields = {
  number: '',
  holder: '',
  expiry: '',
  securityCode: '',
  identificationNumber: '',
};

function detectarMarca(numero: string): Brand {
  if (/^4/.test(numero)) return 'VISA';
  const bin = Number(numero.slice(0, 4));
  if (/^5[1-5]/.test(numero) || (numero.length >= 4 && bin >= 2221 && bin <= 2720)) {
    return 'MASTERCARD';
  }
  if (/^(34|37)/.test(numero)) return 'AMEX';
  if (/^(6011|65|64[4-9])/.test(numero)) return 'DISCOVER';
  if (/^(36|38|30[0-5])/.test(numero)) return 'DINERS';
  if (/^(50|56|57|58|6)/.test(numero)) return 'MAESTRO';
  return null;
}

function validarLuhn(numero: string): boolean {
  let suma = 0;
  let duplicar = false;
  for (let indice = numero.length - 1; indice >= 0; indice -= 1) {
    let digito = Number(numero[indice]);
    if (duplicar) {
      digito *= 2;
      if (digito > 9) digito -= 9;
    }
    suma += digito;
    duplicar = !duplicar;
  }
  return suma % 10 === 0;
}

function validarCampos(fields: CardFields): FieldErrors {
  const errores: FieldErrors = {};
  const numero = fields.number.replace(/\D/g, '');
  if (numero.length < 13 || numero.length > 19 || !validarLuhn(numero)) {
    errores.number = 'Ingresá un número de tarjeta válido.';
  }
  if (fields.holder.trim().length < 3 || fields.holder.trim().length > 80) {
    errores.holder = 'Ingresá el nombre tal como aparece en la tarjeta.';
  }

  const fecha = /^(\d{2})\/(\d{2})$/.exec(fields.expiry);
  if (!fecha) {
    errores.expiry = 'Usá el formato MM/AA.';
  } else {
    const mes = Number(fecha[1]);
    const anio = 2000 + Number(fecha[2]);
    const hoy = new Date();
    if (
      mes < 1 ||
      mes > 12 ||
      anio < hoy.getFullYear() ||
      (anio === hoy.getFullYear() && mes < hoy.getMonth() + 1)
    ) {
      errores.expiry = 'La tarjeta está vencida o la fecha no es válida.';
    }
  }

  if (!/^\d{3,4}$/.test(fields.securityCode)) {
    errores.securityCode = 'Ingresá un código de seguridad de 3 o 4 dígitos.';
  }
  if (!/^\d{7,11}$/.test(fields.identificationNumber)) {
    errores.identificationNumber = 'Ingresá un DNI válido, sin puntos.';
  }
  return errores;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function isPlan(value: unknown): value is Plan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Record<string, unknown>;
  return (
    (plan.id === 'INDIVIDUAL' || plan.id === 'ESTUDIO') &&
    typeof plan.nombre === 'string' &&
    typeof plan.mensual === 'number' &&
    typeof plan.anual === 'number' &&
    plan.moneda === 'ARS'
  );
}

function brandLabel(brand: Brand) {
  if (!brand) return 'TARJETA';
  return brand === 'MASTERCARD' ? 'mastercard' : brand.toLowerCase();
}

function isMercadoPagoCheckoutUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['mercadopago.com', 'mercadopago.com.ar'].some(
        (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      )
    );
  } catch {
    return false;
  }
}

export default function CheckoutForm({ planId, cycleId }: { planId: string; cycleId: string }) {
  const router = useRouter();
  const { usuario, cargando: cargandoSesion } = useAuth();
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CardFields, boolean>>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState('');
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('CARD');
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [ciclo, setCiclo] = useState<BillingCycle>(cycleId === 'ANUAL' ? 'ANUAL' : 'MENSUAL');
  const cicloValido = cycleId === 'ANUAL' || cycleId === 'MENSUAL';
  const importe = plan ? (ciclo === 'ANUAL' ? plan.anual : plan.mensual) : 0;
  const numero = fields.number.replace(/\D/g, '');
  const marca = useMemo(() => detectarMarca(numero), [numero]);
  const keyPublica =
    process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ??
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

  useEffect(() => {
    const controller = new AbortController();
    async function cargarPlanes() {
      try {
        const response = await apiFetch('pagos/planes', { signal: controller.signal });
        const body: unknown = await response.json();
        if (
          typeof body !== 'object' ||
          body === null ||
          !('plans' in body) ||
          !Array.isArray(body.plans)
        ) {
          throw new Error('No pudimos consultar los planes disponibles.');
        }
        const plans = body.plans.filter(isPlan);
        if (!cicloValido) throw new Error('Seleccioná una frecuencia de pago válida.');
        const elegido = plans.find((item) => item.id === planId);
        if (!elegido) throw new Error('El plan seleccionado no está disponible.');
        setPlan(elegido);
        setPlanError('');
      } catch (cause) {
        if (controller.signal.aborted) return;
        setPlanError(cause instanceof Error ? cause.message : 'No pudimos cargar el plan.');
      } finally {
        if (!controller.signal.aborted) setLoadingPlan(false);
      }
    }

    void cargarPlanes();
    return () => controller.abort();
  }, [planId, cicloValido]);

  function cambiarCampo<K extends keyof CardFields>(key: K, value: CardFields[K]) {
    const next = { ...fields, [key]: value };
    setFields(next);
    if (touched[key]) {
      const validation = validarCampos(next);
      setErrors((current) => ({ ...current, [key]: validation[key] }));
    }
  }

  function marcarCampo(key: keyof CardFields) {
    setTouched((current) => ({ ...current, [key]: true }));
    const validation = validarCampos(fields);
    setErrors((current) => ({ ...current, [key]: validation[key] }));
  }

  function actualizarNumero(value: string) {
    cambiarCampo('number', value.replace(/\D/g, '').slice(0, 19));
  }

  function actualizarVencimiento(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    cambiarCampo('expiry', digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
  }

  function mensajeDeErrorDePago(cause: unknown): string {
    if (cause instanceof Error) return cause.message;
    if (typeof cause === 'object' && cause !== null) {
      if ('cause' in cause && Array.isArray(cause.cause)) {
        const detalles = (cause.cause as Array<{ description?: unknown; code?: unknown }>)
          .map((item) => item.description ?? item.code)
          .filter((texto): texto is string => typeof texto === 'string')
          .join(' ');
        if (detalles) return `Mercado Pago rechazó el pago: ${detalles}`;
      }
      if ('message' in cause && typeof cause.message === 'string') {
        return `Mercado Pago rechazó el pago: ${cause.message}`;
      }
    }
    return 'No pudimos procesar el pago.';
  }

  async function enviarPago(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setTouched({
      number: true,
      holder: true,
      expiry: true,
      securityCode: true,
      identificationNumber: true,
    });
    const validation = validarCampos(fields);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    if (!usuario || !plan) {
      setError('Iniciá sesión y seleccioná un plan para continuar.');
      return;
    }
    if (!keyPublica) {
      setError('Los pagos no están configurados. Intentá nuevamente más tarde.');
      return;
    }
    if (!sdkReady || !window.MercadoPago) {
      setError('Estamos conectando con Mercado Pago. Esperá un momento e intentá de nuevo.');
      return;
    }

    setLoading(true);
    try {
      const [mes = '', anio = ''] = fields.expiry.split('/');
      const mercadoPago = new window.MercadoPago(keyPublica, { locale: 'es-AR' });
      const token = await mercadoPago.createCardToken({
        cardNumber: numero,
        cardholderName: fields.holder.trim(),
        cardExpirationMonth: mes,
        cardExpirationYear: `20${anio}`,
        securityCode: fields.securityCode,
        identificationType: 'DNI',
        identificationNumber: fields.identificationNumber,
      });

      if (!token.id) throw new Error('Mercado Pago no pudo tokenizar la tarjeta.');

      let paymentMethodId: string | undefined;
      if (ciclo === 'ANUAL') {
        const paymentMethods = await mercadoPago.getPaymentMethods({ bin: numero.slice(0, 6) });
        paymentMethodId = paymentMethods.results?.find(
          (method) =>
            method.payment_type_id === 'credit_card' || method.payment_type_id === 'debit_card',
        )?.id;
        if (!paymentMethodId) {
          throw new Error('Mercado Pago no pudo identificar el medio de pago de la tarjeta.');
        }
      }

      setFields(initialFields);
      setErrors({});
      const response = await apiFetch('pagos/crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan.id,
          ciclo,
          card_token_id: token.id,
          ...(ciclo === 'ANUAL'
            ? {
                payment_method_id: paymentMethodId,
                identification_number: fields.identificationNumber,
              }
            : {}),
        }),
      });
      const body: unknown = await response.json();
      
      // Validar respuesta según el tipo de ciclo
      if (typeof body !== 'object' || body === null || !('subscriptionId' in body)) {
        throw new Error('No pudimos confirmar el estado de la suscripción.');
      }
      
      if (ciclo === 'MENSUAL') {
        // Para MENSUAL: el backend siempre retorna Checkout Pro (checkoutUrl)
        if (
          !('checkoutUrl' in body) ||
          !isMercadoPagoCheckoutUrl(body.checkoutUrl)
        ) {
          throw new Error('Mercado Pago no devolvió un enlace de pago válido.');
        }
        window.location.assign(body.checkoutUrl);
      } else {
        // Para ANUAL+TARJETA: retorna paymentProcessing
        if (
          !('paymentProcessing' in body) ||
          body.paymentProcessing !== true
        ) {
          throw new Error('No pudimos procesar el pago.');
        }
        router.replace(
          `/checkout/pending?subscription_id=${encodeURIComponent(body.subscriptionId as string)}`,
        );
      }
    } catch (cause) {
      console.error('[pago con tarjeta] Error al procesar el pago:', cause);
      setError(mensajeDeErrorDePago(cause));
    } finally {
      setLoading(false);
    }
  }

  async function continuarCheckoutPro() {
    setError('');
    if (!usuario || !plan) {
      setError('Iniciá sesión y seleccioná un plan para continuar.');
      return;
    }
    setLoading(true);
    try {
      const response = await apiFetch('pagos/crear-suscripcion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id, ciclo }),
      });
      const body: unknown = await response.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('checkoutUrl' in body) ||
        !isMercadoPagoCheckoutUrl(body.checkoutUrl)
      ) {
        throw new Error('Mercado Pago no devolvió un enlace de pago válido.');
      }
      window.location.assign(body.checkoutUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos iniciar el checkout.');
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
        onError={() => setSdkError('No pudimos cargar el SDK seguro de Mercado Pago.')}
      />
      <main className={styles.page}>
        <div className={styles.shell}>
          <Link className={styles.backLink} href="/estudios#planes">
            <span aria-hidden="true">←</span> Volver a los planes
          </Link>
          <header className={styles.heading}>
            <p className={styles.eyebrow}>Checkout seguro</p>
            <h1>Tu próximo paso, con InkManager.</h1>
            <p>
              {paymentOption === 'CARD'
                ? 'Tu tarjeta se tokeniza de forma segura en Mercado Pago. InkManager nunca recibe ni guarda sus datos.'
                : 'En Checkout Pro elegís los medios disponibles de Mercado Pago. InkManager no recibe ni guarda datos de pago.'}
            </p>
          </header>

          {loadingPlan ? (
            <p className={styles.feedback} role="status">
              Cargando el plan...
            </p>
          ) : planError ? (
            <div className={styles.feedbackError} role="alert">
              <p>{planError}</p>
              <Link href="/estudios#planes">Ver planes disponibles</Link>
            </div>
          ) : plan ? (
            <div className={styles.checkoutGrid}>
              <section
                className={styles.formCard}
                aria-labelledby={paymentOption === 'CARD' ? 'card-payment-title' : 'payment-title'}
              >
                {!cargandoSesion && !usuario ? (
                  <div className={styles.authGate}>
                    <h2>Iniciá sesión para continuar</h2>
                    <p>La suscripción quedará asociada a tu cuenta de InkManager.</p>
                    <div className={styles.authActions}>
                      <button
                        type="button"
                        className={styles.submitButton}
                        onClick={() => setAuthModal('login')}
                      >
                        Iniciar sesión
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => setAuthModal('register')}
                      >
                        Crear cuenta
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.cycleOptions} aria-label="Elegí la frecuencia de pago">
                      <button
                        type="button"
                        className={styles.cycleOption}
                        aria-pressed={ciclo === 'MENSUAL'}
                        onClick={() => setCiclo('MENSUAL')}
                      >
                        <strong>Mensual</strong>
                        <span>Renovación automática · {formatCurrency(plan.mensual)} / mes</span>
                      </button>
                      <button
                        type="button"
                        className={styles.cycleOption}
                        aria-pressed={ciclo === 'ANUAL'}
                        onClick={() => setCiclo('ANUAL')}
                      >
                        <strong>Anual · 2 meses bonificados</strong>
                        <span>Un pago por 12 meses · {formatCurrency(plan.anual)} / año</span>
                      </button>
                    </div>
                    <div className={styles.paymentOptions} aria-label="Elegí el método de pago">
                      <button
                        type="button"
                        className={styles.paymentOption}
                        aria-pressed={paymentOption === 'CARD'}
                        onClick={() => {
                          setPaymentOption('CARD');
                          setError('');
                        }}
                      >
                        <strong>Tarjeta</strong>
                        <span>Crédito o débito</span>
                      </button>
                      <button
                        type="button"
                        className={styles.paymentOption}
                        aria-pressed={paymentOption === 'CHECKOUT_PRO'}
                        onClick={() => {
                          setPaymentOption('CHECKOUT_PRO');
                          setError('');
                        }}
                      >
                        <strong>Mercado Pago</strong>
                        <span>Elegí los medios disponibles en Checkout Pro</span>
                      </button>
                    </div>
                    {paymentOption === 'CHECKOUT_PRO' && (
                      <div className={styles.checkoutPro}>
                        <div className={styles.formHeading}>
                          <span className={styles.step}>01</span>
                          <div>
                            <p className={styles.eyebrow}>Pago protegido por Mercado Pago</p>
                            <h2 id="payment-title">Continuá en Mercado Pago</h2>
                          </div>
                        </div>
                        <p>
                          En Checkout Pro vas a poder elegir entre los medios que Mercado Pago
                          habilite para tu cuenta y este plan.
                        </p>
                        {error && (
                          <p className={styles.formError} role="alert">
                            {error}
                          </p>
                        )}
                        <button
                          type="button"
                          className={styles.submitButton}
                          onClick={() => void continuarCheckoutPro()}
                          disabled={loading || !usuario}
                        >
                          {loading
                            ? 'Conectando con Mercado Pago...'
                            : ciclo === 'ANUAL'
                              ? `Pagar ${formatCurrency(importe)} por el año`
                              : `Suscribirme por ${formatCurrency(importe)} / mes`}
                          {!loading && <span aria-hidden="true">→</span>}
                        </button>
                        <p className={styles.secureNote}>
                          <span aria-hidden="true">✦</span>
                          {ciclo === 'ANUAL'
                            ? 'Pago único seguro por 12 meses. Sin renovación automática.'
                            : 'La suscripción mensual se confirma en Mercado Pago y se renueva automáticamente.'}
                        </p>
                      </div>
                    )}
                    <div hidden={paymentOption !== 'CARD'}>
                      <div className={styles.formHeading}>
                        <span className={styles.step}>01</span>
                        <div>
                          <p className={styles.eyebrow}>
                            Pago {ciclo === 'ANUAL' ? 'anual único' : 'mensual recurrente'}
                          </p>
                          <h2 id="card-payment-title">Tarjeta de crédito o débito</h2>
                        </div>
                      </div>
                      <div
                        className={`${styles.cardPreview} ${marca ? styles[`brand${marca}`] : ''}`}
                        aria-label={`Vista previa de tarjeta ${marca ?? ''}`}
                      >
                        <div className={styles.cardTop}>
                          <span className={styles.chip} aria-hidden="true">
                            <i />
                          </span>
                          <span className={styles.brand} aria-label={marca ?? 'Tarjeta'}>
                            {marca === 'MASTERCARD' ? (
                              <span className={styles.mastercardLogo} aria-hidden="true">
                                <i />
                                <i />
                              </span>
                            ) : (
                              brandLabel(marca)
                            )}
                          </span>
                        </div>
                        <p className={styles.previewNumber} aria-live="polite">
                          {numero
                            ? numero.replace(/(.{4})/g, '$1 ').trim()
                            : '••••  ••••  ••••  ••••'}
                        </p>
                        <div className={styles.cardBottom}>
                          <div>
                            <span className={styles.previewLabel}>TITULAR</span>
                            <span className={styles.previewValue}>
                              {fields.holder || 'NOMBRE Y APELLIDO'}
                            </span>
                          </div>
                          <div>
                            <span className={styles.previewLabel}>VENCE</span>
                            <span className={styles.previewValue}>{fields.expiry || 'MM/AA'}</span>
                          </div>
                        </div>
                      </div>

                      <form className={styles.form} onSubmit={enviarPago} noValidate>
                        <label className={styles.field}>
                          <span>Número de tarjeta</span>
                          <input
                            autoComplete="cc-number"
                            inputMode="numeric"
                            name="cardNumber"
                            value={numero.replace(/(\d{4})(?=\d)/g, '$1 ')}
                            onChange={(event) => actualizarNumero(event.target.value)}
                            onBlur={() => marcarCampo('number')}
                            placeholder="0000 0000 0000 0000"
                            aria-invalid={Boolean(errors.number)}
                            aria-describedby={errors.number ? 'card-number-error' : undefined}
                          />
                          {errors.number && <small id="card-number-error">{errors.number}</small>}
                        </label>

                        <label className={styles.field}>
                          <span>Nombre del titular</span>
                          <input
                            autoComplete="cc-name"
                            maxLength={80}
                            name="cardholderName"
                            value={fields.holder}
                            onChange={(event) => cambiarCampo('holder', event.target.value)}
                            onBlur={() => marcarCampo('holder')}
                            placeholder="Como aparece en la tarjeta"
                            aria-invalid={Boolean(errors.holder)}
                            aria-describedby={errors.holder ? 'card-holder-error' : undefined}
                          />
                          {errors.holder && <small id="card-holder-error">{errors.holder}</small>}
                        </label>

                        <div className={styles.row}>
                          <label className={styles.field}>
                            <span>Vencimiento</span>
                            <input
                              autoComplete="cc-exp"
                              inputMode="numeric"
                              name="cardExpiry"
                              value={fields.expiry}
                              onChange={(event) => actualizarVencimiento(event.target.value)}
                              onBlur={() => marcarCampo('expiry')}
                              placeholder="MM/AA"
                              aria-invalid={Boolean(errors.expiry)}
                              aria-describedby={errors.expiry ? 'card-expiry-error' : undefined}
                            />
                            {errors.expiry && <small id="card-expiry-error">{errors.expiry}</small>}
                          </label>
                          <label className={styles.field}>
                            <span>Código de seguridad</span>
                            <input
                              autoComplete="cc-csc"
                              inputMode="numeric"
                              maxLength={4}
                              name="securityCode"
                              type="password"
                              value={fields.securityCode}
                              onChange={(event) =>
                                cambiarCampo(
                                  'securityCode',
                                  event.target.value.replace(/\D/g, '').slice(0, 4),
                                )
                              }
                              onBlur={() => marcarCampo('securityCode')}
                              placeholder="•••"
                              aria-invalid={Boolean(errors.securityCode)}
                              aria-describedby={errors.securityCode ? 'card-cvv-error' : undefined}
                            />
                            {errors.securityCode && (
                              <small id="card-cvv-error">{errors.securityCode}</small>
                            )}
                          </label>
                        </div>

                        <label className={styles.field}>
                          <span>DNI del titular</span>
                          <input
                            autoComplete="off"
                            inputMode="numeric"
                            maxLength={11}
                            name="identificationNumber"
                            value={fields.identificationNumber}
                            onChange={(event) =>
                              cambiarCampo(
                                'identificationNumber',
                                event.target.value.replace(/\D/g, '').slice(0, 11),
                              )
                            }
                            onBlur={() => marcarCampo('identificationNumber')}
                            placeholder="Sin puntos"
                            aria-invalid={Boolean(errors.identificationNumber)}
                            aria-describedby={
                              errors.identificationNumber ? 'card-dni-error' : undefined
                            }
                          />
                          {errors.identificationNumber && (
                            <small id="card-dni-error">{errors.identificationNumber}</small>
                          )}
                        </label>

                        {(sdkError || !keyPublica) && (
                          <p className={styles.formError} role="alert">
                            {sdkError || 'Falta configurar la clave pública de Mercado Pago.'}
                          </p>
                        )}
                        {error && (
                          <p className={styles.formError} role="alert">
                            {error}
                          </p>
                        )}
                        <button
                          type="submit"
                          className={styles.submitButton}
                          disabled={loading || !sdkReady || !usuario || !keyPublica}
                        >
                          {loading
                            ? 'Procesando...'
                            : ciclo === 'ANUAL'
                              ? `Pagar ${formatCurrency(importe)} por el año`
                              : `Suscribirme por ${formatCurrency(importe)} / mes`}
                          {!loading && <span aria-hidden="true">→</span>}
                        </button>
                        <p className={styles.secureNote}>
                          <span aria-hidden="true">✦</span>
                          {ciclo === 'ANUAL'
                            ? 'Pago único seguro por 12 meses. Sin renovación automática.'
                            : 'Pago protegido por Mercado Pago. Renovación automática mensual.'}
                        </p>
                      </form>
                    </div>
                  </>
                )}
              </section>

              <aside className={styles.summary} aria-label="Resumen de la suscripción">
                <p className={styles.eyebrow}>Tu suscripción</p>
                <h2>Plan {plan.nombre}</h2>
                <p className={styles.summaryPrice}>
                  {formatCurrency(importe)} <span>/ {ciclo === 'ANUAL' ? 'año' : 'mes'}</span>
                </p>
                <div className={styles.summaryDivider} />
                <p>
                  {ciclo === 'ANUAL'
                    ? 'Un único pago cubre 12 meses. Pagás 10 meses y recibís 2 meses bonificados.'
                    : 'Se renueva automáticamente cada mes. Podés cancelarlo cuando quieras.'}
                </p>
                <div className={styles.summarySecure}>
                  <span aria-hidden="true">◎</span>
                  <span>
                    {paymentOption === 'CARD'
                      ? 'Los datos de tu tarjeta se envían directamente a Mercado Pago y no se guardan en InkManager.'
                      : 'El pago se completa en Checkout Pro de Mercado Pago sin compartir tus datos de pago con InkManager.'}
                  </span>
                </div>
              </aside>
            </div>
          ) : null}
          <footer className={styles.footer}>
            InkManager · Suscripciones procesadas por Mercado Pago
          </footer>
        </div>
      </main>
      <LoginModal
        show={authModal === 'login'}
        onHide={() => setAuthModal(null)}
        onSwitch={() => setAuthModal('register')}
      />
      <RegisterModal
        show={authModal === 'register'}
        onHide={() => setAuthModal(null)}
        onSwitch={() => setAuthModal('login')}
        contexto="profesional"
      />
    </>
  );
}
