import { Routes } from '@angular/router';
import { Shell } from './layout/shell';

const placeholder = () => import('./pages/placeholder').then((m) => m.Placeholder);

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      {
        path: '',
        title: "Vue d'ensemble · Apex Ledger",
        loadComponent: () => import('./pages/overview').then((m) => m.Overview),
      },
      { path: 'utilisateurs', title: 'Utilisateurs · Apex Ledger', data: { title: 'Utilisateurs & rôles' }, loadComponent: placeholder },
      { path: 'depots', title: 'Dépôts · Apex Ledger', data: { title: 'Dépôts' }, loadComponent: placeholder },
      { path: 'audit', title: "Journal d'audit · Apex Ledger", data: { title: "Journal d'audit" }, loadComponent: placeholder },
      { path: 'societe', title: 'Société · Apex Ledger', data: { title: 'Société & paramètres' }, loadComponent: placeholder },
      { path: '**', redirectTo: '' },
    ],
  },
];
