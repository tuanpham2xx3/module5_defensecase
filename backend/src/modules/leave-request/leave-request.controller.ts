import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { LeaveRequestDto } from './dto/leave-request.dto';
import { LeaveRequestService } from './leave-request.service';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@Controller('leave-requests')
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Nộp đơn xin nghỉ phép (Tất cả nhân viên đã đăng nhập)',
    description:
      'Tạo mới đơn nghỉ phép ở trạng thái PENDING. Tự động kiểm tra startDate và endDate.',
  })
  @ApiCreatedResponse({ description: 'Nộp đơn nghỉ phép thành công' })
  @ApiBadRequestResponse({ description: 'Validation thất bại hoặc endDate < startDate' })
  @ApiUnauthorizedResponse({ description: 'Chưa xác thực hoặc token không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy nhân viên' })
  createLeaveRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LeaveRequestDto,
  ) {
    return this.leaveRequestService.createLeaveRequest(user.sub, dto);
  }

  @Patch(':id/approve-manager')
  @Roles(Role.MANAGER)
  @ApiOperation({
    summary: 'Cấp 1: Quản lý trực tiếp phê duyệt đơn nghỉ phép (MANAGER only)',
    description:
      'Chỉ quản lý trực tiếp của nhân viên (manager_id === req.user.sub) mới có quyền duyệt sang APPROVED_BY_MANAGER.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID đơn nghỉ phép' })
  @ApiOkResponse({ description: 'Quản lý trực tiếp phê duyệt thành công' })
  @ApiBadRequestResponse({ description: 'Đơn nghỉ phép đã được xử lý trước đó' })
  @ApiForbiddenResponse({
    description: 'Từ chối: Bạn không phải là quản lý trực tiếp của nhân viên này',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn nghỉ phép' })
  @ApiUnauthorizedResponse({ description: 'Chưa xác thực' })
  approveLeaveRequestManager(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.leaveRequestService.approveLeaveRequestManager(user.sub, id);
  }

  @Patch(':id/approve-hr')
  @Roles(Role.HR_MANAGER)
  @ApiOperation({
    summary: 'Cấp 2: HR Manager phê duyệt cuối cùng (HR_MANAGER only)',
    description:
      'Phê duyệt cấp cuối. Bắt buộc đơn đã được duyệt cấp 1 (APPROVED_BY_MANAGER). Đổi trạng thái sang APPROVED_BY_HR.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID đơn nghỉ phép' })
  @ApiOkResponse({ description: 'HR phê duyệt đơn nghỉ phép thành công' })
  @ApiBadRequestResponse({
    description: 'Đơn nghỉ phép cần được Quản lý trực tiếp phê duyệt trước',
  })
  @ApiForbiddenResponse({ description: 'Từ chối: Yêu cầu quyền HR_MANAGER' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn nghỉ phép' })
  @ApiUnauthorizedResponse({ description: 'Chưa xác thực' })
  approveLeaveRequestHRManager(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.leaveRequestService.approveLeaveRequestHRManager(user.sub, id);
  }
}
