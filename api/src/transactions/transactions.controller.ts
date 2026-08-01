import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransactionDto } from './dto/transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionsService } from './transactions.service';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    return this.transactionsService.create(user.sub, dto);
  }

  @Post('transfer')
  createTransfer(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTransferDto,
  ): Promise<{ from: TransactionDto; to: TransactionDto }> {
    return this.transactionsService.createTransfer(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('accountDomainId') accountDomainId?: string,
  ): Promise<TransactionDto[]> {
    return this.transactionsService.findAll(user.sub, accountDomainId);
  }

  @Get(':domainId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<TransactionDto> {
    return this.transactionsService.findOne(user.sub, domainId);
  }

  @Patch(':domainId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionDto> {
    return this.transactionsService.update(user.sub, domainId, dto);
  }

  @Delete(':domainId')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<void> {
    await this.transactionsService.remove(user.sub, domainId);
  }
}
