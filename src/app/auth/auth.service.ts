import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  name: string;
  email: string;
  role: number; // 0: admin, 1: usuario
}

export const ROLES = {
  ADMIN: 0,
  USUARIO: 1,
  CAJA: 2,
  BODEGA: 3,
} as const;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  username: string;
  role: number; // 0: admin, 1: usuario
}

const CURRENT_USER_KEY = 'sga_current_user';
const TOKEN_KEY = 'sga_token';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  currentUser = signal<User | null>(null);

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  constructor() {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    if (!this.isBrowser()) return;
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
  }

  login(username: string, password: string) {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/login`,
        { username, password }
      )
      .pipe(
        tap((res) => {
          const user: User = {
            id: '1',
            name: res.username,
            email: res.username,
            role: res.role ?? ROLES.USUARIO,
          };
          this.currentUser.set(user);

          if (this.isBrowser()) {
            const token = this.generateToken(username, user.role);
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
            localStorage.setItem(TOKEN_KEY, token);
          }
        })
      );
  }

  logout(): void {
    this.currentUser.set(null);
    if (this.isBrowser()) {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(role: number): boolean {
    return this.currentUser()?.role === role;
  }

  isAdmin(): boolean {
    return this.hasRole(ROLES.ADMIN);
  }

  private generateToken(username: string, role: number): string {
    const payload = {
      sub: username,
      role,
      iat: Date.now(),
      exp: Date.now() + 8 * 60 * 60 * 1000, // 8 horas
    };
    return btoa(JSON.stringify(payload));
  }
}
