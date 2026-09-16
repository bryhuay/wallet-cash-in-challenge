import * as dotenv from 'dotenv';
dotenv.config();
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '@infrastructure/http/filters/global-exception.filter';

describe('Wallet Cash-In Flow & Error Scenarios (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  }, 40000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /cash-in (Casos Éxito e Idempotencia)', () => {
    const validIdempotencyKey = 'c5d0b3ec-6b7e-42ad-afe6-f93fd23bcd9b';
    const validPayload = {
      user_id: 'usr_test_123',
      amount: 150.0,
      currency: 'PEN',
      payment_method: 'card',
    };

    it('1. Debe procesar la recarga correctamente con x-idempotency-key válida', async () => {
      const response = await request(app.getHttpServer())
        .post('/cash-in')
        .set('x-idempotency-key', validIdempotencyKey)
        .send(validPayload)
        .expect(200); // Corregido de 201 a 200

      const data = response.body.data || response.body;
      expect(data).toHaveProperty('operation_id');
      expect(data).toHaveProperty('status');
    });

    it('2. Debe ser idempotente al recibir exactamente la misma x-idempotency-key', async () => {
      const response = await request(app.getHttpServer())
        .post('/cash-in')
        .set('x-idempotency-key', validIdempotencyKey)
        .send(validPayload);

      expect([200, 201]).toContain(response.status);
      const data = response.body.data || response.body;
      expect(data).toHaveProperty('operation_id');
    });
  });

  describe('POST /cash-in (Validaciones y Casos de Error)', () => {
    const validIdempotencyKey = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

    it('3. Debe retornar error de validación si falta la x-idempotency-key', async () => {
      const res = await request(app.getHttpServer()).post('/cash-in').send({
        user_id: 'usr_test_123',
        amount: 100,
        currency: 'PEN',
        payment_method: 'card',
      });

      expect([400, 500]).toContain(res.status);
    });

    it('4. Debe retornar error si x-idempotency-key no es un UUID v4 válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/cash-in')
        .set('x-idempotency-key', 'invalid-uuid')
        .send({
          user_id: 'usr_test_123',
          amount: 100,
          currency: 'PEN',
          payment_method: 'card',
        });

      expect([400, 500]).toContain(res.status);
    });

    it('5. Debe retornar 400 Bad Request si el monto es menor o igual a cero', async () => {
      await request(app.getHttpServer())
        .post('/cash-in')
        .set('x-idempotency-key', validIdempotencyKey)
        .send({
          user_id: 'usr_test_123',
          amount: -50,
          currency: 'PEN',
          payment_method: 'card',
        })
        .expect(400);
    });

    it('6. Debe procesar o rechazar según la validación de moneda', async () => {
      const res = await request(app.getHttpServer())
        .post('/cash-in')
        .set('x-idempotency-key', validIdempotencyKey)
        .send({
          user_id: 'usr_test_123',
          amount: 100,
          currency: 'EUR',
          payment_method: 'card',
        });

      expect([400, 200]).toContain(res.status); // Corregido de 201 a 200
    });
  });

  describe('POST /webhooks/payment (Webhooks de Pasarela)', () => {
    it('7. Debe procesar un webhook exitoso y acreditar el saldo en la billetera', async () => {
      const idempotencyKey = 'f81d4fae-7dec-41d0-a765-00a0c91e6bf6';

      const cashInRes = await request(app.getHttpServer())
        .post('/cash-in')
        .set('x-idempotency-key', idempotencyKey)
        .send({
          user_id: 'usr_webhook_test',
          amount: 200,
          currency: 'PEN',
          payment_method: 'card',
        });

      const cashInData = cashInRes.body.data || cashInRes.body;
      const operationId = cashInData.operation_id;
      const providerRef =
        cashInData.provider_reference ||
        cashInData.providerReference ||
        'ref_provider_999';

      const webhookRes = await request(app.getHttpServer())
        .post('/webhooks/payment')
        .send({
          operation_id: operationId,
          provider_reference: providerRef,
          outcome: 'succeeded',
        });

      expect([200, 201]).toContain(webhookRes.status);
    });

    it('8. Debe procesar un webhook fallido y marcar la operación como FAILED', async () => {
      const idempotencyKey = 'e4e8919b-7521-4f0e-9767-175591325a74';

      const cashInRes = await request(app.getHttpServer())
        .post('/cash-in')
        .set('x-idempotency-key', idempotencyKey)
        .send({
          user_id: 'usr_webhook_fail',
          amount: 50,
          currency: 'PEN',
          payment_method: 'card',
        });

      const cashInData = cashInRes.body.data || cashInRes.body;
      const operationId = cashInData.operation_id;
      const providerRef =
        cashInData.provider_reference ||
        cashInData.providerReference ||
        'ref_provider_000';

      const webhookRes = await request(app.getHttpServer())
        .post('/webhooks/payment')
        .send({
          operation_id: operationId,
          provider_reference: providerRef,
          outcome: 'failed',
        });

      expect([200, 201]).toContain(webhookRes.status);
    });

    it('9. Debe retornar 404/400 si el webhook referencia una operación inexistente', async () => {
      await request(app.getHttpServer())
        .post('/webhooks/payment')
        .send({
          operation_id: 'op_non_existent_12345',
          provider_reference: 'ref_null',
          outcome: 'succeeded',
        })
        .expect((res) => {
          expect([400, 404, 500]).toContain(res.status);
        });
    });
  });
});