import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { FacturaService } from './factura.service';
import { XMLParser } from 'fast-xml-parser';

@Component({
  selector: 'app-facturas',
  imports: [ReactiveFormsModule, FormsModule, DecimalPipe],
  templateUrl: './facturas.html',
  styleUrl: './facturas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturasComponent {
  private fb = inject(FormBuilder);
  private facturaService = inject(FacturaService);
  private cdr = inject(ChangeDetectorRef);

  facturaForm = this.fb.group({
    productos: this.fb.array([]),
  });

  datosFacturaClean = signal<any>(null);
  error = signal('');
  saving = signal(false);
  responseMessage = signal<string | null>(null);
  responseSuccess = signal(false);
  xmlOriginal: File | null = null;
  codigoLocalSeleccionado = '';

  get productos(): FormArray {
    return this.facturaForm.get('productos') as FormArray;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.xmlOriginal = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const xmlText = e.target?.result as string;

      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        parseTagValue: false
      });

      try {
        const primerJson = parser.parse(xmlText);
        console.log('Primer parseo (Estructura de Autorizacion):', primerJson);

        //const autorizacion = primerJson.autorizacion || primerJson.Autorizacion
        const autorizacion = 
          primerJson['ns2:RespuestaAutorizacion'] || 
          primerJson['RespuestaAutorizacion'] ||
          primerJson['autorizacion'] || 
          primerJson['Autorizacion'];
        ;
        let comprobanteXmlString = autorizacion?.comprobante || autorizacion?.Comprobante;

        if (!comprobanteXmlString) {
          comprobanteXmlString = xmlText;
        }

        const facturaJsonFinal = parser.parse(comprobanteXmlString);
        console.log('Segundo parseo (Datos reales de la Factura):', facturaJsonFinal);

        this.datosFacturaClean.set(facturaJsonFinal.factura || facturaJsonFinal);

        this.productos.clear();

        const detallesLista = this.asArray(this.datosFacturaClean()?.detalles?.detalle);

        detallesLista.forEach((detalle: any) => {
          const grupo = this.fb.group({
            cantidad: [detalle.cantidad ?? null, [Validators.required, Validators.min(1)]],
            porcentaje: [0, Validators.required],
            pvp: [null as number | null, [Validators.required, Validators.min(0.01)]],
          });

          this.productos.push(grupo);
        });

        console.log('Estructura completa:', this.datosFacturaClean());
        console.log('Detalles encontrados:', this.datosFacturaClean()?.detalles);
        this.cdr.markForCheck();

      } catch (error) {
        console.error('Error al procesar el XML autorizado:', error);
        alert('No se pudo leer la estructura de la factura autorizada.');
        this.datosFacturaClean.set(null);
      }
    };

    reader.readAsText(this.xmlOriginal);
  }

  enviarAlBackend() {

    this.verificarCampos();

    if (this.facturaForm.invalid || !this.xmlOriginal) return;

    if (!this.codigoLocalSeleccionado) {
      alert('Por favor, selecciona un local de destino antes de guardar.');
      return;
    }

    const facturaCompleta = { ...this.datosFacturaClean() };

    facturaCompleta.codigoLocal = this.codigoLocalSeleccionado;

    const detallesModificados = this.asArray(facturaCompleta.detalles?.detalle);
    const listaProductos = (this.facturaForm.value.productos ?? []) as { cantidad: number; porcentaje: number; pvp: number }[];

    detallesModificados.forEach((detalle: any, index: number) => {
      const producto = listaProductos[index];
      detalle.cantidadModificada = producto?.cantidad;
      detalle.porcentajeLocal = producto?.porcentaje;
      detalle.precioVentaPvp = producto?.pvp;
    });

    if (facturaCompleta.detalles) {
      facturaCompleta.detalles.detalle = detallesModificados;
    }

    const pagos = facturaCompleta.infoFactura?.pagos;
    if (pagos?.pago) {
      pagos.pago = this.asArray(pagos.pago);
    }

    detallesModificados.forEach((detalle: any) => {
      const impuestos = detalle?.impuestos;
      if (impuestos?.impuesto) {
        impuestos.impuesto = this.asArray(impuestos.impuesto);
      }
    });

    console.log(facturaCompleta);
    console.log(">>>>> OK SEND");

    this.facturaService.guardarFactura(facturaCompleta).subscribe({
      next: () => {
        alert('Factura completa guardada con exito en el sistema.');
        this.facturaForm.reset();
        this.productos.clear();
        this.datosFacturaClean.set(null);
        this.codigoLocalSeleccionado = '';
        this.xmlOriginal = null;
      },
      error: (err) => {
        console.error('Error en el servidor:', err);
        if (err?.status === 409) {
          alert('Esta factura ya fue subida anteriormente.');
        } else {
          alert('No se pudo guardar la transaccion en el servidor.');
        }
      }
    });
  }

  asArray(detalle: any): any[] {
    if (!detalle) return [];
    return Array.isArray(detalle) ? detalle : [detalle];
  }

  getCostoUnitario(detalle: any, cantidad?: number): number {
    const subtotal = +detalle.precioTotalSinImpuesto || 0;
    const tarifa = +detalle?.impuestos?.impuesto?.tarifa || 0;
    const cant = +(cantidad ?? detalle.cantidad) || 1;
    const totalConIva = subtotal + (subtotal * tarifa) / 100;
    return totalConIva / cant;
  }

  getPrecioLocal(detalle: any, index: number): number {
    const cantidad = this.productos.at(index)?.get('cantidad')?.value ?? 0;
    const costo = this.getCostoUnitario(detalle, cantidad);
    const porcentaje = this.productos.at(index)?.get('porcentaje')?.value ?? 0;
    return (costo * (porcentaje / 100)) + costo;
  }

  cancelXml(): void {
    this.facturaForm.reset();
    this.productos.clear();
    this.datosFacturaClean.set(null);
    this.codigoLocalSeleccionado = '';
    this.xmlOriginal = null;
    this.error.set('');
    this.responseMessage.set(null);
    this.cdr.markForCheck();
  }

  verificarCampos() {
  // Recorre cada campo dentro del FormGroup
  Object.keys(this.facturaForm.controls).forEach(campo => {
    const control = this.facturaForm.get(campo);
    
    if (control?.invalid) {
      console.log(`El campo '${campo}' NO es válido. Errores:`, control.errors);
    } else {
      console.log(`El campo '${campo}' es válido.`);
    }
  });
}
}
