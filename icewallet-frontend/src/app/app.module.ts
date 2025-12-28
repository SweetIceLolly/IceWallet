import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";

import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ManageEntriesComponent } from './pages/manage-entries/manage-entries.component';
import { ManageTypesComponent } from './pages/manage-types/manage-types.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { LoginComponent } from './pages/login/login.component';
import { ReportComponent } from './pages/report/report.component';

import { AppStorageController } from './controllers/appstorage.controller';
import { EntryController } from './controllers/entry.controller';
import { CredentialController } from './controllers/credential.controller';
import { GeneralController } from './controllers/general.controller';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    ManageEntriesComponent,
    ManageTypesComponent,
    SettingsComponent,
    FooterComponent,
    HeaderComponent,
    LoginComponent,
    ReportComponent,
  ],
    imports: [
      BrowserModule,
      NgbModule,
      AppRoutingModule,
      FormsModule,
      HttpClientModule
    ],
  providers: [
    AppStorageController,
    EntryController,
    CredentialController,
    GeneralController,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
