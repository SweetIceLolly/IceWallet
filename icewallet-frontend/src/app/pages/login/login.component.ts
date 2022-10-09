import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppStorageController } from "../../controllers/appstorage.controller";
import { CredentialController } from "../../controllers/credential.controller";
import {NgbModal} from "@ng-bootstrap/ng-bootstrap";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  specifyServer: boolean = false;
  password: string = '';

  apiUrl: string = '';
  publicKey: string = '';

  loginError: string = '';

  confirmMessage: string = '';
  confirmMode: number = 0;      // -1: Just a message; 0: Obtain public key; 1: Reset to default

  constructor(
    private router: Router,
    private appStorageCtrl: AppStorageController,
    private credentialCtrl: CredentialController,
    private modalService: NgbModal,
  ) { }

  ngOnInit(): void {
    // Check if the user is already logged in
    if (this.appStorageCtrl.getLoginToken()) {
      this.router.navigate(['/']);
      return;
    }

    this.apiUrl = this.appStorageCtrl.getServerUrl();
    this.publicKey = this.appStorageCtrl.getServerPublicKey();
  }

  onSpecifyServerChange(event: any) {
    this.loginError = '';
    this.specifyServer = event.target.checked;
  }

  handlePasswordKeyDown(event: any) {
    this.loginError = '';
    if (event.key === 'Enter') {
      this.login();
    }
  }

  login() {
    // Check for invalid info
    if (this.password.length === 0) {
      this.loginError = 'Please enter a password';
      return;
    }
    if (this.specifyServer && (this.apiUrl.length === 0 || this.publicKey.length === 0)) {
      this.loginError = 'Please enter a valid server URL and public key';
      return;
    }
    this.loginError = '';

    // Save the server info
    if (this.specifyServer) {
      this.saveServerInfo();
    }

    this.credentialCtrl.login(this.password)
      .then((token: string) => {
        this.appStorageCtrl.setLoginToken(token);
        this.router.navigate(['/']);
      })
      .catch((err: any) => {
        this.loginError = err;
      });
  }

  saveServerInfo() {
    this.appStorageCtrl.setServerUrl(this.apiUrl);
    this.appStorageCtrl.setServerPublicKey(this.publicKey);
  }

  saveServerInfoButton(popupModal: any) {
    this.saveServerInfo();
    this.confirmMessage = 'Server info saved.';
    this.confirmMode = -1;
    this.openPopup(popupModal, this.confirmMode);
  }

  resetServerInfo(popupModal: any) {
    this.confirmMessage = 'Are you sure you want to reset the server info to default?';
    this.confirmMode = 1;
    this.openPopup(popupModal, this.confirmMode);
  }

  getServerPublicKey(popupModal: any) {
    this.confirmMessage = 'The public key is used to verify the identity of the server.\n' +
      'Are you sure you want to trust the server ' + this.apiUrl + '?';
    this.confirmMode = 0;
    this.openPopup(popupModal, this.confirmMode);
  }

  openPopup(content: any, modal: any) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'});
  }

  popupConfirm(modal: any) {
    modal.close();
    if (this.confirmMode === 0) {
      // Obtain public key
      this.credentialCtrl.getServerPublicKey()
        .then((res: string) => {
          this.publicKey = res;
          this.saveServerInfo();
        })
        .catch((err: any) => {
          this.loginError = err;
        });
    } else if (this.confirmMode === 1) {
      // Reset to default
      this.appStorageCtrl.setServerUrl('');
      this.appStorageCtrl.setServerPublicKey('');
      this.appStorageCtrl.setServerUrl(this.appStorageCtrl.getServerUrl());
      this.appStorageCtrl.setServerPublicKey(this.appStorageCtrl.getServerPublicKey());
      this.apiUrl = this.appStorageCtrl.getServerUrl();
      this.publicKey = this.appStorageCtrl.getServerPublicKey();
    }
  }
}
