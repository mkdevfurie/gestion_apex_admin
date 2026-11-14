import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, timer } from 'rxjs';
import { API_BASE_URL, type Health } from './api';

type HealthState = 'pending' | 'up' | 'db-down' | 'unreachable';

/** Interroge GET /api/health toutes les 30 s. */
@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  readonly state = toSignal(
    timer(0, 30_000).pipe(
      switchMap(() =>
        this.http.get<Health>(`${this.base}/health`).pipe(
          map((h): HealthState => (h.database === 'up' ? 'up' : 'db-down')),
          catchError(() => of<HealthState>('unreachable')),
        ),
      ),
    ),
    { initialValue: 'pending' as HealthState },
  );

  readonly view = computed(() => {
    switch (this.state()) {
      case 'up':
        return { label: 'API & base OK', tone: 'bg-success' };
      case 'db-down':
        return { label: 'Base injoignable', tone: 'bg-warning' };
      case 'unreachable':
        return { label: 'API injoignable', tone: 'bg-destructive' };
      default:
        return { label: 'Connexion…', tone: 'bg-muted-foreground' };
    }
  });
}
