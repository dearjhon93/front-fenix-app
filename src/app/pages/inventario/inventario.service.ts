import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ProductoLocalDto {
  secLocal: number;
  desLocal: string;
  cantidad: number;
  observacion?: string | null;
  idFactura?: number | null;
  numFactura?: string | null;
}

export interface ProductoHistorialDto {
  secLocal: number;
  desLocal: string;
  cantidad: number;
  observacion?: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaModificacion: string | null;
  idFactura?: number | null;
  numFactura?: string | null;
  numeroFactura?: string | null;
}

export interface ProductoDto {
  secProducto: number;
  codProductoProveedor: string;
  descripcion: string;
  precioVenta: number;
  codEstado: string;
  locales: ProductoLocalDto[];
  nomProveedor?: string;
  historial: ProductoHistorialDto[];
}

interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ProductosPageParams {
  page?: number;
  size?: number;
  search?: string;
}

export interface ActualizarCantidadRequest {
  cantidad: number;
  observacion?: string | null;
  codUsuarioModificacion?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class InventarioService {
  private http = inject(HttpClient);

  getProductos(params: ProductosPageParams = {}): Observable<PageResponse<ProductoDto>> {
    let httpParams = new HttpParams()
      .set('page', (params.page ?? 0).toString())
      .set('size', (params.size ?? 10).toString());

    const search = params.search?.trim();
    if (search) {
      httpParams = httpParams.set('search', search);
    }

    return this.http
      .get<ApiResponse<PageResponse<ProductoDto>>>(`${environment.apiUrl}/productos`, {
        params: httpParams,
      })
      .pipe(map((res) => res.data));
  }

  actualizarCantidad(
    secProducto: number,
    secLocal: number,
    payload: ActualizarCantidadRequest
  ): Observable<ProductoLocalDto> {
    return this.http
      .put<ApiResponse<ProductoLocalDto>>(
        `${environment.apiUrl}/productos/${secProducto}/locales/${secLocal}`,
        payload
      )
      .pipe(map((res) => res.data));
  }
}
