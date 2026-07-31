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
import { CategoriesService } from './categories.service';
import { CategoryDto } from './dto/category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.create(user.sub, dto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<CategoryDto[]> {
    return this.categoriesService.findAll(user.sub);
  }

  @Get(':domainId')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<CategoryDto> {
    return this.categoriesService.findOne(user.sub, domainId);
  }

  @Patch(':domainId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categoriesService.update(user.sub, domainId, dto);
  }

  @Delete(':domainId')
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('domainId', ParseUUIDPipe) domainId: string,
  ): Promise<void> {
    await this.categoriesService.remove(user.sub, domainId);
  }
}
