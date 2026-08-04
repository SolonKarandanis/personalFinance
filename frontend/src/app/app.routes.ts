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
        loadComponent: () =>
          import('./dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
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
      {
        path: 'transactions',
        loadComponent: () =>
          import('./transactions/transactions-page.component').then((m) => m.TransactionsPageComponent),
      },
      {
        path: 'transactions/new',
        loadComponent: () =>
          import('./transactions/transaction-edit-page.component').then((m) => m.TransactionEditPageComponent),
      },
      {
        path: 'transactions/transfer/new',
        loadComponent: () =>
          import('./transactions/transaction-transfer-page.component').then(
            (m) => m.TransactionTransferPageComponent,
          ),
      },
      {
        path: 'transactions/:domainId/edit',
        loadComponent: () =>
          import('./transactions/transaction-edit-page.component').then((m) => m.TransactionEditPageComponent),
      },
      {
        path: 'transactions/import',
        loadComponent: () =>
          import('./transactions/transaction-import-page.component').then(
            (m) => m.TransactionImportPageComponent,
          ),
      },
      {
        path: 'budgets',
        loadComponent: () => import('./budgets/budgets-page.component').then((m) => m.BudgetsPageComponent),
      },
      {
        path: 'budgets/new',
        loadComponent: () =>
          import('./budgets/budget-edit-page.component').then((m) => m.BudgetEditPageComponent),
      },
      {
        path: 'budgets/:domainId/edit',
        loadComponent: () =>
          import('./budgets/budget-edit-page.component').then((m) => m.BudgetEditPageComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./profile/profile-page.component').then((m) => m.ProfilePageComponent),
      },
    ],
  },
];
