/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.enableCors();
  app.set('trust proxy', 'loopback'); // Trust requests from the loopback address

  // Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('simonapi')
    .setDescription('API Documentation')
    .setVersion('1.0.0')
    .addServer('http://localhost:3000')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'simonapi – API Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`
  );
  Logger.log(`📚 Swagger UI: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
