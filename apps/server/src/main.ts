/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    })
  );
  app.enableCors();
  app.set('trust proxy', 1); // Trust one proxy hop (nginx) — exposes real client IP in req.ip

  // Security headers via Helmet.
  // CSP is relaxed only for /api (Swagger UI) which loads scripts/styles from its own bundle.
  // All other routes get a strict policy.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc:     ["'self'"],
          scriptSrc:      ["'self'", "'unsafe-inline'"],   // Swagger UI requires inline scripts
          styleSrc:       ["'self'", "'unsafe-inline'"],   // Swagger UI requires inline styles
          imgSrc:         ["'self'", 'data:', 'blob:'],    // Swagger UI logo + barcode previews
          connectSrc:     ["'self'"],
          fontSrc:        ["'self'"],
          objectSrc:      ["'none'"],
          frameSrc:       ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Swagger UI needs this off for its resources
      xFrameOptions:        { action: 'deny' },
      xContentTypeOptions:  true,
      referrerPolicy:       { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge:            31_536_000, // 1 year
        includeSubDomains: true,
        preload:           true,
      },
    }),
  );

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Simon API Hub – Barcode/GS1')
    .setDescription('API for standard barcodes and GS1 rendering')
    .setVersion('1.0.0')
    .addServer('https://hub.abler.tirol')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description:
          'API key for authenticated access. ' +
          'Free tier: no key needed (10 req/min). ' +
          'Pro (sk_pro_…): 100 req/min · 10k/day. ' +
          'Industrial (sk_ind_…): 1k req/min. ' +
          'Request a key at simon@abler.tirol.',
      },
      'x-api-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    useGlobalPrefix: false,
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Simon API Hub',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 App running: http://localhost:${port}`);
  Logger.log(`📚 Swagger UI: http://localhost:${port}/api`);
}

bootstrap();
