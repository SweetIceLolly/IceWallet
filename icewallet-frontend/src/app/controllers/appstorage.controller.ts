import { Injectable } from "@angular/core";
import * as Constants from "./constants"

@Injectable()
export class AppStorageController {
  constructor() {}

  setLoginToken(newToken: string): void {
    localStorage.setItem("loginToken", newToken);
  }

  getLoginToken(): string | null {
    return localStorage.getItem("loginToken");
  }

  setServerUrl(newUrl: string): void {
    localStorage.setItem("serverUrl", newUrl);
  }

  getServerUrl(): string {
    return localStorage.getItem("serverUrl") || Constants.DEFAULT_SERVER_URL;
  }

  setServerPublicKey(newKey: string): void {
    localStorage.setItem("serverPublicKey", newKey);
  }

  getServerPublicKey(): string {
    return localStorage.getItem("serverPublicKey") || Constants.DEFAULT_SERVER_PUBLIC_KEY;
  }

  /**
   * @param value one of "10", "25", "50", "100"
   */
  setDefaultItemsPerPage(value: string): void {
    localStorage.setItem("defaultItemsPerPage", value);
  }

  getDefaultItemsPerPage(): string {
    return localStorage.getItem("defaultItemsPerPage") || Constants.DEFAULT_ITEMS_PER_PAGE;
  }

  setPositiveAmountColor(value: string): void {
    localStorage.setItem("positiveAmountColor", value);
  }

  getPositiveAmountColor(): string {
    return localStorage.getItem("positiveAmountColor") || Constants.DEFAULT_POSITIVE_AMOUNT_COLOR;
  }

  setNegativeAmountColor(value: string): void {
    localStorage.setItem("negativeAmountColor", value);
  }

  getNegativeAmountColor(): string {
    return localStorage.getItem("negativeAmountColor") || Constants.DEFAULT_NEGATIVE_AMOUNT_COLOR;
  }
}
