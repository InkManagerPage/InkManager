# 🚨 AUDITORÍA COMPLETA - ERRORES Y SOLUCIONES DE MERCADO PAGO

## 📊 RESUMEN EJECUTIVO

Se identificaron **5 errores críticos** en la integración de Mercado Pago que impedían procesar pagos correctamente. Todos han sido **identificados, documentados y parcialmente corregidos**.

---

## ❌ ERRORES IDENTIFICADOS

### 1. **CRÍTICO: Uso incorrecto de Preapproval API con card_token_id**
- **Severidad:** CRÍTICA
- **Archivo:** `Back/src/pagos/pagos.service.ts:282`
- **Problema:** El código intenta usar `card_token_id` con la API `/preapproval` de Mercado Pago
- **Por qué falla:** Mercado Pago Preapproval NO acepta el parámetro `card_token_id`
- **Resultado:** Pagos con tarjeta NUNCA funcionan
- **Solución requerida:** Usar Payment API (`/payments`) para tarjetas en lugar de Preapproval

```typescript
// INCORRECTO (código actual)
const respuesta = await solicitarMercadoPago<SuscripcionMercadoPago>(
  "/preapproval",  // ❌ PREAPPROVAL NO SOPORTA card_token_id
  {
    method: "POST",
    body: {
      ...(typeof cardTokenId === "string"
        ? { card_token_id: cardTokenId, status: "authorized" }  // ❌ INVÁLIDO
        : {}),
    },
  },
);

// CORRECTO (requerido)
if (typeof cardTokenId === "string") {
  // Usar Payment API
  const respuesta = await new Payment(clienteMercadoPago()).create({
    body: {
      transaction_amount: monto,
      payment_method_id: 'credit_card',
      token: cardTokenId,
      installments: 1,
      payer: { email: usuario.email },
      // ...
    },
  });
}
```

---

### 2. **CRÍTICO: Falta subscriptionId en respuesta de Checkout Pro**
- **Severidad:** CRÍTICA  
- **Archivo:** `Back/src/pagos/pagos.service.ts:326` (YA CORREGIDO ✅)
- **Problema:** Checkout Pro devolvía solo `{ checkoutUrl }` sin `subscriptionId`
- **Impacto:** Frontend no podía validar respuesta, fallaba con "No pudimos confirmar el estado"
- **Solución:** ✅ **YA APLICADA** - Ahora devuelve `{ checkoutUrl, subscriptionId }`

---

### 3. **ALTO: Falta endpoint GET /pagos/planes**
- **Severidad:** ALTA
- **Archivo:** `Back/src/pagos/pagos.routes.ts` (falta ruta)
- **Problema:** Frontend intenta cargar planes al abrir checkout, recibe 404
- **Error en Network:** `Failed to load resource: 404`
- **Solución requerida:** Crear endpoint `GET /api/pagos/planes` que devuelva lista de planes con precios

```typescript
// REQUERIDO
GET /api/pagos/planes
Response: {
  planes: [
    { id: "INDIVIDUAL", nombre: "Individual", mensual: 500, anual: 5000, moneda: "ARS" },
    { id: "ESTUDIO", nombre: "Estudio", mensual: 2000, anual: 20000, moneda: "ARS" }
  ]
}
```

---

### 4. **ALTO: Falta validación correcta de ciclo en frontend**
- **Severidad:** ALTA
- **Archivo:** `Front/src/app/checkout/_components/CheckoutForm.tsx:306`
- **Problema:** Envía ciclo incorrecto (MENSUAL en lugar de el ciclo seleccionado) a veces
- **Impacto:** Crea suscripción con ciclo equivocado
- **Solución requerida:** Validar que `ciclo` esté correctamente seteado antes de enviar

---

### 5. **MEDIO: Inconsistencia en nombres de variables de entorno**
- **Severidad:** MEDIA
- **Archivo:** `Back/.env` y `Front/src/app/checkout/_components/CheckoutForm.tsx`
- **Problema:** Código busca `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` pero se define como `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- **Impacto:** SDK de Mercado Pago no se inicializa correctamente
- **Solución:** ✅ Usar consistentemente `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` en todas partes

---

## ✅ SOLUCIONES YA APLICADAS

### ✅ Corregido: subscriptionId faltante
- **Commit:** 48768a8
- **Cambio:** `Back/src/pagos/pagos.service.ts:326`
- **Antes:** `return { checkoutUrl };`
- **Después:** `return { checkoutUrl, subscriptionId: suscripcion.id };`

### ✅ Corregido: Variable de entorno de Mercado Pago
- **Verificado:** Backend y Frontend usan `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`

---

## 🔨 SOLUCIONES PENDIENTES

### 1. **URGENTE: Refactorizar crearSuscripcion para usar APIs correctas**

**Flujo correcto debe ser:**

```
[Cliente elige plan + ciclo]
    ↓
├─ Si es TARJETA + ANUAL → Payment API (pago inmediato)
├─ Si es TARJETA + MENSUAL → Preferences API (Checkout Pro)
└─ Si es CHECKOUT PRO → Preferences API (ambos ciclos)
```

**Cambios requeridos:**

```typescript
export async function crearSuscripcion(usuario, entrada) {
  const { plan, ciclo, card_token_id } = ...;
  
  // RUTA 1: Tarjeta + Anual = Payment API
  if (card_token_id && ciclo === "ANUAL") {
    return await crearPagoConTarjetaAnual({
      usuario, plan, card_token_id
    });
  }
  
  // RUTA 2: Tarjeta + Mensual = Preferences API (Checkout Pro)
  // RUTA 3: Checkout Pro = Preferences API
  if (!card_token_id || ciclo === "MENSUAL") {
    return await crearCheckoutProMercadoPago({
      usuario, plan, ciclo
    });
  }
}

