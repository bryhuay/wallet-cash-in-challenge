# Wallet Cash-In & Webhook API 🚀

API REST desarrollada con **NestJS** bajo los principios de **Arquitectura Hexagonal (Clean Architecture)** y **Domain-Driven Design (DDD)** para la gestión de recargas de billetera (*cash-in*) y el procesamiento asíncrono de webhooks de pago.

## 📐 1. Arquitectura Propuesta

Se implementó una **Arquitectura Hexagonal (Puertos y Adaptadores)** para garantizar un alto desacoplamiento de la infraestructura, facilitar las pruebas automatizadas y asegurar la escalabilidad del dominio.

```text
src/
├── application/         # Casos de uso (Orquestación de lógica de aplicación)
│   ├── constants/       # Constantes del módulo de aplicación
│   ├── errors/          # Excepciones de la capa de aplicación
│   └── use-cases/       # ProcessCashInUseCase, ProcessPaymentWebhookUseCase
├── domain/              # Núcleo del Dominio (TypeScript puro, sin dependencias)
│   ├── entities/        # Wallet, Operation
│   ├── enums/           # OperationStatus (PENDING, SUCCESS, FAILED)
│   ├── errors/          # Excepciones de negocio
│   ├── ports/           # Interfaces de repositorios y adaptadores (Contratos)
│   └── value-objects/   # Amount, IdempotencyKey
└── infrastructure/      # Adaptadores de Entrada/Salida (NestJS, Mongoose, Redis, HTTP)
    ├── http/            # Controllers, DTOs, Filters, Interceptors
    ├── lock/            # Redis Lock Adapter (Redlock pattern / Concurrencia)
    ├── payment/         # MockPaymentProvider (Pasarela externa)
    └── persistence/     # Mongoose Schemas, Repositories y Mappers
```

## 🔒 2. Estrategia de Idempotencia (Multi-Pod)

Para garantizar la idempotencia distribuida a través de múltiples pods en entornos Docker/Kubernetes:

- **Header Mandatorio:** Se exige el header `x-idempotency-key` (UUID v4) en el endpoint `POST /cash-in`.
- **Persistencia Distribuida:** La clave de idempotencia no se almacena en memoria local, sino en **MongoDB** mediante la entidad `Operation` con un índice único a nivel de base de datos sobre `idempotencyKey`.
- **Respuestas Consistentes:** Si ingresa una petición con un `x-idempotency-key` ya procesado, se retorna la operación existente con su estado actual (`PENDING`, `SUCCESS`, `FAILED`), evitando reprocesar la transacción o realizar doble cobro.

## ⚡ 3. Manejo de Concurrencia & Race Conditions

Para evitar condiciones de carrera sobre el saldo (*balance*) de la billetera cuando ingresan peticiones concurrentes para el mismo usuario:

- **Lock Distribuido con Redis:** Se utiliza un adaptador de bloqueo distribuido (`RedisLockAdapter`) impulsado por Redis.
- **Exclusión Mutua:** Cada operación de recarga y actualización de saldo adquiere un bloqueo utilizando la clave `lock:wallet:{userId}`. Si otro pod intenta modificar la billetera en simultáneo, espera la liberación del lock o falla de forma controlada sin corromper el saldo.

## 🔄 4. Estrategia de Retry, Timeouts y Máquina de Estados

### Pregunta Central: Timeout del Proveedor

*Si el proveedor cobra S/ 100 y ocurre un timeout antes de recibir la respuesta:*

1. La operación se registra inicialmente en la base de datos con estado **`PENDING`** y se almacena la referencia generada por la pasarela.
2. Si el cliente reintenta la petición HTTP enviando la misma `x-idempotency-key`, la API detecta el estado `PENDING` y retorna la transacción en curso en lugar de llamar nuevamente al proveedor.
3. La resolución del estado final se delega al procesamiento asíncrono del **Webhook** o a un proceso de conciliación.

### Máquina de Estados (`OperationStatus`)

```text
      ┌───────────┐
      │  PENDING  │
      └─────┬─────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌─────────┐   ┌──────────┐
│ SUCCESS │   │  FAILED  │
└─────────┘   └──────────┘
```

