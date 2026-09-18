import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../auth/auth.service';
import { DashboardService, DashboardResumenDto } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  auth = inject(AuthService);

  resumen = signal<DashboardResumenDto | null>(null);
  loading = signal(true);
  error = signal('');

  maxSerieMensual = computed(() => {
    const r = this.resumen();
    if (!r) return 1;
    const valores = [
      ...(r.ventasUltimos6Meses ?? []).map((p) => +p.total || 0),
      ...(r.comprasUltimos6Meses ?? []).map((p) => +p.total || 0),
    ];
    return Math.max(1, ...valores);
  });

  maxSerieDiaria = computed(() => {
    const puntos = this.resumen()?.ventasUltimos7Dias ?? [];
    return Math.max(1, ...puntos.map((p) => +p.total || 0));
  });

  maxTopCliente = computed(() => {
    const top = this.resumen()?.topClientes ?? [];
    return Math.max(1, ...top.map((c) => +c.totalComprado || 0));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.dashboardService.getResumen().subscribe({
      next: (data) => {
        this.resumen.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el resumen del dashboard.');
        this.loading.set(false);
      },
    });
  }

  mesLabel(periodo: string): string {
    // "2026-09" -> "sep 26"
    const [anio, mes] = periodo.split('-');
    const nombres = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const idx = Math.min(12, Math.max(1, +mes)) - 1;
    return `${nombres[idx]} ${anio.slice(2)}`;
  }

  diaLabel(periodo: string): string {
    // "2026-09-17" -> "17/09"
    const partes = periodo.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}` : periodo;
  }

  barraPct(valor: number, max: number): number {
    if (!max || max <= 0) return 0;
    return Math.max(3, Math.round(((+valor || 0) / max) * 100));
  }

  crecimientoClass(valor: number | null | undefined): string {
    if (valor == null) return 'bg-secondary-subtle text-secondary';
    return valor >= 0
      ? 'bg-success-subtle text-success'
      : 'bg-danger-subtle text-danger';
  }

  crecimientoTexto(valor: number | null | undefined): string {
    if (valor == null) return 'sin datos';
    const signo = valor >= 0 ? '+' : '';
    return `${signo}${valor} % vs mes anterior`;
  }
}
