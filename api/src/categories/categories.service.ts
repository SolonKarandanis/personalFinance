import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category, CategoryType } from '../entities/category.entity';
import { CategoryDto } from './dto/category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async create(userId: number, dto: CreateCategoryDto): Promise<CategoryDto> {
    let parentId: number | undefined;
    if (dto.parentDomainId) {
      const parent = await this.resolveParent(
        userId,
        dto.type,
        dto.parentDomainId,
      );
      parentId = parent.id;
    }

    const category = this.categoriesRepository.create({
      name: dto.name,
      type: dto.type,
      icon: dto.icon,
      color: dto.color,
      userId,
      parentId,
    });
    const saved = await this.categoriesRepository.save(category);
    return this.findOne(userId, saved.domainId);
  }

  // Visible to a user: their own categories, plus every system default.
  async findAll(userId: number): Promise<CategoryDto[]> {
    const categories = await this.categoriesRepository.find({
      where: [{ userId }, { userId: IsNull() }],
      relations: { parent: true },
      order: { type: 'ASC', name: 'ASC' },
    });
    return categories.map((category) => CategoryDto.fromEntity(category));
  }

  async findOne(userId: number, domainId: string): Promise<CategoryDto> {
    const category = await this.categoriesRepository.findOne({
      where: [
        { domainId, userId },
        { domainId, userId: IsNull() },
      ],
      relations: { parent: true },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return CategoryDto.fromEntity(category);
  }

  async update(
    userId: number,
    domainId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    const category = await this.findOwnedOrThrow(userId, domainId);
    await this.categoriesRepository.update(category.id, dto);
    return this.findOne(userId, domainId);
  }

  // Safe as a real delete: Transaction.category is onDelete SET NULL, so no
  // transaction data is destroyed, unlike Account (see AccountsService).
  async remove(userId: number, domainId: string): Promise<void> {
    const category = await this.findOwnedOrThrow(userId, domainId);
    await this.categoriesRepository.delete(category.id);
  }

  private async resolveParent(
    userId: number,
    type: CategoryType,
    parentDomainId: string,
  ): Promise<Category> {
    const parent = await this.categoriesRepository.findOneBy([
      { domainId: parentDomainId, userId },
      { domainId: parentDomainId, userId: IsNull() },
    ]);
    if (!parent) {
      throw new NotFoundException('Parent category not found');
    }
    if (parent.parentId != null) {
      throw new BadRequestException(
        'Subcategories cannot themselves have a parent (max one level of nesting)',
      );
    }
    if (parent.type !== type) {
      throw new BadRequestException(
        'A subcategory must have the same type as its parent',
      );
    }
    return parent;
  }

  // Only ever matches the caller's own categories — userId IS NULL (system
  // defaults) never matches here, so those can't be edited or deleted
  // through this API regardless of who's calling.
  private async findOwnedOrThrow(
    userId: number,
    domainId: string,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({
      domainId,
      userId,
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }
}
