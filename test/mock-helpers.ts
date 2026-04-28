import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaService } from 'src/database';

export function createPrismaMock(): DeepMockProxy<PrismaService> {
  return mockDeep<PrismaService>();
}

export function createLoggerMock() {
  return {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  };
}
