import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
  ValidationPipeOptions,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { cleanDatabase, seedStandardPlans } from './test-utils';
import { AllExceptionsFilter } from 'src/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaService } from 'src/database';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

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
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });

    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await seedStandardPlans(prisma);
  }, 12_000);

  it('GET /v1/billing/plans (GET)', () => {
    return request(app.getHttpServer()).get('/v1/billing/plans').expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
