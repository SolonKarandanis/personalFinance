import { environment } from '@environments/environment';

export const ApiEndpoints = {
  AUTH: `${environment.apiUrl}/auth`,
  USERS: `${environment.apiUrl}/users`,
  ACCOUNTS: `${environment.apiUrl}/accounts`,
  CATEGORIES: `${environment.apiUrl}/categories`,
  TRANSACTIONS: `${environment.apiUrl}/transactions`,
  BUDGETS: `${environment.apiUrl}/budgets`,
} as const;
