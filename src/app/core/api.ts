import { InjectionToken } from '@angular/core';

/**
 * Base de l'API NestJS.
 * En dev, `ng serve` relaie /api vers http://localhost:3001 (voir proxy.conf.json).
 * En production, fournir l'URL publique dans app.config.ts :
 *   { provide: API_BASE_URL, useValue: 'https://api.exemple.sn/api' }
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api',
});

export type Health = { status: 'ok'; database: 'up' | 'down'; time: string };
