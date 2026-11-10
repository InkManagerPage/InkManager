# Cambios en la Integración de Mercado Pago

## Resumen de la Solución

Se corrigió el flujo de pagos de InkManager para soportar correctamente tanto pagos anuales como mensuales, con tarjeta y sin tarjeta.

## Problemas Identificados y Resueltos

### 1. **Hoisting de Funciones Internas (CRÍTICO)**
**Problema:** Las funciones `crearPagoAnualConTarjeta`, `crearCheckoutAnual` y `crearCheckoutMensual` estaban definidas DESPUÉS de ser llamadas dentro de `crearSuscripcion()`.

**Solución:** Mover las definiciones al inicio del `try` block, antes de cualquier uso. En JavaScript, las funciones anidadas se declaran cuando el motor las parsea, no cuando se ejecutan. Esto asegura disponibilidad en el scope.

### 2. **Flujo de Pagos Incorrecto**
**Problema:** La lógica de pagos mensuales no diferenciaba entre pagos con tarjeta (Preapproval) y sin tarjeta (Checkout Pro).

**Solución:** 
- **ANUAL + Tarjeta** → `Payment` API (pago único autorizado)
- **ANUAL + Checkout Pro** → `Preference` → Usuario al checkout
- **MENSUAL + Tarjeta** → `Preapproval` con `status="authorized"` (pago recurrente)
- **MENSUAL + Checkout Pro** → `Preference` → Usuario al checkout → Webhook procesa como pago mensual

### 3. **Webhook Handler no Soportaba Pagos Mensuales desde Checkout**
**Problema:** `procesarPagoAnual()` rechazaba pagos MENSUAL porque verificaba `suscripcion.ciclo === ANUAL`.

**Solución:** 
- Actualizar validación para aceptar `ANUAL | MENSUAL`
- Calcular `periodoHasta` diferente según ciclo:
  - ANUAL: `sumarUnAno(fechaAprobacion)`
  - MENSUAL: `sumarUnMes(fechaAprobacion)`
- Configurar `proximoCobroAt` solo para MENSUAL

## Arquitectura Final del Flujo de Pagos

### Inicio del Pago (`crearSuscripcion`)
```
Entrada: {plan, ciclo, card_token_id?, payment_method_id?, identification_number?}
         ↓
Crear registro Suscripción (estado=PENDIENTE)
         ↓
¿Es ANUAL?
  ├─ Sí + Tarjeta → crearPagoAnualConTarjeta() → Payment API → APROBADO/RECHAZADO instantáneo
  │                                           → Webhook: procesarPagoAnual()
  │                                           → Suscripción: ACTIVA/RECHAZADA
  │
  ├─ Sí + Sin Tarjeta → crearCheckoutAnual() → Preference API → Checkout URL
  │                                          → Usuario al checkout
  │                                          → Webhook: procesarPagoAnual()
  │
  └─ No (MENSUAL) + Tarjeta → Preapproval (status="authorized") → APROBADO/PENDIENTE
                             → Webhook: procesarPagoAutorizado()
                             → Primer pago autorizado
                             → Suscripción: ACTIVA
                             → proximoCobroAt: fecha_primer_cobro
                             → Siguientes pagos: automáticos vía Preapproval
  
  └─ No (MENSUAL) + Sin Tarjeta → crearCheckoutMensual() → Preference API → Checkout URL
                                 → Usuario al checkout
                                 → Webhook: procesarPagoAnual()
                                 → Suscripción: ACTIVA
                                 → proximoCobroAt: fecha_próximo_cobro
```

### Webhooks Soportados

| Tipo Webhook | Origen | Handler | Acción |
|---|---|---|---|
| `payment` / `payment.updated` | Payment API (ANUAL) o Preference (MENSUAL/ANUAL) | `procesarPagoAnual()` | Procesa pago único o primer pago mensual |
| `subscription_authorized_payment` | Preapproval (MENSUAL) | `procesarPagoAutorizado()` | Procesa pagos recurrentes mensuales |
| `subscription_preapproval` | Preapproval (MENSUAL) | `procesarActualizacionSuscripcion()` | Actualiza estado preapproval (cancelaciones, etc) |

## Flujos Específicos

### ANUAL + Tarjeta
1. Usuario completa formulario con tarjeta
2. Frontend tokeniza con Mercado Pago → obtiene `card_token_id`
3. Envía a backend: `{plan, ciclo, card_token_id, payment_method_id, identification_number}`
4. Backend llama `Payment.create()` → Mercado Pago procesa inmediatamente
5. Si APROBADO: webhook actualiza Suscripción a ACTIVA, otorga permisos
6. Usuario ve confirmación sin necesidad de redireccionamiento adicional