- **Transiciones Válidas:** `PENDING` -> `SUCCESS` o `FAILED`.
- Las operaciones en estado terminal (`SUCCESS` o `FAILED`) son inmutables y no pueden revertirse ni cambiar de estado.

## 📬 5. Manejo de Webhooks (`POST /webhooks/payment`)

El endpoint de webhooks procesa las notificaciones de la pasarela considerando los siguientes escenarios:

- **Webhooks Duplicados:** Si se recibe un webhook para una operación que ya está en estado `SUCCESS` o `FAILED`, el caso de uso es idempotente: ignora el evento duplicado y responde `200 OK`.
- **Webhooks Fuera de Orden o Prematuros:** El procesamiento actualiza el estado de la operación utilizando comparaciones atómicas y bloqueos sobre la billetera para asegurar que el saldo solo se acredite una única vez cuando el `outcome` sea exitoso.

## 🔍 6. Observabilidad (Correlation & Trace ID)

Para garantizar la trazabilidad end-to-end a través de microservicios y múltiples pods:

* **Correlation Middleware:** Se implementó un middleware HTTP que extrae el header `x-correlation-id` o genera un UUID v4 automáticamente si no está presente en la petición entrante.
* **Header Inyección:** Toda respuesta de la API incluye el header `x-correlation-id`.
* **Logs Estructurados:** Los logs de aplicación (NestJS Logger) propagan el Correlation ID en cada nivel de ejecución (Caso de Uso, Adaptadores de Redis/Mongoose y llamadas a la pasarela Mock), facilitando la depuración distribuida.

## 🤖 7. Pilotaje del Agente de IA (Specs & Correcciones)

En cumplimiento con la rúbrica de evaluación, la solución fue desarrollada colaborativamente con un agente de IA.

### Specs/Prompts Proporcionados al Agente

1. **Arquitectura y Modelado de Dominio (Clean Architecture / DDD):**
   > *"Genera la estructura base para un módulo de Cash-In en NestJS siguiendo Arquitectura Hexagonal estricta. El núcleo de Dominio (`src/domain`) no debe tener dependencias de NestJS ni Mongoose. Define la entidad `Wallet` con operaciones de saldo inmutables, la entidad `Operation` con máquina de estados (`PENDING`, `SUCCESS`, `FAILED`) y los Value Objects `Amount` e `IdempotencyKey` para validar invariantes de negocio."*

2. **Idempotencia y Concurrencia (Multi-Pod):**
   > *"Implementa la estrategia de idempotencia en `ProcessCashInUseCase` requiriendo el header `x-idempotency-key` (UUID v4). La persistencia debe apoyarse en un índice único de MongoDB sobre `idempotencyKey` y el manejo de concurrencia sobre el saldo debe usar un Distributed Lock con Redis (`RedisLockAdapter`) sobre la clave `lock:wallet:{userId}` para soportar ejecución en múltiples pods de Kubernetes."*

3. **Manejo Global de Errores y Formato de Respuesta:**
   > *"Crea un `GlobalExceptionFilter` que capture las excepciones de Dominio/Aplicación y las traduzca a respuestas HTTP RFC 7807 (`statusCode`, `message`, `errorCode`, `timestamp`). Además, implementa un `TransformInterceptor` para envolver las respuestas exitosas de la API en una estructura normalizada `{ data: ... }`."*

4. **Suite de Pruebas E2E Integrales:**
   > *"Diseña una suite de pruebas E2E en Jest (`test/cash-in-flow.e2e-spec.ts`) que levante el entorno NestJS completo. La prueba debe cubrir 9 escenarios críticos: éxito con header de idempotencia, peticiones duplicadas (idempotencia real), validación de UUIDs e importes negativos, y el procesamiento del webhook (`POST /webhooks/payment`) para los flujos exitosos y fallidos extrayendo referencias dinámicas."*

### Rediseños y Correcciones Realizadas 

