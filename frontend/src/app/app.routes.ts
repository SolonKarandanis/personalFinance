import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./auth/register/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./home/home-page.component').then((m) => m.HomePageComponent),
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./accounts/accounts-page.component').then((m) => m.AccountsPageComponent),
      },
      {
        path: 'accounts/new',
        loadComponent: () =>
          import('./accounts/account-edit-page.component').then((m) => m.AccountEditPageComponent),
      },
      {
        path: 'accounts/:domainId/edit',
        loadComponent: () =>
          import('./accounts/account-edit-page.component').then((m) => m.AccountEditPageComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./categories/categories-page.component').then((m) => m.CategoriesPageComponent),
      },
      {
        path: 'categories/new',
        loadComponent: () =>
          import('./categories/category-edit-page.component').then((m) => m.CategoryEditPageComponent),
      },
      {
        path: 'categories/:domainId/edit',
        loadComponent: () =>
          import('./categories/category-edit-page.component').then((m) => m.CategoryEditPageComponent),
      },
    ],
  },
];
