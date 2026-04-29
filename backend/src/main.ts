import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

function validateEnv(configService: ConfigService) {
  const jwtSecret = configService.get<string>('JWT_SECRET');
  const jwtRefreshSecret = configService.get<string>('JWT_REFRESH_SECRET');

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET debe estar configurado y tener al menos 32 caracteres. ' +
      'Configura esta variable de entorno antes de iniciar el servidor.',
    );
  }
  if (!jwtRefreshSecret || jwtRefreshSecret.length < 32) {
    throw new Error(
      'JWT_REFRESH_SECRET debe estar configurado y tener al menos 32 caracteres. ' +
      'Configura esta variable de entorno antes de iniciar el servidor.',
    );
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  validateEnv(configService);

  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const allowedOrigins = [
    ...frontendUrl.split(',').map((u) => u.trim()),
    'http://localhost:3000',
  ];

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-ID'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Elemental Pro - Help Desk API')
    .setDescription('Sistema de Gestión de Tickets - API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Authentication endpoints')
    .addTag('tickets', 'Ticket management')
    .addTag('users', 'User management')
    .addTag('companies', 'Company management')
    .addTag('dashboard', 'Dashboard metrics')
    .addTag('comments', 'Ticket comments')
    .addTag('notifications', 'Notification system')
    .addTag('assets', 'Asset management')
    .addTag('reports', 'PDF report generation')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`
  ╔════════════════════════════════════════╗
  ║   Elemental Pro - Help Desk System     ║
  ║   API Server running on port ${port}      ║
  ║   Swagger: http://localhost:${port}/api/docs ║
  ╚════════════════════════════════════════╝
  `);
}

bootstrap();
