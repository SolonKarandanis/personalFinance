import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCard } from '@spartan-ng/helm/card';
import { AuthStore } from '@core/store/auth/auth.store';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, HlmButton, HlmInput, HlmLabel, HlmCard],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background p-4">
      <div hlmCard class="w-full max-w-sm p-6">
        <h1 class="mb-6 text-xl font-semibold">Log in</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="email">Email</label>
            <input hlmInput id="email" type="email" formControlName="email" autocomplete="email" />
          </div>
          <div class="flex flex-col gap-1.5">
            <label hlmLabel for="password">Password</label>
            <input
              hlmInput
              id="password"
              type="password"
              formControlName="password"
              autocomplete="current-password"
            />
          </div>
          @if (authStore.error(); as error) {
            <p class="text-sm text-destructive">{{ error }}</p>
          }
          <button hlmBtn type="submit" [disabled]="form.invalid || authStore.loading()">
            {{ authStore.loading() ? 'Logging in…' : 'Log in' }}
          </button>
        </form>
        <p class="mt-4 text-sm text-muted-foreground">
          No account?
          <a routerLink="/register" class="text-primary underline">Register</a>
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  protected readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    // login() is an rxMethod (fire-and-forget dispatch), so we react to the
    // resulting state change rather than a return value.
    effect(() => {
      if (this.authStore.isAuthenticated()) {
        void this.router.navigateByUrl('/');
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.authStore.login(this.form.getRawValue());
  }
}
