import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface FacturaVentaImpuestoDto {
  codigo: string;
  codigoPorcentaje: string;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

export interface FacturaVentaDetalleDto {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  precioTotalSinImpuesto: number;
  impuestos?: { impuesto: FacturaVentaImpuestoDto[] };
}

export interface FacturaVentaPagoDto {
  formaPago: string;
  total: number;
  plazo?: number;
  unidadTiempo?: string;
}

export interface FacturaVentaInfoTributariaDto {
  ambiente: string;
  tipoEmision: string;
  razonSocial: string;
  nombreComercial?: string;
  ruc: string;
  claveAcceso: string;
  codDoc: string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  dirMatriz: string;
}

export interface FacturaVentaInfoFacturaDto {
  fechaEmision: string;
  dirEstablecimiento?: string;
  tipoIdentificacionComprador: string;
  identificacionComprador: string;
  razonSocialComprador: string;
  direccionComprador?: string;
  totalSinImpuestos: number;
  totalDescuento: number;
  importeTotal: number;
  pagos: { pago: FacturaVentaPagoDto[] };
}

export interface FacturaVentaCampoAdicionalDto {
  nombre: string;
  valor: string;
}

export interface FacturaVentaDto {
  infoTributaria: FacturaVentaInfoTributariaDto;
  infoFactura: FacturaVentaInfoFacturaDto;
  detalles: { detalle: FacturaVentaDetalleDto[] };
  infoAdicional?: { campoAdicional: FacturaVentaCampoAdicionalDto[] };
  xmlOriginal?: string;
}

export interface FacturaVentaClienteListado {
  idCliente: string;
  tipoIdentificacion: string;
  razonSocial: string;
  direccion?: string;
}

export interface FacturaVentaDetalleListado {
  idDetalle: number;
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  precioTotalSinImpuesto: number;
}

export interface FacturaVentaListado {
  claveAcceso: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  fechaEmision: string;
  totalSinImpuestos: number;
  totalDescuento: number;
  importeTotal: number;
  cliente: FacturaVentaClienteListado | null;
  detalles: FacturaVentaDetalleListado[] | null | undefined;
  pagos: { formaPago: string; total: number }[];
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
export class FacturaVentaService {
  private http = inject(HttpClient);

  guardarFacturaVenta(factura: FacturaVentaDto): Observable<any> {
    return this.http.post(`${environment.apiUrl}/factura-venta/guardar`, factura);
  }

  listarVentas(): Observable<FacturaVentaListado[]> {
    return this.http
      .get<ApiResponse<FacturaVentaListado[]>>(`${environment.apiUrl}/factura-venta/listar`)
      .pipe(map((res) => res.data ?? []));
  }
}
