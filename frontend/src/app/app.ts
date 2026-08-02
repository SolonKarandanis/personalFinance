import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '@core/store/auth/auth.store';

const PUBLIC_ROUTES = ['/login', '/register'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  constructor() {
    // Centralized so every way a session can end — explicit logout, or the
    // interceptor's silent refresh failing after a 401 — redirects the same
    // way, without each protected page needing its own copy of this effect.
    effect(() => {
      const loggedOut = this.authStore.bootstrapped() && !this.authStore.isAuthenticated();
      if (loggedOut && !PUBLIC_ROUTES.includes(this.router.url)) {
        void this.router.navigateByUrl('/login');
      }
    });
  }
}
