import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from "./pages/dashboard/dashboard.component";
import { ManageEntriesComponent } from './pages/manage-entries/manage-entries.component';
import { ManageTypesComponent } from './pages/manage-types/manage-types.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { LoginComponent } from './pages/login/login.component';
import { ReportComponent } from './pages/report/report.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'manage-entries',
    component: ManageEntriesComponent,
  },
  {
    path: 'manage-types',
    component: ManageTypesComponent,
  },
  {
    path: 'settings',
    component: SettingsComponent,
  },
  {
    path: 'report',
    component: ReportComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: '**',
    redirectTo: ''
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
