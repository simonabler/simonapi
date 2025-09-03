/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

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
  app.set('trust proxy', 'loopback'); // Trust requests from the loopback address

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Simon API Hub – Barcode/GS1')
    .setDescription('API for standard barcodes and GS1 rendering')
    .setVersion('1.0.0')
    .addServer('https://hub.abler.tirol')
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
