import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { EmployeeForAuth } from '../../database/types';
import { AuthService } from './auth.service';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

class LocalAuthGuard extends AuthGuard('local') {}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@CurrentUser() employee: EmployeeForAuth) {
    return this.authService.login(employee);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  logout(@Body() dto: RefreshDto, @CurrentUser() _employee: unknown) {
    return this.authService.logout(dto);
  }
}
