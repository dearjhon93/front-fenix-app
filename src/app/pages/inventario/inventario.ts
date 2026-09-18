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
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { InventarioService, ProductoDto } from './inventario.service';

export type FiltroEstado = 'TODOS' | 'ACT' | 'INA';
export type FiltroStock = 'TODOS' | 'CON_STOCK' | 'SIN_STOCK' | 'BAJO';

@Component({
  selector: 'app-inventario',
  imports: [DatePipe, DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss',
})
export class InventarioComponent implements OnInit, OnDestroy {
  private inventarioService = inject(InventarioService);
  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  productos = signal<ProductoDto[]>([]);
  searchTerm = signal('');
  loading = signal(true);
  expandedId = signal<number | null>(null);

  filtroEstado = signal<FiltroEstado>('TODOS');
  filtroStock = signal<FiltroStock>('TODOS');

  // Paginación server-side (page 0-indexed, igual que el backend)
  page = signal(0);
  size = signal(10);
  totalElements = signal(0);
  totalPages = signal(0);
  first = signal(true);
  last = signal(true);

  readonly pageSizes = [5, 10, 20, 50];
  readonly UMBRAL_BAJO = 5;

  productosFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const stock = this.filtroStock();
    return this.productos().filter((p) => {
      if (estado !== 'TODOS' && p.codEstado !== estado) return false;
      const total = this.stockTotal(p);
      if (stock === 'CON_STOCK' && total <= 0) return false;
      if (stock === 'SIN_STOCK' && total > 0) return false;
      if (stock === 'BAJO' && (total <= 0 || total > this.UMBRAL_BAJO)) return false;
      return true;
    });
  });

  resumenPagina = computed(() => {
    const lista = this.productos();
    let stockTotal = 0;
    let sinStock = 0;
    let bajo = 0;
    for (const p of lista) {
      const total = this.stockTotal(p);
      stockTotal += total;
      if (total <= 0) sinStock++;
      else if (total <= this.UMBRAL_BAJO) bajo++;
    }
    return { stockTotal, sinStock, bajo, total: lista.length };
  });

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

  clearSearch(): void {
    if (!this.searchTerm()) return;
    this.searchTerm.set('');
    this.search$.next('');
  }

  reload(): void {
    this.loadProductos();
  }

  toggleExpand(secProducto: number): void {
    this.expandedId.set(this.expandedId() === secProducto ? null : secProducto);
  }

  isExpanded(secProducto: number): boolean {
    return this.expandedId() === secProducto;
  }

  stockTotal(p: ProductoDto): number {
    return (p.locales ?? []).reduce((acc, l) => acc + (+l.cantidad || 0), 0);
  }

  stockClass(total: number): string {
    if (total <= 0) return 'bg-danger';
    if (total <= this.UMBRAL_BAJO) return 'bg-warning text-dark';
    return 'bg-success';
  }

  stockTexto(total: number): string {
    if (total <= 0) return 'Sin stock';
    if (total <= this.UMBRAL_BAJO) return `${total} uds · bajo`;
    return `${total} uds`;
  }

  fechaHistorial(h: { fechaModificacion?: string | null; fechaInicio?: string | null }): string | null {
    const mod = (h.fechaModificacion ?? '').trim();
    if (mod && mod !== '--') return h.fechaModificacion as string;
    const ini = (h.fechaInicio ?? '').trim();
    if (ini && ini !== '--') return h.fechaInicio as string;
    return null;
  }

  facturaHistorial(h: {
    numeroFactura?: string | number | null;
    numFactura?: string | number | null;
    nroFactura?: string | number | null;
    numero?: string | number | null;
    idFactura?: string | number | null;
  }): string {
    const raw =
      (h.numeroFactura ?? h.numFactura ?? h.nroFactura ?? h.numero ?? h.idFactura ?? '') as string | number;
    const val = String(raw ?? '').trim();
    return val && val !== '--' ? val : '—';
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
