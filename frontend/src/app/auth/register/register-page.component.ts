import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCard } from '@spartan-ng/helm/card';
import { AuthStore } from '@core/store/auth/auth.store';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, HlmButton, HlmInput, HlmLabel, HlmCard],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-background p-4">
      <div hlmCard class="w-full max-w-sm p-6">
        <h1 class="mb-6 text-xl font-semibold">Create an account</h1>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <div class="flex gap-3">
            <div class="flex flex-1 flex-col gap-1.5">
              <label hlmLabel for="firstName">First name</label>
              <input hlmInput id="firstName" type="text" formControlName="firstName" autocomplete="given-name" />
            </div>
            <div class="flex flex-1 flex-col gap-1.5">
              <label hlmLabel for="lastName">Last name</label>
              <input hlmInput id="lastName" type="text" formControlName="lastName" autocomplete="family-name" />
            </div>
          </div>
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
              autocomplete="new-password"
            />
            <p class="text-xs text-muted-foreground">At least 8 characters.</p>
          </div>
          @if (authStore.error(); as error) {
            <p class="text-sm text-destructive">{{ error }}</p>
          }
          <button hlmBtn type="submit" [disabled]="form.invalid || authStore.loading()">
            {{ authStore.loading() ? 'Creating account…' : 'Create account' }}
          </button>
        </form>
        <p class="mt-4 text-sm text-muted-foreground">
          Already have an account?
          <a routerLink="/login" class="text-primary underline">Log in</a>
        </p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
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
    this.authStore.register(this.form.getRawValue());
  }
}
