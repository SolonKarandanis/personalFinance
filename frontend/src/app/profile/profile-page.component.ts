import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmCard } from '@spartan-ng/helm/card';
import { UsersService } from './data/services/users.service';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule, HlmButton, HlmInput, HlmLabel, HlmCard],
  template: `
    <div class="p-4">
      <div class="mx-auto flex max-w-lg flex-col gap-6">
        <h1 class="text-xl font-semibold">Profile</h1>

        @if (usersService.profileLoading()) {
          <p class="text-sm text-muted-foreground">Loading…</p>
        } @else if (usersService.profileError(); as error) {
          <p class="text-sm text-destructive">{{ error }}</p>
        } @else if (usersService.user(); as user) {
          <div hlmCard class="flex flex-col gap-4 p-6">
            <h2 class="font-medium">Account details</h2>
            <form [formGroup]="profileForm" (ngSubmit)="submitProfile()" class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="firstName">First name</label>
                <input hlmInput id="firstName" type="text" formControlName="firstName" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="lastName">Last name</label>
                <input hlmInput id="lastName" type="text" formControlName="lastName" />
              </div>
              <dl class="grid grid-cols-2 gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <dt>Email</dt>
                <dd>{{ user.email }}</dd>
                <dt>Currency</dt>
                <dd>{{ user.currency }}</dd>
                <dt>Status</dt>
                <dd>{{ user.status }}</dd>
                <dt>Member since</dt>
                <dd>{{ user.createdAt }}</dd>
              </dl>
              @if (profileError(); as error) {
                <p class="text-sm text-destructive">{{ error }}</p>
              }
              <button hlmBtn type="submit" [disabled]="profileForm.invalid || usersService.saving()">
                {{ usersService.saving() ? 'Saving…' : 'Save' }}
              </button>
            </form>
          </div>

          <div hlmCard class="flex flex-col gap-4 p-6">
            <h2 class="font-medium">Change password</h2>
            <form [formGroup]="passwordForm" (ngSubmit)="submitPassword()" class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="currentPassword">Current password</label>
                <input
                  hlmInput
                  id="currentPassword"
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="newPassword">New password</label>
                <input
                  hlmInput
                  id="newPassword"
                  type="password"
                  formControlName="newPassword"
                  autocomplete="new-password"
                />
              </div>
              <div class="flex flex-col gap-1.5">
                <label hlmLabel for="confirmPassword">Confirm new password</label>
                <input
                  hlmInput
                  id="confirmPassword"
                  type="password"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                />
              </div>
              @if (passwordMismatch()) {
                <p class="text-sm text-destructive">New passwords don't match.</p>
              }
              @if (passwordError(); as error) {
                <p class="text-sm text-destructive">{{ error }}</p>
              }
              <button
                hlmBtn
                type="submit"
                [disabled]="passwordForm.invalid || passwordMismatch() || usersService.saving()"
              >
                {{ usersService.saving() ? 'Saving…' : 'Change password' }}
              </button>
            </form>
          </div>

          <div hlmCard class="flex flex-col gap-3 p-6">
            <h2 class="font-medium">Deactivate account</h2>
            <p class="text-sm text-muted-foreground">
              You'll be signed out immediately and won't be able to log back in until reactivated.
            </p>
            <button hlmBtn variant="destructive" (click)="deactivate()">Deactivate account</button>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  protected readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
  });

  protected readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  // Local, per-form error snapshots — the store's saveError() is shared
  // across all three mutations here (one Detail store, no separate stores
  // to isolate them the way every other domain does), so binding it
  // directly in more than one place would bleed one form's error into
  // another's. Each form instead captures its own snapshot at the moment
  // its own submit fails.
  protected readonly profileError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly passwordMismatch = computed(() => {
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    return confirmPassword.length > 0 && newPassword !== confirmPassword;
  });

  constructor() {
    effect(() => {
      const user = this.usersService.user();
      if (user) {
        this.profileForm.patchValue({ firstName: user.firstName, lastName: user.lastName });
      }
    });
  }

  protected submitProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }
    this.profileError.set(null);
    const { firstName, lastName } = this.profileForm.getRawValue();
    this.usersService
      .updateProfile({ firstName, lastName })
      .catch(() => this.profileError.set(this.usersService.saveError()));
  }

  protected submitPassword(): void {
    if (this.passwordForm.invalid || this.passwordMismatch()) {
      return;
    }
    this.passwordError.set(null);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.usersService
      .changePassword({ currentPassword, newPassword })
      .then(() => this.router.navigateByUrl('/login'))
      .catch(() => this.passwordError.set(this.usersService.saveError()));
  }

  protected deactivate(): void {
    if (confirm('Deactivate your account? You will be signed out and unable to log back in.')) {
      void this.usersService.deactivate().then(() => this.router.navigateByUrl('/login'));
    }
  }
}
