import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { LayoutComponent } from './layout/layout';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { InventarioComponent } from './pages/inventario/inventario';
import { FacturasComponent } from './pages/facturas/facturas';
import { AuthGuard, RoleGuard } from './auth/auth.guard';
import { ROLES } from './auth/auth.service';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'inventario',
        component: InventarioComponent,
        canActivate: [RoleGuard],
        data: { roles: [ROLES.ADMIN, ROLES.USUARIO] },
      },
      {
        path: 'facturas',
        component: FacturasComponent,
        canActivate: [RoleGuard],
        data: { roles: [ROLES.ADMIN, ROLES.USUARIO] },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
