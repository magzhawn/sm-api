import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    '/subscription/webhook',
    express.raw({ type: 'application/json' }),
  );

  app.use((req, res, next) => {
    if (req.originalUrl === '/subscription/webhook') return next();
    express.json()(req, res, next);
  });

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
