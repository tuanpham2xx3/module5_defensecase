import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../database/prisma.service.js';
import { AuditLogsService } from './audit-logs.service.js';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  const mockPrisma = {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns paginated audit logs with metadata', async () => {
    const mockLog = {
      id: 1,
      tableName: 'employees',
      action: 'UPDATE',
      oldData: { role: 'USER' },
      newData: { role: 'MANAGER' },
      actorId: 1,
      createdAt: new Date(),
    };
    mockPrisma.auditLog.findMany.mockResolvedValue([mockLog]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      tableName: 'employees',
      action: 'update',
      actorId: 1,
    });

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tableName: 'employees',
          action: 'UPDATE',
          actorId: 1,
        }),
        skip: 0,
        take: 10,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
  });
});
