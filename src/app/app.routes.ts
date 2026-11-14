import { Routes } from '@angular/router';
import { adminGuard, passwordPageGuard } from './core/auth';
import { Shell } from './layout/shell';

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
      { path: 'equipe', title: 'Équipe · Apex Ledger', loadComponent: () => import('./pages/team').then((m) => m.Team) },
      { path: 'activite', title: 'Journal d’activité · Apex Ledger', loadComponent: () => import('./pages/activity').then((m) => m.Activity) },
      { path: 'ventes', title: 'Ventes · Apex Ledger', loadComponent: () => import('./pages/sales').then((m) => m.Sales) },
      { path: 'caisses', title: 'Caisses · Apex Ledger', loadComponent: () => import('./pages/cash-sessions').then((m) => m.CashSessions) },
      { path: 'creances', title: 'Créances & dettes · Apex Ledger', loadComponent: () => import('./pages/finances').then((m) => m.Finances) },
      { path: 'exports', title: 'Exports · Apex Ledger', loadComponent: () => import('./pages/exports').then((m) => m.Exports) },
      { path: 'utilisateurs', title: 'Utilisateurs · Apex Ledger', loadComponent: () => import('./pages/users').then((m) => m.Users) },
      { path: 'depots', title: 'Dépôts · Apex Ledger', loadComponent: () => import('./pages/warehouses').then((m) => m.Warehouses) },
      { path: 'parametres', title: 'Paramètres · Apex Ledger', loadComponent: () => import('./pages/settings').then((m) => m.Settings) },
      { path: 'audit', redirectTo: 'activite' },
      { path: 'societe', redirectTo: 'parametres' },
      { path: '**', redirectTo: '' },
    ],
  },
];
