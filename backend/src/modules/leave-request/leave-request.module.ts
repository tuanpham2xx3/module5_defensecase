import { Module } from '@nestjs/common';

import { LeaveRequestController } from './leave-request.controller.js';
import { LeaveRequestService } from './leave-request.service.js';

@Module({
  controllers: [LeaveRequestController],
  providers: [LeaveRequestService],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}
