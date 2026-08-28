import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FacturaDetalleDto {
  codigoPrincipal: string;
  codigoAuxiliar?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  precioTotalSinImpuesto: number;
  impuestos?: { impuesto: ImpuestoDetalleDto[] };
  precioVentaPvp: number;
}

export interface ImpuestoDetalleDto {
  codigo: number;
  codigoPorcentaje: number;
  tarifa: number;
  baseImponible: number;
  valor: number;
}

export interface PagoDto {
  formaPago: string;
  total: number;
  plazo?: number;
  unidadTiempo?: string;
}

export interface InfoTributariaDto {
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

export interface InfoFacturaDto {
  fechaEmision: string;
  dirEstablecimiento?: string;
  tipoIdentificacionComprador: string;
  identificacionComprador: string;
  razonSocialComprador: string;
  direccionComprador?: string;
  totalSinImpuestos: number;
  totalDescuento: number;
  importeTotal: number;
  pagos: { pago: PagoDto[] };
}

export interface FacturaDto {
  codigoLocal: string;
  infoTributaria: InfoTributariaDto;
  infoFactura: InfoFacturaDto;
  detalles: { detalle: FacturaDetalleDto[] };
}

@Injectable({
  providedIn: 'root',
})
export class FacturaService {
  private http = inject(HttpClient);

  parseXml(xmlText: string): FacturaDto | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      const parserError = doc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        return null;
      }

      const ns = this.getNamespace(doc);

      const getLocalName = (tag: string): string => {
        const el = doc.getElementsByTagNameNS(ns, tag)[0];
        return el?.textContent || doc.getElementsByTagName(tag)[0]?.textContent || '';
      };

      const getLocales = (tag: string, childTag: string, nsOnly = false): string[] => {
        const parent = ns && !nsOnly
          ? doc.getElementsByTagNameNS(ns, tag)[0]
          : doc.getElementsByTagName(tag)[0];
        if (!parent) return [];
        const children = ns && !nsOnly
          ? parent.getElementsByTagNameNS(ns, childTag)
          : parent.getElementsByTagName(childTag);
        return Array.from(children).map((c) => c.textContent || '');
      };

      const factura: FacturaDto = {
        codigoLocal: '1',
        infoTributaria: {
          ambiente: getLocalName('ambiente'),
          tipoEmision: getLocalName('tipoEmision') || '1',
          razonSocial: getLocalName('razonSocial'),
          nombreComercial: getLocalName('nombreComercial') || undefined,
          ruc: getLocalName('ruc'),
          claveAcceso: getLocalName('claveAcceso'),
          codDoc: getLocalName('codDoc') || '01',
          estab: getLocalName('estab'),
          ptoEmi: getLocalName('ptoEmi'),
          secuencial: getLocalName('secuencial'),
          dirMatriz: getLocalName('dirMatriz'),
        },
        infoFactura: {
          fechaEmision: getLocalName('fechaEmision'),
          dirEstablecimiento: getLocalName('dirEstablecimiento') || undefined,
          tipoIdentificacionComprador: getLocalName('tipoIdentificacionComprador'),
          identificacionComprador: getLocalName('identificacionComprador'),
          razonSocialComprador: getLocalName('razonSocialComprador'),
          direccionComprador: getLocalName('direccionComprador') || undefined,
          totalSinImpuestos: parseFloat(getLocalName('totalSinImpuestos')) || 0,
          totalDescuento: parseFloat(getLocalName('totalDescuento')) || 0,
          importeTotal: parseFloat(getLocalName('importeTotal')) || 0,
          pagos: { pago: [] },
        },
        detalles: { detalle: [] },
      };

      /* Parse pagos (formasDePago > formaPago) */
      const pagosParent =
        (ns && doc.getElementsByTagNameNS(ns, 'formasDePago')[0]) ||
        doc.getElementsByTagName('formasDePago')[0];

