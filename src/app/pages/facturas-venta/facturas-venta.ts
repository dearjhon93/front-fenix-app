import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FacturaVentaDto, FacturaVentaListado, FacturaVentaPagoDto, FacturaVentaService } from './factura-venta.service';
import { ReporteService } from '../../reportes/reporte.service';

@Component({
  selector: 'app-facturas-venta',
  imports: [DecimalPipe],
  templateUrl: './facturas-venta.html',
  styleUrl: './facturas-venta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturasVentaComponent implements OnInit {
  private facturaVentaService = inject(FacturaVentaService);
  private reporteService = inject(ReporteService);
  private cdr = inject(ChangeDetectorRef);

  factura = signal<FacturaVentaDto | null>(null);
  error = signal('');
  saving = signal(false);
  responseMessage = signal<string | null>(null);
  responseSuccess = signal(false);
  private xmlOriginalText: string | null = null;

  historial = signal<FacturaVentaListado[]>([]);
  cargandoHistorial = signal(true);
  descargandoReporte = signal(false);
  filtroHistorial = signal('');
  expandedHistorial = signal<string | null>(null);

  historialFiltrado = computed(() => {
    const filtro = this.filtroHistorial().trim().toLowerCase();
    const lista = this.historial();
    if (!filtro) return lista;
    return lista.filter((h) =>
      `${h.establecimiento}-${h.puntoEmision}-${h.secuencial} ${h.cliente?.razonSocial ?? ''} ${h.cliente?.idCliente ?? ''} ${h.claveAcceso ?? ''}`
        .toLowerCase()
        .includes(filtro)
    );
  });

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.facturaVentaService.listarVentas().subscribe({
      next: (data) => {
        this.historial.set(data);
        this.cargandoHistorial.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.historial.set([]);
        this.cargandoHistorial.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  descargarReporte(): void {
    if (this.descargandoReporte()) return;
    this.descargandoReporte.set(true);
    this.reporteService.descargarFacturasVenta().subscribe({
      next: () => {
        this.descargandoReporte.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.descargandoReporte.set(false);
        this.cdr.markForCheck();
        alert('No se pudo descargar el reporte de facturas de venta.');
      },
    });
  }

  onFiltroHistorial(event: Event): void {
    this.filtroHistorial.set((event.target as HTMLInputElement).value);
  }

  toggleHistorial(clave: string): void {
    this.expandedHistorial.set(this.expandedHistorial() === clave ? null : clave);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const xmlText = e.target?.result as string;
      try {
        const parsed = this.parseFacturaVentaXml(xmlText);
        if (!parsed) {
          this.error.set('No se pudo leer la estructura de la factura de venta.');
          this.factura.set(null);
          this.xmlOriginalText = null;
        } else {
          this.error.set('');
          this.responseMessage.set(null);
          this.xmlOriginalText = xmlText;
          this.factura.set({ ...parsed, xmlOriginal: xmlText });
        }
      } catch (err) {
        console.error('Error al procesar el XML de venta:', err);
        this.error.set('No se pudo leer la estructura de la factura de venta.');
        this.factura.set(null);
        this.xmlOriginalText = null;
      }
      this.cdr.markForCheck();
    };

    reader.readAsText(file);
  }

  enviarAlBackend(): void {
    const payload = this.factura();
    if (!payload || !this.xmlOriginalText) {
      alert('Selecciona un archivo XML de factura de venta primero.');
      return;
    }

    this.saving.set(true);
    this.responseMessage.set(null);

    this.facturaVentaService.guardarFacturaVenta(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.responseSuccess.set(true);
        this.responseMessage.set('Factura de venta registrada correctamente.');
        this.cargarHistorial();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving.set(false);
        this.responseSuccess.set(false);
        console.error('Error en el servidor:', err);
        if (err?.status === 409) {
          this.responseMessage.set('La factura de venta ya fue ingresada en el sistema.');
        } else if (err?.error?.message) {
          this.responseMessage.set(err.error.message);
        } else {
          this.responseMessage.set('No se pudo guardar la factura de venta en el servidor.');
        }
        this.cdr.markForCheck();
      },
    });
  }

  cancelXml(): void {
    this.factura.set(null);
    this.xmlOriginalText = null;
    this.error.set('');
    this.responseMessage.set(null);
    this.responseSuccess.set(false);
    this.cdr.markForCheck();
  }

  totalImpuestos(detalle: { impuestos?: { impuesto: { valor: number }[] } }): number {
    return (detalle.impuestos?.impuesto ?? []).reduce((acc, imp) => acc + (+imp.valor || 0), 0);
  }

  // ---------- Parseo XML (DOMParser nativo, sin dependencias) ----------

  private parseFacturaVentaXml(xmlText: string): FacturaVentaDto | null {
    const comprobanteInner = this.extractComprobanteInnerXml(xmlText);
    const doc = this.parseXmlDoc(comprobanteInner ?? xmlText);
    if (!doc) return null;

    const infoTributariaEl = this.firstElement(doc, 'infoTributaria');
    const infoFacturaEl = this.firstElement(doc, 'infoFactura');
    if (!infoTributariaEl || !infoFacturaEl) return null;

    const claveAcceso = this.childText(infoTributariaEl, 'claveAcceso');
    if (!claveAcceso) return null;

    // Pagos: tolera <pagos><pago> y <formasDePago><formaPago>
    const pagoEls = this.childList(infoFacturaEl, 'pagos', 'pago');
    const formaPagoEls =
      pagoEls.length > 0 ? pagoEls : this.childList(infoFacturaEl, 'formasDePago', 'formaPago');

    const importeTotal = this.toNumber(this.childText(infoFacturaEl, 'importeTotal'));

    const pagos: FacturaVentaPagoDto[] = formaPagoEls.map((p) => ({
      formaPago: this.childText(p, 'formaPago'),
      total: this.toNumber(this.childText(p, 'total')),
      plazo: this.childText(p, 'plazo') ? this.toNumber(this.childText(p, 'plazo')) : undefined,
      unidadTiempo: this.childText(p, 'unidadTiempo') || undefined,
    }));

    if (pagos.length === 0) {
      pagos.push({ formaPago: '01', total: importeTotal, plazo: undefined, unidadTiempo: undefined });
    }

    // Detalles
    const detallesEl = this.firstElement(doc, 'detalles');
    const detalleEls = detallesEl ? this.directChildren(detallesEl, 'detalle') : [];
    const detalle = detalleEls.map((d) => {
      const impuestosEl = this.directChild(d, 'impuestos');
      const impuestoEls = impuestosEl ? this.directChildren(impuestosEl, 'impuesto') : [];
      const codigoPrincipal = this.childText(d, 'codigoPrincipal');
      return {
        codigoPrincipal,
        codigoAuxiliar: this.childText(d, 'codigoAuxiliar') || codigoPrincipal,
        descripcion: this.childText(d, 'descripcion'),
        cantidad: this.toNumber(this.childText(d, 'cantidad')),
        precioUnitario: this.toNumber(this.childText(d, 'precioUnitario')),
        descuento: this.toNumber(this.childText(d, 'descuento')),
        precioTotalSinImpuesto: this.toNumber(this.childText(d, 'precioTotalSinImpuesto')),
        impuestos:
          impuestoEls.length > 0
            ? {
                impuesto: impuestoEls.map((imp) => ({
                  codigo: this.childText(imp, 'codigo'),
                  codigoPorcentaje: this.childText(imp, 'codigoPorcentaje'),
                  tarifa: this.toNumber(this.childText(imp, 'tarifa')),
                  baseImponible: this.toNumber(this.childText(imp, 'baseImponible')),
                  valor: this.toNumber(this.childText(imp, 'valor')),
                })),
              }
            : undefined,
      };
    });

    if (detalle.length === 0) return null;

    // Info adicional (opcional)
    const infoAdicionalEl = this.firstElement(doc, 'infoAdicional');
    const campoEls = infoAdicionalEl ? this.directChildren(infoAdicionalEl, 'campoAdicional') : [];
    const campoAdicional = campoEls
      .map((c) => ({
        nombre: c.getAttribute('nombre') ?? '',
        valor: (c.textContent ?? '').trim(),
      }))
      .filter((c) => c.nombre && c.valor);

    return {
      infoTributaria: {
        ambiente: this.childText(infoTributariaEl, 'ambiente'),
        tipoEmision: this.childText(infoTributariaEl, 'tipoEmision') || '1',
        razonSocial: this.childText(infoTributariaEl, 'razonSocial'),
        nombreComercial: this.childText(infoTributariaEl, 'nombreComercial') || undefined,
        ruc: this.childText(infoTributariaEl, 'ruc'),
        claveAcceso,
        codDoc: this.childText(infoTributariaEl, 'codDoc') || '01',
        estab: this.childText(infoTributariaEl, 'estab'),
        ptoEmi: this.childText(infoTributariaEl, 'ptoEmi'),
        secuencial: this.childText(infoTributariaEl, 'secuencial'),
        dirMatriz: this.childText(infoTributariaEl, 'dirMatriz'),
      },
      infoFactura: {
        fechaEmision: this.childText(infoFacturaEl, 'fechaEmision'),
        dirEstablecimiento: this.childText(infoFacturaEl, 'dirEstablecimiento') || undefined,
        tipoIdentificacionComprador: this.childText(infoFacturaEl, 'tipoIdentificacionComprador'),
        identificacionComprador: this.childText(infoFacturaEl, 'identificacionComprador'),
        razonSocialComprador: this.childText(infoFacturaEl, 'razonSocialComprador'),
        direccionComprador: this.childText(infoFacturaEl, 'direccionComprador') || undefined,
        totalSinImpuestos: this.toNumber(this.childText(infoFacturaEl, 'totalSinImpuestos')),
        totalDescuento: this.toNumber(this.childText(infoFacturaEl, 'totalDescuento')),
        importeTotal,
        pagos: { pago: pagos },
      },
      detalles: { detalle },
      ...(campoAdicional.length > 0 ? { infoAdicional: { campoAdicional } } : {}),
    };
  }

  private parseXmlDoc(xmlText: string): Document | null {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return null;
    return doc;
  }

  /** Si el XML es una RespuestaAutorizacion, extrae el comprobante embebido (CDATA). */
  private extractComprobanteInnerXml(xmlText: string): string | null {
    const doc = this.parseXmlDoc(xmlText);
    if (!doc) return null;
    const comprobante =
      this.firstElement(doc, 'comprobante') ?? this.firstElement(doc, 'Comprobante');
    const inner = (comprobante?.textContent ?? '').trim();
    if (inner && inner.includes('<factura')) return inner;
    return null;
  }

  private firstElement(doc: Document, tag: string): Element | null {
    const all = doc.getElementsByTagName(tag);
    if (all.length > 0) return all[0] as unknown as Element;
    // Fallback por localName (namespaces tipo ns2:)
    const els = doc.getElementsByTagName('*');
    for (let i = 0; i < els.length; i++) {
      const el = els[i] as unknown as Element;
      if (el.localName === tag) return el;
    }
    return null;
  }

  private directChild(parent: Element, tag: string): Element | null {
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (child.tagName === tag || child.localName === tag) return child;
    }
    return null;
  }

  private directChildren(parent: Element, tag: string): Element[] {
    const out: Element[] = [];
    for (let i = 0; i < parent.children.length; i++) {
      const child = parent.children[i];
      if (child.tagName === tag || child.localName === tag) out.push(child);
    }
    return out;
  }

  private childText(parent: Element, tag: string): string {
    const direct = this.directChild(parent, tag);
    if (direct) return (direct.textContent ?? '').trim();
    // Fallback: primer descendiente con ese nombre (XML SRI es plano por seccion)
    const nested = parent.getElementsByTagName(tag);
    if (nested.length > 0) return ((nested[0] as unknown as Element).textContent ?? '').trim();
    return '';
  }

  private childList(parent: Element, containerTag: string, itemTag: string): Element[] {
    const container = this.directChild(parent, containerTag);
    if (!container) return [];
    return this.directChildren(container, itemTag);
  }

  private toNumber(value: string): number {
    const n = parseFloat(value);
    return isNaN(n) ? 0 : n;
  }
}
