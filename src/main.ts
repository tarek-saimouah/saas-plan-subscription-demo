import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ValidationPipe,
  ValidationPipeOptions,
  VersioningType,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import { AllExceptionsFilter } from './common';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // logger config
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  // helmet
  app.use(helmet());

  const validatorOptions: ValidationPipeOptions = {
    whitelist: true,
    transform: true,
    stopAtFirstError: true,
    exceptionFactory: (errors: any[]) => {
      const error = errors[0];
      return new BadRequestException(
        error.constraints[Object.keys(error?.constraints)[0]] as string,
      );
    },
  };
  app.useGlobalPipes(new ValidationPipe(validatorOptions));

  // versioning => default for all controllers 'v1'
  // enable versioning must be called before swagger config
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // swagger config

  // swagger auth
  app.use(
    ['/api-docs', '/api-docs-json'],
    basicAuth({
      challenge: true,
      users: {
        [process.env.SWAGGER_USER!]: process.env.SWAGGER_PASSWORD!,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('SaaS plans and subscriptions demo api')
    .setDescription('REST api for SaaS plans and subscriptions demo')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document);

  // exception filter config
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));

  // cors config
  const ORIGIN = process.env.ORIGIN || '*';
  app.enableCors({ origin: ORIGIN });

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT);
}
bootstrap();
