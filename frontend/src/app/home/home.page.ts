import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { AuthStore } from '@core/store/auth/auth.store';

@Component({
  selector: 'app-home-page',
  imports: [HlmButton],
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4">
      <h1 class="text-xl font-semibold">You're logged in</h1>
      <button hlmBtn variant="outline" (click)="authStore.logout()">Log out</button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  protected readonly authStore = inject(AuthStore);
}
