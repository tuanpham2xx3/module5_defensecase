import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { LeaveQueryDto } from './dto/leave-query.dto';
import { LeaveRequestDto } from './dto/leave-request.dto';
import { LeaveRequestService } from './leave-request.service';

@Controller('leave-requests')
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Post()
  createLeaveRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LeaveRequestDto,
  ) {
    return this.leaveRequestService.createLeaveRequest(user.sub, dto);
  }

  @Get('me')
  getMyLeaveRequests(
    @CurrentUser() user: JwtPayload,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leaveRequestService.getMyLeaveRequests(user.sub, query);
  }

  @Get()
  @Roles(Role.MANAGER, Role.HR_MANAGER, Role.ADMIN)
  getLeaveRequests(
    @CurrentUser() user: JwtPayload,
    @Query() query: LeaveQueryDto,
  ) {
    return this.leaveRequestService.getLeaveRequests(user, query);
  }

  @Patch(':id/approve-manager')
  @Roles(Role.MANAGER)
  approveLeaveRequestManager(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.leaveRequestService.approveLeaveRequestManager(user.sub, id);
  }

  @Patch(':id/reject-manager')
  @Roles(Role.MANAGER)
  rejectLeaveRequestManager(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.leaveRequestService.rejectLeaveRequestManager(user.sub, id);
  }

  @Patch(':id/approve-hr')
  @Roles(Role.HR_MANAGER)
  approveLeaveRequestHRManager(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.leaveRequestService.approveLeaveRequestHRManager(user.sub, id);
  }

  @Patch(':id/reject-hr')
  @Roles(Role.HR_MANAGER)
  rejectLeaveRequestHRManager(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.leaveRequestService.rejectLeaveRequestHRManager(user.sub, id);
  }
}
