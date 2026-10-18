import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login';
import { Wrapper } from './pages/wrapper/wrapper';
import { Home } from './pages/home/home';
import { AddProducts} from './pages/catalog/products/add/add';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: '', component: Wrapper, 
    children: [
    { path: 'home', component: Home },
    { path: 'catalog/products/add', component: AddProducts }
  ]  },
  { path: '**', redirectTo: 'login' },

];
