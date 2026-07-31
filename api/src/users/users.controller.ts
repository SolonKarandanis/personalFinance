import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('account')
  account(@Req() req: Request & { user: JwtPayload }): Promise<UserDto> {
    return this.usersService.getSafeUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('account')
  updateProfile(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('account/password')
  changePassword(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('account/activate')
  activate(@Req() req: Request & { user: JwtPayload }): Promise<UserDto> {
    return this.usersService.activate(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('account/deactivate')
  deactivate(@Req() req: Request & { user: JwtPayload }): Promise<UserDto> {
    return this.usersService.deactivate(req.user.sub);
  }
}
