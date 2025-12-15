import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: (errors) => {

          const constraints = errors[0]?.constraints;
          const firstError = constraints ? Object.values(constraints)[0] : 'Validation failed';

          return new BadRequestException({
            success: false,
            message: firstError,
            error: 'Bad Request',
            statusCode: 400,
          });
      },
      transformOptions: {
      enableImplicitConversion: true,
    },
    
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