      if (pagosParent) {
        const formaPagoNodes =
          (ns && pagosParent.getElementsByTagNameNS(ns, 'formaPago')) ||
          pagosParent.getElementsByTagName('formaPago');
        for (let i = 0; i < formaPagoNodes.length; i++) {
          const fp = formaPagoNodes[i];
          const childGet = (tag: string): string =>
            fp.getElementsByTagNameNS(ns, tag)[0]?.textContent ||
            fp.getElementsByTagName(tag)[0]?.textContent || '';
          factura.infoFactura.pagos.pago.push({
            formaPago: childGet('formaPago') || childGet('formaPago'),
            total: parseFloat(childGet('total')) || 0,
            plazo: childGet('plazo') ? parseFloat(childGet('plazo')) : undefined,
            unidadTiempo: childGet('unidadTiempo') || undefined,
          });
        }
      }

      /* Si no hay formasDePago, inferir del importeTotal */
      if (factura.infoFactura.pagos.pago.length === 0) {
        factura.infoFactura.pagos.pago.push({
          formaPago: '01',
          total: factura.infoFactura.importeTotal,
        });
      }

      /* Parse detalles */
      const detallesParent =
        (ns && doc.getElementsByTagNameNS(ns, 'detalles')[0]) ||
        doc.getElementsByTagName('detalles')[0];

      if (detallesParent) {
        const detalleNodes =
          (ns && detallesParent.getElementsByTagNameNS(ns, 'detalle')) ||
          detallesParent.getElementsByTagName('detalle');
        for (let i = 0; i < detalleNodes.length; i++) {
          const d = detalleNodes[i];
          const childGet = (tag: string): string =>
            d.getElementsByTagNameNS(ns, tag)[0]?.textContent ||
            d.getElementsByTagName(tag)[0]?.textContent || '';

          const impuestos: ImpuestoDetalleDto[] = [];
          const impParent =
            (ns && d.getElementsByTagNameNS(ns, 'impuestos')[0]) ||
            d.getElementsByTagName('impuestos')[0];
          if (impParent) {
            const impNodes =
              (ns && impParent.getElementsByTagNameNS(ns, 'impuesto')) ||
              impParent.getElementsByTagName('impuesto');
            for (let j = 0; j < impNodes.length; j++) {
              const imp = impNodes[j];
              const impChild = (tag: string): string =>
                imp.getElementsByTagNameNS(ns, tag)[0]?.textContent ||
                imp.getElementsByTagName(tag)[0]?.textContent || '';
              impuestos.push({
                codigo: parseInt(impChild('codigo')) || 2,
                codigoPorcentaje: parseInt(impChild('codigoPorcentaje')) || 4,
                tarifa: parseFloat(impChild('tarifa')) || 0,
                baseImponible: parseFloat(impChild('baseImponible')) || 0,
                valor: parseFloat(impChild('valor')) || 0,
              });
            }
          }

          factura.detalles.detalle.push({
            codigoPrincipal: childGet('codigoPrincipal'),
            codigoAuxiliar: childGet('codigoAuxiliar') || childGet('codigoPrincipal'),
            descripcion: childGet('descripcion'),
            cantidad: parseFloat(childGet('cantidad')) || 0,
            precioUnitario: parseFloat(childGet('precioUnitario')) || 0,
            descuento: parseFloat(childGet('descuento')) || 0,
            precioTotalSinImpuesto: parseFloat(childGet('precioTotalSinImpuesto')) || 0,
            impuestos: impuestos.length > 0 ? { impuesto: impuestos } : undefined,
            precioVentaPvp: parseFloat(childGet('precioUnitario')) || 0,
          });
        }
      }

      return factura;
    } catch {
      return null;
    }
  }

  private getNamespace(doc: Document): string | null {
    const ns = doc.documentElement.getAttribute('xmlns');
    return ns || null;
  }

  guardarFactura(factura: FacturaDto): Observable<any> {
    return this.http.post(`${environment.apiUrl}/facturas/guardar`, factura);
  }
}
