import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/auth/login.component';
import { ProfileComponent } from './components/profile/profile.component';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./components/products/products-list.component').then((m) => m.ProductsListComponent),
  },
  {
    path: 'products/:id',
    loadComponent: () =>
      import('./components/products/product-detail.component').then(
        (m) => m.ProductDetailComponent,
      ),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./components/auth/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    component: ProfileComponent,
  },
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./components/settings/settings.component').then((m) => m.SettingsComponent),
  },
  {
    path: 'buyer/orders',
    canActivate: [AuthGuard],
    data: { roles: ['acheteur'] },
    loadComponent: () =>
      import('./components/orders/buyer-orders.component').then((m) => m.BuyerOrdersComponent),
  },
  {
    path: 'cart',
    canActivate: [AuthGuard],
    data: { roles: ['acheteur'] },
    loadComponent: () => import('./components/orders/cart.component').then((m) => m.CartComponent),
  },
  {
    path: 'checkout',
    canActivate: [AuthGuard],
    data: { roles: ['acheteur'] },
    loadComponent: () =>
      import('./components/orders/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'checkout/:id',
    canActivate: [AuthGuard],
    data: { roles: ['acheteur'] },
    loadComponent: () =>
      import('./components/orders/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    path: 'boutique/dashboard',
    canActivate: [AuthGuard],
    data: { roles: ['boutique'] },
    loadComponent: () =>
      import('./components/boutique/boutique-dashboard.component').then(
        (m) => m.BoutiqueDashboardComponent,
      ),
  },
  {
    path: 'boutique/products',
    canActivate: [AuthGuard],
    data: { roles: ['boutique'] },
    loadComponent: () =>
      import('./components/boutique/boutique-products.component').then(
        (m) => m.BoutiqueProductsComponent,
      ),
  },
  {
    path: 'admin/dashboard',
    canActivate: [AuthGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./components/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'admin/users',
    canActivate: [AuthGuard],
    data: { roles: ['admin'] },
    loadComponent: () =>
      import('./components/admin/admin-users.component').then((m) => m.AdminUsersComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
