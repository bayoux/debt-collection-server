import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiNormalizationInterceptor } from './common/interceptors/api-normalization.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation pipe — strip unknown fields, auto-transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS
  app.enableCors();

  // Normalize responses: camelCase → snake_case + pagination next/previous
  app.useGlobalInterceptors(new ApiNormalizationInterceptor());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Debt Collection API')
    .setDescription(
      'Автоматизированная система управления дебиторской задолженностью с модулем омниканальных уведомлений',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Аутентификация и управление токенами')
    .addTag('Users', 'Пользователи системы')
    .addTag('Roles', 'Роли и права доступа')
    .addTag('Debtors', 'Должники')
    .addTag('DebtCases', 'Дела о задолженности')
    .addTag('Notifications', 'Шаблоны и логи уведомлений')
    .addTag('Scheduler', 'Запланированные задачи рассылки')
    .addTag('PTP', 'Обещания об оплате')
    .addTag('Reports', 'Аналитика и отчёты')
    .addTag('Integrations', 'Конфигурация внешних каналов')
    .addTag('Telegram', 'Прямая отправка сообщений через Telegram-бота')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.APP_PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application running on: http://localhost:${port}/api/v1`);
  console.log(`📄 Swagger docs:           http://localhost:${port}/api/docs`);
}

bootstrap();
