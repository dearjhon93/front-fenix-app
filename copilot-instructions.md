# Copilot Instructions - SGA Fenix

## Arquitectura del Proyecto

### Framework y Patrones
- Angular 22+ con **standalone components** (sin NgModules)
- **Signals** para manejo de estado reactivo
- **ChangeDetectionStrategy.OnPush** en todos los componentes
- **Functional guards e interceptors** (estilo moderno, no clases)
- Bootstrap 5.3 via SCSS
- SSR habilitado con @angular/ssr

### Estructura de Directorios
```
src/app/
├── auth/           # Autenticación, guards, interceptors
├── layout/         # Shell del layout con sidebar
├── pages/          # Componentes de página (feature modules)
│   ├── dashboard/
│   ├── inventario/
│   └── facturas/
└── environments/   # Configuración por ambiente
```

### Convenciones de Código

#### Componentes
- Standalone siempre
- OnPush change detection
- Signals para estado local
- Template inline o archivo separado según complejidad
- Estilos SCSS con Bootstrap como base

#### Servicios
- `providedIn: 'root'` (singleton)
- Inyección con `inject()` (no constructor)
- Interfaces/export en el mismo archivo del servicio
- Manejo de errores con `catchError` de RxJS

#### Guards y Interceptors
- Funcionales, no clases
- Uso de `inject()` para dependencias
- Retorna `boolean | UrlTree`

#### Formularios
- Reactive Forms (FormBuilder, FormGroup, FormArray)
- Validadores declarados en la definición del campo
- Acceso vía `form.get('campo')` o getter

### Autenticación y Roles

#### Modelo de Usuario
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: number;  // 0: admin, 1: usuario, 2: caja, 3: bodega, etc.
}
```

#### Roles disponibles
- `0` - Admin (acceso total)
- `1` - Usuario (acceso general)
- `2` - Caja (próximamente)
- `3` - Bodega (próximamente)

#### Token
- Token generado en frontend con `btoa()` (base64)
- Almacenado en localStorage como `sga_token`
- Enviado como `Authorization: Bearer <token>` en cada request

#### Persistencia
- Datos de usuario en localStorage (`sga_current_user`)
- Token en localStorage (`sga_token`)
- Al recargar (F5), el AuthService carga automáticamente desde localStorage

### Rutas
- Login: pública (sin guard)
- Layout: protegida con AuthGuard
- Hijos del Layout: pueden tener RoleGuard adicional

### Ambientes
- `environment.ts` (desarrollo): apiUrl local
- `environment.prod.ts` (producción): apiUrl del servidor real

### Errores HTTP
- 401/403: auto-logout y redirección a /login
- 0: error de conexión
- Otros: log en consola

### Estilo
- Clases CSS: BEM o Bootstrap utility classes
- Variables SCSS: definidas en styles.scss
- Responsive: breakpoints de Bootstrap
