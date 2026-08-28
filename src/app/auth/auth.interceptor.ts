import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);

  const token = localStorage.getItem('sga_token');
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('sga_token');
        localStorage.removeItem('sga_current_user');
        router.navigate(['/login']);
      } else if (error.status === 0) {
        console.error('Error de conexión: el backend no responde.');
      } else {
        const msg =
          error.error?.message ||
          error.error ||
          'Error inesperado del servidor';
        console.error(`HTTP ${error.status}: ${msg}`);
      }
      return throwError(() => error);
    })
  );
};
