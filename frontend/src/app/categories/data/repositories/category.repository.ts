import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseRepository } from '@core/repositories/base-repository';
import { ApiEndpoints } from '@core/repositories/api-endpoints';

export type CategoryType = 'income' | 'expense' | 'transfer';

export interface Category {
  domainId: string;
  name: string;
  type: CategoryType;
  parentDomainId: string | null;
  icon: string | null;
  color: string | null;
  isSystemDefault: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: CategoryType;
  parentDomainId?: string;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  icon?: string;
  color?: string;
}

// GET methods use httpResource — authInterceptor attaches the Authorization
// header and withCredentials to every outgoing request, including these.
@Injectable({ providedIn: 'root' })
export class CategoryRepository extends BaseRepository {
  listCategories(): HttpResourceRef<Category[] | undefined> {
    return httpResource<Category[]>(() => ({ url: ApiEndpoints.CATEGORIES }));
  }

  getCategory(domainId: () => string | undefined): HttpResourceRef<Category | undefined> {
    return httpResource<Category>(() => {
      const id = domainId();
      return id ? { url: `${ApiEndpoints.CATEGORIES}/${id}` } : undefined;
    });
  }

  createCategory(request: CreateCategoryRequest): Observable<Category> {
    return this.http.post<Category>(ApiEndpoints.CATEGORIES, request);
  }

  updateCategory(domainId: string, request: UpdateCategoryRequest): Observable<Category> {
    return this.http.patch<Category>(`${ApiEndpoints.CATEGORIES}/${domainId}`, request);
  }

  deleteCategory(domainId: string): Observable<void> {
    return this.http.delete<void>(`${ApiEndpoints.CATEGORIES}/${domainId}`);
  }
}
