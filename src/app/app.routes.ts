import { Routes } from '@angular/router';
import { adminGuard, passwordPageGuard } from './core/auth';
import { Shell } from './layout/shell';

const placeholder = () => import('./pages/placeholder').then((m) => m.Placeholder);

export const routes: Routes = [
  {
    path: 'connexion',
    title: 'Connexion · Apex Ledger',
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: 'mot-de-passe',
    title: 'Mot de passe · Apex Ledger',
    canActivate: [passwordPageGuard],
    loadComponent: () => import('./pages/change-password').then((m) => m.ChangePassword),
  },
  {
    path: '',
    component: Shell,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      {
        path: '',
        title: "Vue d'ensemble · Apex Ledger",
        loadComponent: () => import('./pages/overview').then((m) => m.Overview),
      },
      {
        path: 'utilisateurs',
        title: 'Utilisateurs · Apex Ledger',
        loadComponent: () => import('./pages/users').then((m) => m.Users),
      },
      { path: 'depots', title: 'Dépôts · Apex Ledger', data: { title: 'Dépôts' }, loadComponent: placeholder },
      { path: 'audit', title: "Journal d'audit · Apex Ledger", data: { title: "Journal d'audit" }, loadComponent: placeholder },
      { path: 'societe', title: 'Société · Apex Ledger', data: { title: 'Société & paramètres' }, loadComponent: placeholder },
      { path: '**', redirectTo: '' },
    ],
  },
];
