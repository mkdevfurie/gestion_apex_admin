import { environment } from '../../environments/environment';
import { InjectionToken } from '@angular/core';

/**
 * Base de l'API NestJS.
 * En dev, `ng serve` relaie /api vers http://localhost:3001 (voir proxy.conf.json).
 * En production, l'URL de l'API vient de src/environments/environment.ts.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.apiBaseUrl,
});

export type Health = { status: 'ok'; database: 'up' | 'down'; time: string };
