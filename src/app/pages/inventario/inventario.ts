import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { InventarioService, ProductoDto } from './inventario.service';

@Component({
  selector: 'app-inventario',
  imports: [DatePipe, DecimalPipe],
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
                  <th class="text-uppercase small fw-semibold text-secondary" style="width: 2rem;"></th>
                  <th class="text-uppercase small fw-semibold text-secondary">Sec.</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Codigo</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Producto</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Precio Venta</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Estado</th>
                  <th class="text-uppercase small fw-semibold text-secondary">Locales / Stock</th>
                </tr>
              </thead>
              <tbody>
                @for (p of productos(); track p.secProducto) {
                  <tr
                    (click)="toggleExpand(p.secProducto)"
                    (keydown.enter)="toggleExpand(p.secProducto)"
                    tabindex="0"
                    style="cursor: pointer;"
                    [class.table-active]="isExpanded(p.secProducto)"
                    title="Clic para ver el historial"
                  >
                    <td class="text-secondary">{{ isExpanded(p.secProducto) ? '▾' : '▸' }}</td>
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
                  @if (isExpanded(p.secProducto)) {
                    <tr class="table-active">
                      <td></td>
                      <td colspan="6" class="py-2">
                        <div class="small fw-semibold text-secondary text-uppercase mb-2">
                          Historial · {{ p.descripcion }}
                        </div>
                        @if (p.historial && p.historial.length) {
                          <div class="table-responsive">
                            <table class="table table-sm table-bordered bg-white align-middle mb-0">
                              <thead class="table-light">
                                <tr>
                                  <th class="small">Local</th>
                                  <th class="small">Cantidad</th>
                                  <th class="small">Fecha Inicio</th>
                                  <th class="small">Fecha Fin</th>
                                  <th class="small">Fecha Modificación</th>
                                  <th class="small">Factura</th>
                                </tr>
                              </thead>
                              <tbody>
                                @for (h of p.historial; track $index) {
                                  <tr>
                                    <td class="small">{{ h.desLocal }}</td>
                                    <td class="small">{{ h.cantidad }} uds.</td>
                                    <td class="small">
                                      {{ h.fechaInicio ? (h.fechaInicio | date: 'dd/MM/yyyy HH:mm') : '—' }}
                                    </td>
                                    <td class="small">
                                      {{ h.fechaFin ? (h.fechaFin | date: 'dd/MM/yyyy HH:mm') : '—' }}
                                    </td>
                                    <td class="small">
                                      {{ h.fechaModificacion ? (h.fechaModificacion | date: 'dd/MM/yyyy HH:mm') : '—' }}
                                    </td>
                                    <td class="small">
                                      {{ h.idFactura ?? '—' }}
                                    </td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                          </div>
                        } @else {
                          <div class="small text-secondary">Sin movimientos registrados</div>
                        }
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          @if (productos().length === 0) {
            <div class="text-center text-secondary py-4">No hay productos registrados</div>
          }

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-top">
            <div class="d-flex align-items-center gap-2 small text-secondary">
              <label for="pageSize" class="m-0">Por página:</label>
              <select
                id="pageSize"
                class="form-select form-select-sm w-auto"
                [value]="size()"
                (change)="onSizeChange($event)"
              >
                @for (s of pageSizes; track s) {
                  <option [value]="s">{{ s }}</option>
                }
              </select>
              <span>
                {{ totalElements() }} resultado(s) · Página {{ page() + 1 }} de {{ totalPages() || 1 }}
              </span>
            </div>

            <nav aria-label="Paginación de productos">
              <ul class="pagination pagination-sm m-0">
                <li class="page-item" [class.disabled]="first() || loading()">
                  <button class="page-link" (click)="prevPage()" [disabled]="first() || loading()">
                    Anterior
                  </button>
                </li>
                @for (p of pagesToShow(); track p) {
                  <li class="page-item" [class.active]="p === page()">
                    <button class="page-link" (click)="goToPage(p)" [disabled]="loading()">
                      {{ p + 1 }}
                    </button>
                  </li>
                }
                <li class="page-item" [class.disabled]="last() || loading()">
                  <button class="page-link" (click)="nextPage()" [disabled]="last() || loading()">
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      }
    </div>
  `,
})
export class InventarioComponent implements OnInit, OnDestroy {
  private inventarioService = inject(InventarioService);
  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  productos = signal<ProductoDto[]>([]);
  searchTerm = signal('');
  loading = signal(true);
  expandedId = signal<number | null>(null);

  // Paginación server-side (page 0-indexed, igual que el backend)
  page = signal(0);
  size = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);
  first = signal(true);
  last = signal(true);

  readonly pageSizes = [5, 10, 20, 50];

  pagesToShow = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 0) return [] as number[];
    const start = Math.max(0, Math.min(current - 2, total - 5));
    const end = Math.min(total, start + 5);
    const pages: number[] = [];
    for (let i = start; i < end; i++) pages.push(i);
    return pages;
  });

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.page.set(0);
        this.loadProductos(term);
      });

    this.loadProductos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.search$.next(value);
  }

  toggleExpand(secProducto: number): void {
    this.expandedId.set(this.expandedId() === secProducto ? null : secProducto);
  }

  isExpanded(secProducto: number): boolean {
    return this.expandedId() === secProducto;
  }

  onSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!Number.isNaN(value) && value !== this.size()) {
      this.size.set(value);
      this.page.set(0);
      this.loadProductos();
    }
  }

  goToPage(page: number): void {
    if (page === this.page() || page < 0 || page >= this.totalPages()) return;
    this.page.set(page);
    this.loadProductos();
  }

  nextPage(): void {
    if (!this.last()) this.goToPage(this.page() + 1);
  }

  prevPage(): void {
    if (!this.first()) this.goToPage(this.page() - 1);
  }

  private loadProductos(search?: string): void {
    this.loading.set(true);
    this.expandedId.set(null);
    const term = search ?? this.searchTerm();
    this.inventarioService
      .getProductos({ page: this.page(), size: this.size(), search: term })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.productos.set(res.content ?? []);
          this.page.set(res.page);
          this.size.set(res.size);
          this.totalElements.set(res.totalElements);
          this.totalPages.set(res.totalPages);
          this.first.set(res.first);
          this.last.set(res.last);
          this.loading.set(false);
        },
        error: () => {
          this.productos.set([]);
          this.loading.set(false);
        },
      });
  }
}
