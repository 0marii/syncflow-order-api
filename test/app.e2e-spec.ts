import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;

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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the service is up', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as { status: string };
        expect(body.status).toBe('ok');
      });
  });

  it('POST /orders creates an order', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({ productId: 'prod_abc123', quantity: 2, userId: 'user_xyz789' })
      .expect(201)
      .expect((res) => {
        const body = res.body as { productId: string; status: string };
        expect(body.productId).toBe('prod_abc123');
        expect(body.status).toBe('CONFIRMED');
      });
  });

  it('POST /orders rejects an invalid payload with 400', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({ productId: '', quantity: 0 })
      .expect(400);
  });

  it('POST /orders rejects insufficient stock with 400', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({ productId: 'prod_ghi789', quantity: 9999, userId: 'user_1' })
      .expect(400);
  });

  it('GET /orders returns the created orders', () => {
    return request(app.getHttpServer())
      .get('/orders')
      .expect(200)
      .expect((res) => {
        const body = res.body as unknown[];
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
      });
  });
});
