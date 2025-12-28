import { Component, OnInit } from '@angular/core';
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { Router } from '@angular/router';

import { AppStorageController } from '../../controllers/appstorage.controller';
import { CredentialController } from '../../controllers/credential.controller';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  settingsError: string = '';

  itemsPerPage: string = '';
  positiveColor: string = '';
  negativeColor: string = '';
  negativeByDefault: boolean = true;

  confirmMessage: string = '';
  confirmMode: number = 0;      // -1: Just a message; 0: Reset to default; 1: Clear server tokens; 2: Logout

  constructor(
    private appStorageCtrl: AppStorageController,
    private credentialCtrl: CredentialController,
    private router: Router,
    private modalService: NgbModal,
  ) { }

  ngOnInit(): void {
    // Check if the user is logged in
    if (!this.appStorageCtrl.getLoginToken()) {
      this.router.navigate(['/login']);
      return;
    }

    // Read default values from app storage
    this.itemsPerPage = this.appStorageCtrl.getDefaultItemsPerPage();
    this.positiveColor = this.appStorageCtrl.getPositiveAmountColor();
    this.negativeColor = this.appStorageCtrl.getNegativeAmountColor();
    this.negativeByDefault = this.appStorageCtrl.getNegativeByDefault();
  }

  changePassword(popupModal: any) {
    if (!this.oldPassword) {
      this.settingsError = 'Please enter your current password';
      return;
    }
    if (!this.newPassword) {
      this.settingsError = 'Please enter your new password';
      return;
    }
    if (!this.confirmPassword) {
      this.settingsError = 'Please confirm your new password';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.settingsError = 'New password and confirm password do not match';
      (document.getElementById('newPsw') as any).focus();
      (document.getElementById('newPsw') as any).select();
      return;
    }

    this.credentialCtrl.changePassword(this.oldPassword, this.newPassword)
      .then(() => {
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.settingsError = '';
        this.confirmMessage = 'Password changed successfully';
        this.confirmMode = -1;
        this.openPopup(popupModal, this.confirmMode);
      })
      .catch((err: any) => {
        this.settingsError = err;
        (document.getElementById('currPsw') as any).focus();
        (document.getElementById('currPsw') as any).select();
      })
  }

  handleCurrPswKeyDown(event: KeyboardEvent) {
    this.settingsError = '';
    if (event.key === 'Enter') {
      (document.getElementById('newPsw') as any).focus();
      (document.getElementById('newPsw') as any).select();
    }
  }

  handleNewPswKeyDown(event: KeyboardEvent) {
    this.settingsError = '';
    if (event.key === 'Enter') {
      (document.getElementById('confirmPsw') as any).focus();
      (document.getElementById('confirmPsw') as any).select();
    }
  }

  handleConfirmPswKeyDown(event: KeyboardEvent, popupModal: any) {
    this.settingsError = '';
    if (event.key === 'Enter') {
      this.changePassword(popupModal);
    }
  }

  updateDefaultItemsPerPage(event: any) {
    this.appStorageCtrl.setDefaultItemsPerPage(event.target.value);
  }

  updateDefaultPositiveAmountColor(event: any) {
    this.appStorageCtrl.setPositiveAmountColor(event.target.value);
  }

  updateDefaultNegativeAmountColor(event: any) {
    this.appStorageCtrl.setNegativeAmountColor(event.target.value);
  }

  updateNegativeByDefault(event: any) {
    this.negativeByDefault = event.target.checked;
    this.appStorageCtrl.setNegativeByDefault(this.negativeByDefault);
  }

  resetDefaults(popupModal: any) {
    this.confirmMessage = 'Are you sure you want to reset all settings to default?';
    this.confirmMode = 0;
    this.openPopup(popupModal, this.confirmMode);
  }

  clearServerTokens(popupModal: any) {
    this.confirmMessage = 'Clearing server tokens will log you out of all devices (including here). Are you sure you want to continue?';
    this.confirmMode = 1;
    this.openPopup(popupModal, this.confirmMode);
  }

  logout(popupModal: any) {
    this.confirmMessage = 'Are you sure you want to logout?';
    this.confirmMode = 2;
    this.openPopup(popupModal, this.confirmMode);
  }

  openPopup(content: any, modal: any) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'});
  }

  popupConfirm(modal: any) {
    modal.close();
    if (this.confirmMode === 0) {
      // Reset settings to default
      this.appStorageCtrl.setDefaultItemsPerPage('');
      this.appStorageCtrl.setPositiveAmountColor('');
      this.appStorageCtrl.setNegativeAmountColor('');
      localStorage.removeItem('negativeByDefault');
      this.appStorageCtrl.setDefaultItemsPerPage(this.appStorageCtrl.getDefaultItemsPerPage());
      this.appStorageCtrl.setPositiveAmountColor(this.appStorageCtrl.getPositiveAmountColor());
      this.appStorageCtrl.setNegativeAmountColor(this.appStorageCtrl.getNegativeAmountColor());
      this.itemsPerPage = this.appStorageCtrl.getDefaultItemsPerPage();
      this.positiveColor = this.appStorageCtrl.getPositiveAmountColor();
      this.negativeColor = this.appStorageCtrl.getNegativeAmountColor();
      this.negativeByDefault = this.appStorageCtrl.getNegativeByDefault();
      (document.getElementById('default-items-per-page') as any).value = this.itemsPerPage;
    } else if (this.confirmMode === 1) {
      // Clear server tokens
      this.credentialCtrl.clearServerTokens()
        .then(() => {
          this.appStorageCtrl.setLoginToken('');
          this.router.navigate(['/login']);
        })
        .catch((err: any) => {
          this.settingsError = err;
        });
    } else if (this.confirmMode === 2) {
      // Logout
      this.credentialCtrl.logout();
      this.appStorageCtrl.setLoginToken('');
      this.router.navigate(['/login']);
    }
  }
}
