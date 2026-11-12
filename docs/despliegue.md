# Despliegue

El frontend de Next.js está en Vercel y Express está en Render. El navegador consulta la API a través de `/api` en el dominio del frontend. El proxy de `Front/next.config.ts` reenvía las peticiones a Render. Las cookies no incluyen `Domain`: el navegador las guarda para el dominio de Vercel, con HttpOnly, Secure en producción y SameSite=Lax.

## Variables

En Vercel, con `Front` como raíz del proyecto:

```env
API_URL=https://inkmanager.onrender.com/api
```

El valor se utiliza al compilar las reglas del proxy; cambiarlo requiere un nuevo despliegue. Si aún existe `NEXT_PUBLIC_API_URL` con la misma URL de Render, se admite como alternativa. No debe apuntar a `/api` ni al propio frontend, porque produciría un bucle de reenvíos.

En Render, además de las credenciales de base de datos y proveedores:

```env
NODE_ENV=production
FRONTEND_URL=https://ink-manager-woad.vercel.app
GOOGLE_REDIRECT_URI=https://ink-manager-woad.vercel.app/api/auth/google/callback
```

`GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` deben pertenecer al mismo cliente OAuth de Google Cloud. No se incluyen en el frontend.

## Cobros con Mercado Pago

Antes de desplegar, aplicar `npm run db:planes-bonificados` y regenerar Prisma Client. En la aplicación de Mercado Pago, registrar la URL pública de Render con la ruta `/api/webhooks/mercadopago` y activar los eventos de pagos y suscripciones (`payment`, `subscription_preapproval` y `subscription_authorized_payment`). Configurar esa URL, el secreto de firma y el access token en Render.

El plan mensual usa una suscripción de Mercado Pago con renovación automática. El anual usa Checkout Pro y un único pago por doce meses. Verificar ambos con credenciales de prueba, incluida la confirmación por webhook y la cancelación, antes de habilitar las contrataciones con `MERCADOPAGO_COBROS_ACTIVOS=1`.

Desde **Administración → Cuentas**, el superadmin puede bonificar el plan de un artista independiente o titular de estudio, con vencimiento o sin él. Puede revocarlo desde **Suscripciones**. El historial registra el motivo y quién hizo el cambio.

## Cliente de Google

En Google Auth Platform → Clientes → cliente de aplicación web, los URI de redirección autorizados incluyen exactamente:

```text
https://ink-manager-woad.vercel.app/api/auth/google/callback
http://127.0.0.1:3000/api/auth/google/callback
```

Para trabajar con `localhost`, agregar también `http://localhost:3000/api/auth/google/callback` y usar ese host en la configuración local. Google compara protocolo, dominio, puerto y ruta; una diferencia produce `redirect_uri_mismatch`. El origen JavaScript, si se configura, es solo el origen de la página y no reemplaza el URI de redirección.

El callback pasa por Vercel y lo procesa Express, donde se validan state, nonce y PKCE. El backend crea la sesión propia y devuelve al frontend. No se transmiten tokens de sesión por query ni se guardan en localStorage.

## Sesión

`GET /api/auth/me` devuelve `401` cuando no hay sesión, cuando expiró o después de cerrar sesión. `AuthProvider` lo interpreta como visitante anónimo. Si ocurre inmediatamente después de un login exitoso, revisar que inicio, callback y consultas usen el proxy `/api` del frontend.

Una sesión creada previamente en el dominio de Render no se comparte con Vercel; es necesario volver a iniciar sesión después de cambiar esta configuración.
