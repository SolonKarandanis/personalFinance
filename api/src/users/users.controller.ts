import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnDomainIdGuard } from '../auth/guards/own-domain-id.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
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
  account(@CurrentUser() user: JwtPayload): Promise<UserDto> {
    return this.usersService.getSafeUser(user.sub);
  }

  @UseGuards(JwtAuthGuard, OwnDomainIdGuard)
  @Patch(':domainId')
  updateProfile(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(domainId, dto);
  }

  @UseGuards(JwtAuthGuard, OwnDomainIdGuard)
  @Patch(':domainId/password')
  changePassword(
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(domainId, dto);
  }

  @UseGuards(JwtAuthGuard, OwnDomainIdGuard)
  @Patch(':domainId/activate')
  activate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<UserDto> {
    return this.usersService.activate(domainId);
  }

  @UseGuards(JwtAuthGuard, OwnDomainIdGuard)
  @Patch(':domainId/deactivate')
  deactivate(
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<UserDto> {
    return this.usersService.deactivate(domainId);
  }
}
