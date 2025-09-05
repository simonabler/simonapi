import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { WatermarkModule } from './watermark.module';
import * as Sharp from 'sharp';

async function makePng(w = 200, h = 120) {
  return await Sharp.default({ create: { width: w, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } } }).png().toBuffer();
}

describe('WatermarkController (e2e-light)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WatermarkModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/watermark/apply (POST text)', async () => {
    const img = await makePng();

    const res = await request(app.getHttpServer())
      .post('/watermark/apply')
      .field('mode', 'text')
      .field('text', '© Test')
      .attach('file', img, { filename: 'in.png', contentType: 'image/png' })
      .expect(201); // Created

    expect(res.headers['content-type']).toMatch(/image\/(png|jpeg|webp|avif)/);
    expect(res.body.length).toBeGreaterThan(100);
  });
});

