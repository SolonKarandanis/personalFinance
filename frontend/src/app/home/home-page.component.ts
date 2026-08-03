import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  imports: [],
  template: `
    <div class="p-6">
      <h1 class="text-xl font-semibold">Welcome</h1>
      <p class="mt-1 text-sm text-muted-foreground">Use the sidebar to manage your accounts and categories.</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {}
