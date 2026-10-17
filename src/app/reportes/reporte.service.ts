import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReporteService {
  private http = inject(HttpClient);

  descargarProductos(): Observable<void> {
    return this.descargar('productos', 'reporte_productos.xlsx');
  }

  descargarFacturasCompra(): Observable<void> {
    return this.descargar('facturas-compra', 'reporte_facturas_compra.xlsx');
  }

  descargarFacturasVenta(): Observable<void> {
    return this.descargar('facturas-venta', 'reporte_facturas_venta.xlsx');
  }

  private descargar(ruta: string, nombreFallback: string): Observable<void> {
    return this.http
      .get(`${environment.apiUrl}/reportes/${ruta}/excel`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(
        map((res: HttpResponse<Blob>) => {
          if (!res.body) return;
          const nombre = this.nombreArchivo(
            res.headers.get('Content-Disposition'),
            nombreFallback
          );
          this.guardarArchivo(res.body, nombre);
        })
      );
  }

  private nombreArchivo(disposition: string | null, fallback: string): string {
    if (!disposition) return fallback;
    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (utf8?.[1]) {
      try {
        return decodeURIComponent(utf8[1]);
      } catch {
        return fallback;
      }
    }
    const simple = /filename="?([^";]+)"?/i.exec(disposition);
    return simple?.[1] ?? fallback;
  }

  private guardarArchivo(blob: Blob, nombre: string): void {
    if (typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombre;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
