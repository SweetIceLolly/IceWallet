import { Injectable } from "@angular/core";
import { GeneralController } from "./general.controller";
import { AppStorageController } from "./appstorage.controller";
import * as Forge from 'node-forge';
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, throwError } from "rxjs";

@Injectable()
export class CredentialController {
  constructor(
    private http: HttpClient,
    private genCtrl: GeneralController,
    private appStorageCtrl: AppStorageController
  ) {}

  encryptWithPublicKey(content: string): string {
    const rsa = Forge.pki.publicKeyFromPem(this.appStorageCtrl.getServerPublicKey());
    return window.btoa(rsa.encrypt(content, 'RSAES-PKCS1-V1_5'));
  }

  getServerPublicKey(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.http.get<any>(this.appStorageCtrl.getServerUrl() + "/getPublicKey")
        .pipe(catchError((err: HttpErrorResponse) => {
          this.genCtrl.handleError(err);
          reject(typeof err.error === 'object' ? err.message : err.error);
          return throwError(() => { new Error(typeof err.error === 'object' ? err.message : err.error) });
        }))

        .subscribe((res: any) => {
          resolve(res.key);
        });
    });
  }

  login(password: string): Promise<string> {
    // Encrypt the password using server's public key
    let encryptedPassword: string;
    try {
      encryptedPassword = this.encryptWithPublicKey(password);
    }
    catch (err) {
      return Promise.reject(err);
    }

    // Send the encrypted password to the server, who has to
    // have the corresponding private key to decrypt the password
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/login", { password: encryptedPassword })
        .pipe(catchError((err: HttpErrorResponse) => {
          this.genCtrl.handleError(err);
          reject(typeof err.error === 'object' ? err.message : err.error);
          return throwError(() => { new Error(typeof err.error === 'object' ? err.message : err.error) });
        }))

        .subscribe((res: any) => {
          // Check the response
          if (res.token) {
            resolve(res.token);
          }
          else {
            reject(res.message);
          }
        });
    });
  }

  logout(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/logout", null, this.genCtrl.getAuthHeader())
        .pipe(catchError((err: HttpErrorResponse) => {
          this.genCtrl.handleError(err);
          reject(typeof err.error === 'object' ? err.message : err.error);
          return throwError(() => { new Error(typeof err.error === 'object' ? err.message : err.error) });
        }))

        .subscribe((res: any) => {
          resolve(true);
        });
    });
  }

  clearServerTokens(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/clearTokens", null, this.genCtrl.getAuthHeader())
        .pipe(catchError((err: HttpErrorResponse) => {
          this.genCtrl.handleError(err);
          reject(typeof err.error === 'object' ? err.message : err.error);
          return throwError(() => { new Error(typeof err.error === 'object' ? err.message : err.error) });
        }))

        .subscribe((res: any) => {
          resolve(true);
        });
    });
  }

  changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    // Encrypt the password using server's public key
    let encryptedOldPassword: string;
    let encryptedNewPassword: string;

    try {
      encryptedOldPassword = this.encryptWithPublicKey(oldPassword);
      encryptedNewPassword = this.encryptWithPublicKey(newPassword);

      return new Promise((resolve, reject) => {
        this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/changePassword", {
          oldPassword: encryptedOldPassword,
          newPassword: encryptedNewPassword,
        }, this.genCtrl.getAuthHeader())
          .pipe(catchError((err: HttpErrorResponse) => {
            this.genCtrl.handleError(err);
            reject(typeof err.error === 'object' ? err.message : err.error);
            return throwError(() => { new Error(typeof err.error === 'object' ? err.message : err.error) });
          }))

          .subscribe((res: any) => {
            resolve(true);
          });
      });
    }
    catch (err) {
      return Promise.reject(err);
    }
  }
}
