import { Controller } from '@nestjs/common';
import { LeaveRequestService } from './leave-request.service';

@Controller('leave-request')
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}
}
