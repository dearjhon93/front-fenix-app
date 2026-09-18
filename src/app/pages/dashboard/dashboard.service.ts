import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SeriePuntoDto {
  periodo: string;
  total: number;
}

export interface UltimaVentaDto {
  claveAcceso: string;
  numero: string;
  fechaEmision: string;
  cliente: string;
  importeTotal: number;
}

export interface TopClienteDto {
  idCliente: string;
  razonSocial: string;
  totalComprado: number;
  cantidadFacturas: number;
}

export interface ProductoStockBajoDto {
  secProducto: number;
  descripcion: string;
  cantidad: number | null;
  secLocal: number | null;
}

export interface DashboardResumenDto {
  totalProductos: number;
  totalProveedores: number;
  totalLocales: number;
  totalUsuarios: number;
  totalFacturas: number;
  /** Legado: equivale al total de COMPRAS. Se mantiene por compatibilidad. */
  ventasTotales: number;

  cantidadFacturasVenta: number;
  totalVentas: number;
  ventasDelMes: number;
  ticketPromedioVenta: number;
  ventasUltimos6Meses: SeriePuntoDto[] | null | undefined;

  totalCompras: number;
  comprasDelMes: number;

  totalClientes: number;
  productosInactivos: number;
  stockBajo: number;

  // ---- Campos v2 (presentes desde la API mejorada) ----
  cantidadFacturasCompra: number;
  cantidadVentasMes: number;
  cantidadComprasMes: number;
  ventasHoy: number;
  comprasHoy: number;
  ventasMesAnterior: number;
  comprasMesAnterior: number;
  crecimientoVentasPct: number;
  crecimientoComprasPct: number;
  balanceMes: number;
  ticketPromedioCompra: number;
  comprasUltimos6Meses: SeriePuntoDto[] | null | undefined;
  ventasUltimos7Dias: SeriePuntoDto[] | null | undefined;
  ultimasVentas: UltimaVentaDto[] | null | undefined;
  topClientes: TopClienteDto[] | null | undefined;
  stockBajoDetalle: ProductoStockBajoDto[] | null | undefined;
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
