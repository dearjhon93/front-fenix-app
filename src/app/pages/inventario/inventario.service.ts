import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ProductoLocalDto {
  secLocal: number;
  desLocal: string;
  cantidad: number;
}

export interface ProductoDto {
  secProducto: number;
  codProductoProveedor: string;
  descripcion: string;
  precioVenta: number;
  codEstado: string;
  locales: ProductoLocalDto[];
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
export class InventarioService {
  private http = inject(HttpClient);

  getProductos(): Observable<ProductoDto[]> {
    return this.http
      .get<ApiResponse<ProductoDto[]>>(`${environment.apiUrl}/productos`)
      .pipe(map((res) => res.data));
  }
}
