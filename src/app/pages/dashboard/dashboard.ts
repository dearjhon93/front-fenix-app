import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { DashboardService, DashboardResumenDto } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column gap-4">
      <h4 class="fw-semibold text-dark m-0">Dashboard</h4>

      <p class="text-secondary">
        Bienvenido, {{ auth.currentUser()?.name }}
      </p>

      @if (loading()) {
        <div class="row g-3">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="col-sm-6 col-lg-4">
              <div class="card border-0 shadow-sm">
                <div class="card-body">
                  <div class="placeholder-glow">
                    <span class="placeholder col-6"></span>
                    <span class="placeholder col-4"></span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="row g-3">
          <div class="col-sm-6 col-lg-4">
            <div class="card border shadow-sm h-100">
              <div class="card-body d-flex flex-column gap-1">
                <span class="text-uppercase small fw-medium text-secondary">Productos</span>
                <span class="fs-2 fw-bold text-dark">{{ resumen()?.totalProductos }}</span>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-lg-4">
            <div class="card border shadow-sm h-100">
              <div class="card-body d-flex flex-column gap-1">
                <span class="text-uppercase small fw-medium text-secondary">Proveedores</span>
                <span class="fs-2 fw-bold text-dark">{{ resumen()?.totalProveedores }}</span>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-lg-4">
            <div class="card border shadow-sm h-100">
              <div class="card-body d-flex flex-column gap-1">
                <span class="text-uppercase small fw-medium text-secondary">Facturas</span>
                <span class="fs-2 fw-bold text-dark">{{ resumen()?.totalFacturas }}</span>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-lg-4">
            <div class="card border shadow-sm h-100">
              <div class="card-body d-flex flex-column gap-1">
                <span class="text-uppercase small fw-medium text-secondary">Ventas Totales</span>
                <span class="fs-2 fw-bold text-dark">\${{ resumen()?.ventasTotales }}</span>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-lg-4">
            <div class="card border shadow-sm h-100">
              <div class="card-body d-flex flex-column gap-1">
                <span class="text-uppercase small fw-medium text-secondary">Usuarios</span>
                <span class="fs-2 fw-bold text-dark">{{ resumen()?.totalUsuarios }}</span>
              </div>
            </div>
          </div>
          <div class="col-sm-6 col-lg-4">
            <div class="card border shadow-sm h-100">
              <div class="card-body d-flex flex-column gap-1">
                <span class="text-uppercase small fw-medium text-secondary">Locales</span>
                <span class="fs-2 fw-bold text-dark">{{ resumen()?.totalLocales }}</span>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  auth = inject(AuthService);

  resumen = signal<DashboardResumenDto | null>(null);
  loading = signal(true);

  ngOnInit(): void {
    this.dashboardService.getResumen().subscribe({
      next: (data) => {
        this.resumen.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
