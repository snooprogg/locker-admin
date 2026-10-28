import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { Wrapper } from './pages/wrapper/wrapper';
import { Home } from './pages/home/home';
import { AddProducts} from './pages/catalog/products/add/add';
import { AddVendor } from './pages/catalog/vendors/add/add';
import { ManageVendors } from './pages/catalog/vendors/manage/manage';
import { ManageProducts } from './pages/catalog/products/manage/manage';
import { authGuard, guestGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: '', component: Wrapper, canActivate: [authGuard], canActivateChild: [authGuard],
    children: [
    { path: 'home', component: Home },
    { path: 'catalog/products/add', component: AddProducts },
    { path: 'catalog/products/edit/:id', component: AddProducts },
    { path: 'catalog/products/manage', component: ManageProducts },
    { path: 'catalog/vendors/add', component: AddVendor },
    { path: 'catalog/vendors/edit/:id', component: AddVendor },
    { path: 'catalog/vendors/manage', component: ManageVendors }
  ]  },
  { path: '**', redirectTo: 'login' },

];
