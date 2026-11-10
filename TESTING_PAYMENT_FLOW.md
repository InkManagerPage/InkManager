# MERCADO PAGO PAYMENT FLOW TESTING GUIDE

## Overview
This document describes how to test the payment flows after the integration fixes.

## Test Scenarios

### Scenario 1: Monthly Plan - Checkout Pro (Hosted Payment)
**Expected Flow:**
1. User navigates to /suscripcion?plan=INDIVIDUAL
2. Selects "Mensual" cycle
3. Clicks "Pagar con Checkout Pro"
4. Frontend calls POST /api/pagos/crear-suscripcion with: `{plan: "INDIVIDUAL", ciclo: "MENSUAL"}`
5. Backend returns: `{checkoutUrl: "https://mercadopago.com.ar/checkout/..."`
6. Frontend redirects to Mercado Pago checkout
7. User completes payment
8. Mercado Pago redirects back to frontend based on back_url

**Response Format:**
```json
{
  "checkoutUrl": "https://mercadopago.com.ar/checkout/abc123"
}
```

**Fixed Issue:** Endpoint was creating subscription correctly but response wasn't structured properly for some error cases.

---

### Scenario 2: Annual Plan - Direct Card Payment  
**Expected Flow:**
1. User navigates to /suscripcion?plan=ESTUDIO
2. Selects "Anual" cycle
3. Enters card details
4. Clicks "Pagar $350.000 ARS"
5. Frontend tokenizes card via Mercado Pago SDK
6. Frontend calls POST /api/pagos/crear-suscripcion with: 
   ```json
   {
     "plan": "ESTUDIO",
     "ciclo": "ANUAL",
     "card_token_id": "token_xyz..."
   }
   ```
7. Backend creates preapproval with card token for annual payment
8. Backend returns: `{paymentProcessing: true, subscriptionId: "sub-id-123"}`
9. Frontend redirects to /suscripcion/resultado
10. ResultadoSuscripcion component loads subscription status

**Response Format:**
```json
{
  "paymentProcessing": true,
  "subscriptionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Fixed Issue:** subscriptionId was missing from response, causing frontend validation to fail.

---

### Scenario 3: Monthly Plan - Direct Card Payment
**Expected Flow:**
1. User navigates to /suscripcion?plan=INDIVIDUAL
2. Selects "Mensual" cycle  
3. Enters card details
4. Clicks "Pagar $12.000 ARS"
5. Frontend tokenizes card
6. Frontend calls POST /api/pagos/crear-suscripcion with:
   ```json
   {
     "plan": "INDIVIDUAL",
     "ciclo": "MENSUAL",
     "card_token_id": "token_xyz..."
   }
   ```
7. Backend creates preapproval with card token (frequency: 1 month)
8. Backend returns: `{paymentProcessing: true, subscriptionId: "sub-id-123"}`
9. Frontend redirects to /suscripcion/resultado
10. ResultadoSuscripcion displays subscription status

**Note:** Monthly card payments use the same flow as annual, just different frequency in preapproval.

---

## Critical Paths to Test

### Path 1: Plans Loading (/api/pagos/planes - NEW ENDPOINT)
**Test Request:**
```bash
curl http://localhost:4000/api/pagos/planes
```

**Expected Response:**
```json
{
  "plans": [
    {
      "id": "INDIVIDUAL",
      "nombre": "Individual",
      "mensual": 12000,
      "anual": 120000,
      "moneda": "ARS"
    },
    {
      "id": "ESTUDIO",
      "nombre": "Estudio",
      "mensual": 35000,
      "anual": 350000,
      "moneda": "ARS"
    }
  ]
}
```

**Status:** ✓ NEW - Implemented for future use and API compatibility

---

### Path 2: Payment Initialization - Checkout Pro
**Test Request:**
```bash
curl -X POST http://localhost:4000/api/pagos/crear-suscripcion \
  -H "Content-Type: application/json" \
  -H "Cookie: inkmanager_session=<valid_session_cookie>" \
  -d '{
    "plan": "INDIVIDUAL",
    "ciclo": "MENSUAL"
  }'
```

**Expected Response:**
```json
{
  "checkoutUrl": "https://mercadopago.com.ar/checkout/v1/..."
}
```

**Status:** ✓ Working - No changes needed

---

### Path 3: Payment Initialization - Card Token (FIXED)
**Test Request:**
```bash
curl -X POST http://localhost:4000/api/pagos/crear-suscripcion \
  -H "Content-Type: application/json" \
  -H "Cookie: inkmanager_session=<valid_session_cookie>" \
  -d '{
    "plan": "ESTUDIO",
    "ciclo": "ANUAL",
    "card_token_id": "valid_token_from_mercadopago"
  }'
```

**Expected Response (BEFORE FIX):**
```json
{
  "paymentProcessing": true
}
```

**Expected Response (AFTER FIX):**
```json
{
  "paymentProcessing": true,
  "subscriptionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Status:** ✓ FIXED - subscriptionId now included

---

## Environment Variables Check

### Backend (.env)
```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_WEBHOOK_SECRET=...
MERCADOPAGO_WEBHOOK_URL=https://...
FRONTEND_URL=http://localhost:3001
```

### Frontend (.env.local)
```
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...
API_URL=http://localhost:4000/api
```

**Status:** ✓ Correct - No mismatches in env var names

---

## CORS Configuration Verification

**Request must include:**
- Header: `Content-Type: application/json`
- Cookie: `inkmanager_session=<value>` (with credentials: 'include')

**Expected Response Headers:**
```
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
```

**Status:** ✓ Configured correctly in Back/src/app.ts

---

## Authentication Flow Verification

1. User must be authenticated before calling /pagos/crear-suscripcion
2. Session cookie must be present in request
3. Backend middleware requerirSesion validates cookie
4. User must have appropriate role: ARTISTA or ESTUDIO_ADMIN

**Fixed:** Authorization is properly enforced for all payment flows

---

## Manual Testing Checklist

- [ ] **Monthly + Checkout Pro:** Can load plans, initiate checkout, redirected to Mercado Pago
- [ ] **Annual + Card:** Card fields appear, can tokenize, receives subscriptionId response
- [ ] **Monthly + Card:** Card fields appear, can tokenize, receives subscriptionId response
- [ ] **Payment Results:** After paying, redirects to /suscripcion/resultado
- [ ] **Subscription Status:** Can query /api/pagos/suscripcion and get current subscription
- [ ] **Error Cases:** Invalid plan/cycle returns 400, unauthorized returns 401
- [ ] **CORS:** Requests with credentials work properly
- [ ] **Env Vars:** No "undefined" errors, SDK loads properly

---

## Fixes Applied

1. ✓ Added GET /pagos/planes endpoint
2. ✓ Include subscriptionId in card payment response  
3. ✓ Standardized NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY env var
4. ✓ Verified CORS configuration includes credentials
5. ✓ Confirmed authorization checks are in place
6. ✓ Response formats match frontend expectations

