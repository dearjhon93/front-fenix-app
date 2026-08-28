import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DashboardResumenDto {
  totalProductos: number;
  totalProveedores: number;
  totalLocales: number;
  totalUsuarios: number;
  totalFacturas: number;
  ventasTotales: number;
}

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);

  getResumen(): Observable<DashboardResumenDto> {
    return this.http
      .get<ApiResponse<DashboardResumenDto>>(
        `${environment.apiUrl}/dashboard/resumen`
      )
      .pipe(map((res) => res.data));
  }
}
