import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { Wrapper } from './pages/wrapper/wrapper';
import { Home } from './pages/home/home';
import { AddProducts} from './pages/catalog/products/add/add';
import { AddVendor } from './pages/catalog/vendors/add/add';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: '', component: Wrapper, 
    children: [
    { path: 'home', component: Home },
    { path: 'catalog/products/add', component: AddProducts },
    { path: 'catalog/vendors/add', component: AddVendor }
  ]  },
  { path: '**', redirectTo: 'login' },

];
