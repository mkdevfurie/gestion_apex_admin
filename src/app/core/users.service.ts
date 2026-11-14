import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { UserCreateInput, UserUpdateInput } from '../../shared/auth';
import type { TemporaryPasswordResponse, UserRow } from '../../shared/roles';
import { API_BASE_URL } from './api';

@Injectable({ providedIn: 'root' })
export class UsersApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/users`;

  list() {
    return firstValueFrom(this.http.get<UserRow[]>(this.base));
  }

  create(input: UserCreateInput) {
    return firstValueFrom(this.http.post<TemporaryPasswordResponse>(this.base, input));
  }

  update(id: string, input: UserUpdateInput) {
    return firstValueFrom(this.http.patch<UserRow>(`${this.base}/${id}`, input));
  }

  revokeSessions(id: string) {
    return firstValueFrom(this.http.post<{ revoked: number }>(`${this.base}/${id}/revoke-sessions`, {}));
  }

  resetPassword(id: string) {
    return firstValueFrom(this.http.post<TemporaryPasswordResponse>(`${this.base}/${id}/reset-password`, {}));
  }
}