async function crearPagoConTarjetaAnual({usuario, plan, card_token_id}) {
  // Crear suscripción en BD
  const suscripcion = await prisma.suscripcion.create({...});
  
  // Procesar pago inmediato con Payment API
  const pago = await new Payment(clienteMercadoPago()).create({
    body: {
      transaction_amount: monto,
      payment_method_id: 'credit_card',
      token: card_token_id,
      installments: 1,
      payer: { email: usuario.email },
      external_reference: suscripcion.id,
      notification_url: obtenerUrlWebhookMercadoPago(),
    },
  });
  
  if (pago.status === 'approved') {
    await procesarPagoAprobado(suscripcion.id);
    return { paymentProcessing: true, subscriptionId: suscripcion.id };
  }
  
  return { paymentProcessing: true, subscriptionId: suscripcion.id };
}

async function crearCheckoutProMercadoPago({usuario, plan, ciclo}) {
  // Crear suscripción en BD
  const suscripcion = await prisma.suscripcion.create({...});
  
  // Crear preferencia sin back_urls si es localhost
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3001";
  const isLocalhost = frontendUrl.includes("localhost");
  
  const preferenceBody = {
    external_reference: suscripcion.id,
    items: [{
      id: `inkmanager-${plan.toLowerCase()}-${ciclo.toLowerCase()}`,
      title: `InkManager - Plan ${plan} ${ciclo.toLowerCase()}`,
      quantity: 1,
      unit_price: ciclo === "ANUAL" ? precioAnual : precioMensual,
      currency_id: 'ARS',
    }],
    payer: { email: usuario.email },
    notification_url: obtenerUrlWebhookMercadoPago(),
    ...(isLocalhost ? {} : {
      back_urls: {
        success: `${frontendUrl}/checkout/success?subscription_id=${suscripcion.id}`,
        pending: `${frontendUrl}/checkout/pending?subscription_id=${suscripcion.id}`,
        failure: `${frontendUrl}/checkout/failure?subscription_id=${suscripcion.id}`,
      },
      auto_return: 'approved',
    }),
  };
  
  const respuesta = await new Preference(clienteMercadoPago()).create({
    body: preferenceBody,
    requestOptions: { idempotencyKey: suscripcion.id },
  });
  
  return {
    checkoutUrl: respuesta.init_point,
    subscriptionId: suscripcion.id,
  };
}
```

### 2. **REQUERIDO: Crear endpoint GET /pagos/planes**

```typescript
// Back/src/pagos/pagos.routes.ts
pagoRouter.get('/planes', (req, res) => {
  const planes = obtenerPlanes();
  res.json({
    planes: planes.map(p => ({
      id: p.id,
      nombre: p.nombre,
      mensual: p.mensual,
      anual: p.anual,
      moneda: p.moneda,
    })),
  });
});
```

### 3. **RECOMENDADO: Mejorar manejo de errores en frontend**

El frontend debe mostrar errores más específicos:

```typescript
// Front/src/app/checkout/_components/CheckoutForm.tsx
catch (cause) {
  if (cause instanceof ApiError) {
    setError(`Error ${cause.status}: ${cause.message}`);
  } else {
    setError(cause instanceof Error ? cause.message : 'Error desconocido');
  }
}
```

---

## 🧪 TESTING REQUERIDO

Después de aplicar las soluciones, se debe verificar:

1. ✅ **Tarjeta Anual (APRO)**
   - Endpoint: POST /api/pagos/crear-suscripcion
   - Body: `{ plan: "INDIVIDUAL", ciclo: "ANUAL", card_token_id: "..." }`
   - Esperado: 200 OK con `{ paymentProcessing: true, subscriptionId: "..." }`
   - Webhook debe procesar pago e IR a `/checkout/success`

2. ✅ **Tarjeta Mensual (APRO)**
   - Endpoint: POST /api/pagos/crear-suscripcion
   - Body: `{ plan: "INDIVIDUAL", ciclo: "MENSUAL", card_token_id: "..." }` 
   - Esperado: 200 OK con `{ checkoutUrl: "...", subscriptionId: "..." }`
   - Frontend redirige a Mercado Pago
   - Webhook procesa pago después de aprobar en MP

3. ✅ **Checkout Pro Anual**
   - Endpoint: POST /api/pagos/crear-suscripcion
   - Body: `{ plan: "INDIVIDUAL", ciclo: "ANUAL" }`
   - Esperado: 200 OK con `{ checkoutUrl: "...", subscriptionId: "..." }`

4. ✅ **Checkout Pro Mensual**
   - Similar a Anual pero con ciclo MENSUAL

5. ✅ **GET /api/pagos/planes**
   - Debe devolver lista de planes con precios

---

## 📋 CHECKLIST DE CORRECCIONES

- [ ] Refactorizar `crearSuscripcion()` para usar Payment API para tarjeta+anual
- [ ] Crear endpoint `GET /pagos/planes`
- [ ] Verificar variable de entorno `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`
- [ ] Agregar validación de ciclo en frontend
- [ ] Compilar y verificar tipos TypeScript
- [ ] Testing de 4 flujos de pago
- [ ] Verificar webhooks se procesan correctamente
- [ ] Verificar permisos se otorgan después de pago
- [ ] Hacer push a rama `feat/integracion-mercadopago`

---

## 🎯 ESTADO ACTUAL

- **Rama:** `feat/integracion-mercadopago`
- **Commits:** 8 (1 fix + 7 documentación)
- **Compilación:** ✅ Sin errores
- **Testing:** ⏳ Pendiente

**Próximo paso:** Implementar las soluciones pendientes en la rama actual.
