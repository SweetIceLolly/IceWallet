import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, throwError } from "rxjs";

import { GeneralController } from "./general.controller";
import { AppStorageController } from "./appstorage.controller";

import { WalletEntry } from "../models/walletEntry";
import { SearchFilter } from "../models/filter";

@Injectable()
export class EntryController {
  constructor(
    private http: HttpClient,
    private genCtrl: GeneralController,
    private appStorageCtrl: AppStorageController
  ) {}

  insertEntry(entry: WalletEntry): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/createEntry", entry, this.genCtrl.getAuthHeader())
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

  /**
   * @returns { count: number, entries: WalletEntry[], total: number }
   */
  getEntries(filter: SearchFilter[], start: number, limit: number, sort: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/getEntries", {
        filter: filter,
        start: start,
        limit: limit,
        sort: sort
      }, this.genCtrl.getAuthHeader())
        .pipe(catchError((err: HttpErrorResponse) => {
          this.genCtrl.handleError(err);
          reject(typeof err.error === 'object' ? err.message : err.error);
          return throwError(() => { new Error(typeof err.error === 'object' ? err.message : err.error) });
        }))

        .subscribe((res: any) => {
          resolve(res);
        });
    });
  }

  updateEntry(id: string, description: string, amount: number, date: Date): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/updateEntry", {
        id: id,
        description: description,
        amount: amount,
        date: date
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

  deleteEntry(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.post<any>(this.appStorageCtrl.getServerUrl() + "/deleteEntry", {
        id: id
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
}
