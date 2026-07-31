import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { CategoryType } from '../../entities/category.entity';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsOptional()
  @IsUUID()
  parentDomainId?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
