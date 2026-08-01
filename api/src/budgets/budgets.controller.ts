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
import { BudgetsService } from './budgets.service';
import { BudgetDto } from './dto/budget.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetDto> {
    return this.budgetsService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<BudgetDto[]> {
    return this.budgetsService.findAll(user.sub);
  }

  @Get(':domainId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<BudgetDto> {
    return this.budgetsService.findOne(user.sub, domainId);
  }

  @Patch(':domainId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetDto> {
    return this.budgetsService.update(user.sub, domainId, dto);
  }

  @Delete(':domainId')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<void> {
    await this.budgetsService.remove(user.sub, domainId);
  }
}
