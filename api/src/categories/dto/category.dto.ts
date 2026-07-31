import { Category, CategoryType } from '../../entities/category.entity';

export class CategoryDto {
  domainId: string;
  name: string;
  type: CategoryType;
  parentDomainId: string | null;
  icon: string | null;
  color: string | null;
  // Lets clients know to hide edit/delete affordances: system defaults can
  // never be mutated through this API (see CategoriesService).
  isSystemDefault: boolean;
  createdAt: Date;

  static fromEntity(category: Category): CategoryDto {
    const dto = new CategoryDto();
    dto.domainId = category.domainId;
    dto.name = category.name;
    dto.type = category.type;
    dto.parentDomainId = category.parent?.domainId ?? null;
    dto.icon = category.icon ?? null;
    dto.color = category.color ?? null;
    dto.isSystemDefault = category.userId == null;
    dto.createdAt = category.createdAt;
    return dto;
  }
}
