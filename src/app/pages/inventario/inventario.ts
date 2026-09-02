import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { InventarioService, ProductoDto } from './inventario.service';

@Component({
  selector: 'app-inventario',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column gap-4">
      <h4 class="fw-semibold text-dark m-0">Inventario</h4>

      <div class="mb-2">
        <input
          type="text"
          placeholder="Buscar producto..."
          [value]="searchTerm()"
          (input)="onSearch($event)"
          class="form-control"
        />
      </div>

      @if (loading()) {
        <div class="d-flex justify-content-center align-items-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Cargando...</span>
          </div>
        </div>
      } @else {
        <div class="card border shadow-sm">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th class="text-uppercase small fw-semibold text-secondary">Sec.</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Codigo</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Producto</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Precio Venta</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Estado</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Locales / Stock</th>
                </tr>
              </thead>
              <tbody>
                @for (p of filtered(); track p.secProducto) {
                  <tr>
                    <td>{{ p.secProducto }}</td>
                    <td>{{ p.codProductoProveedor }}</td>
                    <td>{{ p.descripcion }}</td>
                    <td>$ {{ p.precioVenta | number: '1.2-2' }}</td>
                    <td>
                      <span
                        class="badge"
                        [class]="p.codEstado === 'ACT' ? 'bg-success' : 'bg-danger'"
                      >{{ p.codEstado }}</span>
                    </td>
                    <td>
                      @for (l of p.locales; track l.secLocal) {
                        <div class="d-flex justify-content-between small">
                          <span class="fw-medium text-dark">{{ l.desLocal }}</span>
                          <span class="text-secondary">{{ l.cantidad }} uds.</span>
                        </div>
                      }
                      @if (!p.locales || !p.locales.length) {
                        <span class="small text-secondary">Sin stock</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (filtered().length === 0) {
            <div class="text-center text-secondary py-4">No hay productos registrados</div>
          }
        </div>
      }
    </div>
  `,
})
export class InventarioComponent implements OnInit {
  private inventarioService = inject(InventarioService);

  private allProductos = signal<ProductoDto[]>([]);
  searchTerm = signal('');
  loading = signal(true);

  filtered = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.allProductos();
    return this.allProductos().filter(
      (p) =>
        p.descripcion.toLowerCase().includes(term) ||
        p.codProductoProveedor.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.inventarioService.getProductos().subscribe({
      next: (data) => {
        this.allProductos.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }
}
