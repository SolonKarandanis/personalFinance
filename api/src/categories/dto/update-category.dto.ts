import { IsOptional, IsString } from 'class-validator';

// type and parentDomainId are deliberately not updatable here — changing a
// category's type or moving it to a different parent post-creation would
// need cascading re-validation (children's type match, nesting depth) that
// isn't worth the complexity yet. Only cosmetic fields can change.
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
