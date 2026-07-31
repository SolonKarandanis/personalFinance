import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  @Patch(':domainId')
  updateProfile(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(domainId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':domainId/password')
  changePassword(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(domainId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':domainId/activate')
  activate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<UserDto> {
    return this.usersService.activate(domainId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':domainId/deactivate')
  deactivate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<UserDto> {
    return this.usersService.deactivate(domainId);
  }
}
