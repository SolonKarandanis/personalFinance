import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
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
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.create(req.user.sub, dto);
  }

  @Get()
  findAll(
    @Req() req: Request & { user: JwtPayload },
  ): Promise<AccountDto[]> {
    return this.accountsService.findAll(req.user.sub);
  }

  @Get(':domainId')
  findOne(
    @Req() req: Request & { user: JwtPayload },
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<AccountDto> {
    return this.accountsService.findOne(req.user.sub, domainId);
  }

  @Patch(':domainId')
  update(
    @Req() req: Request & { user: JwtPayload },
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountDto> {
    return this.accountsService.update(req.user.sub, domainId, dto);
  }

  @Delete(':domainId')
  archive(
    @Req() req: Request & { user: JwtPayload },
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<AccountDto> {
    return this.accountsService.archive(req.user.sub, domainId);
  }
}
