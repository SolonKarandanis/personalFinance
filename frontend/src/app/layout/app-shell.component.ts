import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthStore } from '@core/store/auth/auth.store';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, HlmButton],
  template: `
    <div class="flex min-h-screen bg-background">
      <aside class="flex w-56 shrink-0 flex-col border-r p-4">
        <h1 class="mb-6 px-3 text-lg font-semibold">Personal Finance</h1>
        <nav class="flex flex-1 flex-col gap-1">
          <a
            routerLink="/"
            routerLinkActive="bg-muted text-foreground"
            [routerLinkActiveOptions]="{ exact: true }"
            class="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Dashboard
          </a>
          <a
            routerLink="/accounts"
            routerLinkActive="bg-muted text-foreground"
            class="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Accounts
          </a>
          <a
            routerLink="/categories"
            routerLinkActive="bg-muted text-foreground"
            class="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Categories
          </a>
          <a
            routerLink="/transactions"
            routerLinkActive="bg-muted text-foreground"
            class="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Transactions
          </a>
          <a
            routerLink="/budgets"
            routerLinkActive="bg-muted text-foreground"
            class="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Budgets
          </a>
          <a
            routerLink="/profile"
            routerLinkActive="bg-muted text-foreground"
            class="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Profile
          </a>
        </nav>
        <button hlmBtn variant="outline" (click)="authStore.logout()">Log out</button>
      </aside>
      <main class="min-w-0 flex-1 overflow-y-auto">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  protected readonly authStore = inject(AuthStore);
}
