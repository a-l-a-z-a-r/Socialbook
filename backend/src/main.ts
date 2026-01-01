import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://46.62.130.16:30090',
      'http://socialbook.46-62-130-16.nip.io',
      'https://socialbook.46-62-130-16.nip.io',
    ],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 5000;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
