import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { AccountsService } from './accounts.service';
import { AccountDto } from './dto/account.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<AccountDto[]> {
    return this.accountsService.findAll(user.sub);
  }

  @Get(':domainId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<AccountDto> {
    return this.accountsService.findOne(user.sub, domainId);
  }

  @Patch(':domainId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.update(user.sub, domainId, dto);
  }

  @Delete(':domainId')
  archive(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<AccountDto> {
    return this.accountsService.archive(user.sub, domainId);
  }
}
