import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_CONFIG } from '@config/tokens';
import { EnvironmentVariables } from '@config/env';
import { GlobalExceptionFilter } from '@infrastructure/http/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = app.get<EnvironmentVariables>(APP_CONFIG);
  await app.listen(config.PORT);
}

void bootstrap();