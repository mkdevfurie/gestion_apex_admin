import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  template: `
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
      <p class="text-sm text-muted-foreground">Écran à venir.</p>
    </div>
  `,
})
export class Placeholder {
  protected readonly title: string = inject(ActivatedRoute).snapshot.data['title'] ?? '';
}
