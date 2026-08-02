import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // DTOs are the validated boundary: unknown fields are stripped, bad payloads rejected.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();
  const config = app.get(ConfigService);

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('CryoHealth API')
      .setDescription(
        'GLOF monitoring + CHW health platform. /lakes, /alerts, /observations are the public Open Data API.',
      )
      .setVersion('0.1')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, doc);

  await app.listen(config.get<number>('port', 3000));
}
void bootstrap();