1. **Idempotencia Naive:** Inicialmente el agente sugirió validar la idempotencia usando una colección en memoria o un `Map` local. Se rechazó y se rediseñó para usar **MongoDB con índices únicos y Redis**, garantizando soporte **multi-pod**.
2. **Manejo de Deprecaciones en Mongoose:** El agente generó llamadas a `findOneAndUpdate` usando `{ new: true }`, lo cual lanzaba advertencias de obsolescencia. Se corrigió a `{ returnDocument: 'after' }` en los repositorios de persistencia.
3. **Corrección de Mocks e Identificadores Dinámicos en E2E:** El agente intentó probar el webhook enviando un `provider_reference` estático que chocaba en la base de datos. Se corrigió la suite E2E en `test/cash-in-flow.e2e-spec.ts` para extraer dinámicamente la referencia retornada en la solicitud de Cash-In previa.
4. **Configuración de Cobertura en Jest:** La configuración generada por la IA incluía los archivos `.dto.ts` e `.interface.ts` en el reporte de cobertura, penalizando con `0%` líneas de solo tipos. Se ajustó `collectCoverageFrom` en `jest-e2e.json` para reflejar la cobertura real del código ejecutable.

## 🚀 8. Instalación y Ejecución

### Prerrequisitos

- Docker y Docker Compose
- Node.js v18+

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto tomando como base el archivo de ejemplo:

```bash
cp .env.example .env
```

### 2. Ejecución con Docker Compose

Levanta la aplicación junto con MongoDB y Redis:

```bash
docker-compose up -d --build
```

La aplicación estará disponible en `http://localhost:3000`.

## 🧪 9. Ejecución de Pruebas

```bash
# Ejecutar pruebas unitarias
npm run test

```
## 📡 10. Documentación de Endpoints y Respuestas

### 1. Procesar Recarga (`POST /cash-in`)

Inicia una nueva operación de recarga de saldo. Requiere obligatoriamente el header `x-idempotency-key` (UUID v4) para garantizar la idempotencia ante reintentos o doble clic.

#### cURL para Postman

```bash
curl -X POST http://localhost:3000/cash-in \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" \
  -d '{
    "user_id": "usr_abc123",
    "amount": 100.00,
    "currency": "PEN",
    "payment_method": "card_xyz"
  }'
```

#### Mapeo de Respuestas

- **`200 OK` — Éxito / Idempotencia Resuelta:** Retorna la operación registrada o recuperada de forma transparente con su respectivo estado y mapeo en `snake_case`.

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "operation_id": "a660fe2e-ac9e-4206-b968-639e59b57942",
        "user_id": "usr_abc123",
        "status": "PROCESSING",
        "amount": 100,
        "currency": "PEN",
        "payment_method": "card_xyz",
        "provider_reference": "mock_12b15acd-653f-439a-b117-13e6a1077737"
    }
}
```

- **`400 Bad Request` — Error de validación:** Datos de entrada incompletos, montos negativos o formato de UUID inválido en el header.

---

### 2. Webhook de Pasarela de Pagos (`POST /webhooks/payment`)

Endpoint asíncrono para recibir notificaciones de la pasarela de pagos y actualizar de forma segura el estado de la operación y el saldo de la billetera.

#### cURL para Postman

```bash
curl -X POST http://localhost:3000/webhooks/payment \
  -H "Content-Type: application/json" \
  -d '{
    "operation_id": "a660fe2e-ac9e-4206-b968-639e59b57942",
    "provider_reference": "mock_12b15acd-653f-439a-b117-13e6a1077737",
    "outcome": "succeeded"
  }'
```

#### Mapeo de Respuestas

- **`200 OK` — Éxito:** Webhook procesado correctamente de forma idempotente.

```json
{
    "success": true,
    "statusCode": 200,
    "data": {
        "operation_id": "a660fe2e-ac9e-4206-b968-639e59b57942",
        "status": "COMPLETED",
        "credited": false
    }
}
```

- **`400 Bad Request` — Error de validación:** Estructura de datos inválida en el cuerpo de la petición.

- **`404 Not Found` — No encontrado:** El `operation_id` proporcionado no existe en la base de datos, por ejemplo, cuando se recibe un webhook prematuro.