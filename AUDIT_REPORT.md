# MERCADO PAGO PAYMENT INTEGRATION AUDIT REPORT
Generated: $(date)

## CRITICAL ISSUES BLOCKING PAYMENT PROCESSING

### ISSUE #1: Missing GET /pagos/planes Endpoint
**Severity:** CRITICAL  
**File:** Back/src/pagos/pagos.routes.ts  
**Problem:**
- Frontend (CheckoutForm.tsx:211) calls: `apiFetch('pagos/planes', { signal: controller.signal })`
- This endpoint is NOT defined in pagos.routes.ts
- Only defined routes are: POST /crear-suscripcion, POST /cancelar-suscripcion, GET /suscripcion

**Impact:**
- Payment form cannot load available plans
- Frontend receives 404 error
- Shows "No pudimos consultar los planes disponibles" error
- User cannot proceed to payment

**Frontend Expectation:**
```javascript
const response = await apiFetch('pagos/planes', { signal: controller.signal });
// Expects response format: { plans: Array<{id, nombre, mensual, anual, moneda}> }
```

---

### ISSUE #2: Missing subscriptionId in API Response
**Severity:** CRITICAL  
**File:** Back/src/pagos/pagos.controller.ts (lines 7-24)  
**Problem:**
- After crearSuscripcion, response only includes `{ checkoutUrl }` or `{ paymentProcessing: true }`
- Frontend (CheckoutForm.tsx:368) expects BOTH paymentProcessing AND subscriptionId

```javascript
// Frontend expects this structure:
if (!('paymentProcessing' in body) || body.paymentProcessing !== true ||
    !('subscriptionId' in body) || typeof body.subscriptionId !== 'string')
```

- Backend pagos.service.ts returns suscripcion.id but controller doesn't include it in response

**Impact:**
- After successful card tokenization, API response passes but validation fails
- Frontend throws: "No pudimos confirmar el estado de la suscripción"
- User sees error message despite successful backend processing

---

### ISSUE #3: Mercado Pago Public Key Environment Variable Name Mismatch
**Severity:** CRITICAL  
**File:** Front/.env.local and CheckoutForm.tsx  
**Problem:**
- .env.local defines: `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...`
- CheckoutForm.tsx (line 299) checks BOTH variable names:
```javascript
const keyPublica = 
  process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ?? 
  process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
```

- The first name uses "MERCADO_PAGO" (with underscore after MERCADO)
- The .env.local uses "MERCADOPAGO" (no underscore)
- Code will try undefined first, might fail to initialize SDK

**Impact:**
- SDK initialization may fail or use wrong key
- Card tokenization cannot proceed
- Shows "Los pagos no están configurados"

---

### ISSUE #4: CORS Credentials Configuration
**Severity:** CRITICAL  
**File:** Back/src/app.ts (line 19)  
**Problem:**
- CORS is configured with: `cors({ origin: origenesPermitidos, credentials: true })`
- Frontend sends credentials with: `credentials: 'include'` in apiFetch
- However, need to verify CORS headers are correctly set

**Impact:**
- Session cookies not sent with payment requests
- Authentication fails on /crear-suscripcion
- Request blocked by "Debés iniciar sesión" error

---

### ISSUE #5: Monthly Plan Authorization Bypass
**Severity:** HIGH  
**File:** Back/src/pagos/pagos.routes.ts (line 12-18)  
**Problem:**
- POST /crear-suscripcion requires: `requerirSesion, requerirRoles("ARTISTA", "ESTUDIO_ADMIN")`
- But frontend allows selecting Checkout Pro for monthly plans without enforcing auth check first
- If checkout pro skips card validation, might bypass auth

**Impact:**
- Monthly payments might process without proper user verification
- Potential for fraudulent subscriptions

---

## FILES AUDITED

### Backend Files
- ✅ Back/src/pagos/pagos.service.ts (24.7 KB)
- ✅ Back/src/pagos/pagos.controller.ts (2.2 KB)
- ✅ Back/src/pagos/pagos.routes.ts (0.6 KB)
- ✅ Back/src/pagos/planes.ts (0.5 KB)
- ✅ Back/src/config/mercadopago.ts (1.3 KB)
- ✅ Back/src/app.ts (0.8 KB)
- ✅ Back/.env (Configuration)

### Frontend Files
- ✅ Front/src/app/checkout/_components/CheckoutForm.tsx (29.9 KB)
- ✅ Front/src/lib/api-client.ts (0.9 KB)
- ✅ Front/.env.local (Configuration)

---

## REQUIRED FIXES

1. **Add GET /pagos/planes endpoint** to return pricing
2. **Include subscriptionId in POST /crear-suscripcion response** for both flows
3. **Standardize environment variable names** to NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
4. **Verify CORS configuration** properly sends credentials
5. **Add auth check** for both payment flows before processing
6. **Improve error handling** to pass backend errors to frontend