### ANUAL + Checkout Pro
1. Usuario elige opción "Checkout Pro"
2. Backend crea `Preference` → obtiene `init_point` (URL de checkout)
3. Frontend redirige a Mercado Pago
4. Usuario completa pago en Mercado Pago
5. Mercado Pago redirige de vuelta + envía webhook `payment`
6. Webhook actualiza Suscripción a ACTIVA

### MENSUAL + Tarjeta
1. Usuario completa formulario con tarjeta
2. Frontend tokeniza → obtiene `card_token_id`
3. Backend llama `Preapproval.create()` con `status="authorized"`
4. Primer pago se procesa inmediatamente
5. Webhook `subscription_authorized_payment` dispara `procesarPagoAutorizado()`
6. Suscripción marcada como ACTIVA, permisos otorgados
7. Futuros pagos: webhook automático cada mes

### MENSUAL + Checkout Pro
1. Usuario elige opción "Checkout Pro"
2. Backend crea `Preference` para pago mensual → obtiene `init_point`
3. Frontend redirige a Mercado Pago
4. Usuario completa pago en Mercado Pago
5. Mercado Pago redirige de vuelta + envía webhook `payment`
6. Webhook `procesarPagoAnual()` procesa como pago MENSUAL
7. `proximoCobroAt` se configura para próximo mes
8. Usuarios se renuevan automáticamente o mediante preapproval subyacente

## Permisos y Acceso

### Al Procesar Pago Aprobado
- ✅ `otorgarPermisosSuscripcion()` se ejecuta en `procesarPagoAnual()` y `procesarPagoAutorizado()`
- ✅ Rol actualizado inmediatamente:
  - INDIVIDUAL → ARTISTA
  - ESTUDIO → ESTUDIO_ADMIN
- ✅ Usuario puede acceder a funcionalidades del plan

### Al Procesar Pago Rechazado
- ✅ Suscripción marcada como RECHAZADA
- ✅ Permisos NO se otorgan
- ✅ Usuario recibe correo de fallo

### Al Cancelar Suscripción
- ✅ `revocarPermisosSuscripcion()` se ejecuta
- ✅ Rol removido
- ✅ Acceso inmediatamente desactivado

## Funciones Auxiliares

### Validación y Parsing
- `validarPlanYCiclo()`: Valida formato de plan y ciclo
- `parseId()`: Extrae IDs numéricos de Mercado Pago
- `parseMonto()`: Convierte montos a números
- `fechaValida()`: Valida y convierte fechas

### Cálculos de Fechas
- `sumarUnAno(fecha)`: Suma 1 año (para planes ANUAL)
- `sumarUnMes(fecha)`: Suma 1 mes (para planes MENSUAL)
- `nombreCiclo()`: Convierte enum a texto

### Utilidades
- `validarFirmaWebhook()`: Verifica integridad de webhooks
- `obtenerPrecio()`: Obtiene precio según plan y ciclo
- `obtenerPlanes()`: Lista planes disponibles

## Casos de Prueba

### Test Payment Cards
```
- APRO (Aprobado): 5031755734530604, exp 11/30, cvv 123
- OURA (Rechazado): 5031755734530604 con CVV 124
```

### Verificar Flujo Correcto
1. ✅ Crear suscripción ANUAL + tarjeta → debe retornar `{paymentProcessing: true}`
2. ✅ Webhook llega → Suscripción debe ser ACTIVA
3. ✅ Usuario debe tener rol ARTISTA o ESTUDIO_ADMIN
4. ✅ Correo de confirmación debe llegar

5. ✅ Crear suscripción MENSUAL + tarjeta → debe retornar `{paymentProcessing: true}`
6. ✅ Webhook autoriza pago → Suscripción ACTIVA
7. ✅ `proximoCobroAt` debe estar 1 mes en el futuro

8. ✅ Checkout Pro → debe retornar `{checkoutUrl, subscriptionId}`
9. ✅ Usuario redirigido a Mercado Pago
10. ✅ Webhook procesa pago → Suscripción ACTIVA

## Notas Importantes

- ⚠️ `crearPagoAnualConTarjeta()` y `crearCheckoutAnual()` DEBEN estar dentro del scope de `crearSuscripcion()` para acceder a `suscripcion` y `monto`
- ⚠️ Webhook handlers usan `prisma.$transaction()` para garantizar atomicidad
- ⚠️ El `idempotencyKey` en cada request a Mercado Pago asegura que solicitudes duplicadas no creen pagos duplicados
- ⚠️ `upsert()` en `pagoSuscripcion` garantiza que el mismo webhook procesado 2 veces resulta en 1 pago
- ⚠️ Todos los cálculos de montos usan redondeo a 2 decimales para evitar problemas de floating-point

## Commits Relacionados

1. `f27aca4`: Restructure payment functions to execute in correct order
2. `861aea1`: Support monthly Checkout Pro payments in webhook handler
