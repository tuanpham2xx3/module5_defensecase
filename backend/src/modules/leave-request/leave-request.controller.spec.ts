import { Test, TestingModule } from '@nestjs/testing';
import { LeaveRequestController } from './leave-request.controller';
import { LeaveRequestService } from './leave-request.service';

describe('LeaveRequestController', () => {
  let controller: LeaveRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaveRequestController],
      providers: [LeaveRequestService],
    }).compile();

    controller = module.get<LeaveRequestController>(LeaveRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
