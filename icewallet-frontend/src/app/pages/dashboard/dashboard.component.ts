import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { WalletEntry } from '../../models/walletEntry';

import { EntryController } from '../../controllers/entry.controller';
import { AppStorageController } from '../../controllers/appstorage.controller';
import { GeneralController } from '../../controllers/general.controller';
import * as Constants from '../../controllers/constants';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  newEntry: WalletEntry = new WalletEntry();

  recentEntries: WalletEntry[] = [];
  totalEntryCount: number = 0;
  totalPages: number = 1;
  currentPage: number = 1;
  pageNumInput: string = '1';
  itemsPerPage: number = 10;
  sortBy: string = 'date';

  specificDate: boolean = false;
  specificDateType: string = 'yesterday';
  lastWeekValue: string = '7';
  specificDateValue: string = (new Date()).toISOString().split('T')[0];

  addEntryError: string = '';
  itemAdded: boolean = false;

  loadEntryError: string = '';

  descAutoComplete: string[] = [];
  showAutoComplete: boolean = false;
  autoCompleteIndex: number = -1;

  positiveItemBgColor: string = Constants.DEFAULT_POSITIVE_AMOUNT_COLOR;
  negativeItemBgColor: string = Constants.DEFAULT_NEGATIVE_AMOUNT_COLOR;

  constructor(
    private entryCtrl: EntryController,
    private appStorageCtrl: AppStorageController,
    private genCtrl: GeneralController,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Check if the user is logged in
    if (!this.appStorageCtrl.getLoginToken()) {
      this.router.navigate(['/login']);
      return;
    }

    // Read settings
    this.itemsPerPage = Number(this.appStorageCtrl.getDefaultItemsPerPage());
    this.positiveItemBgColor = this.appStorageCtrl.getPositiveAmountColor();
    this.negativeItemBgColor = this.appStorageCtrl.getNegativeAmountColor();

    // Empty amount
    (this.newEntry as any).amount = '';

    // Get recent entries
    this.getRecentEntries();
  }

  onSpecificDateChange(event: any) {
    this.specificDate = event.target.checked;
    if (this.specificDate) {
      (this.newEntry as any).date = undefined;
    } else {
      this.newEntry.date = new Date();
    }
  }

  selectAutoComplete(index: number) {
    this.newEntry.description = this.descAutoComplete[index];
    document.getElementById('new-record-amount')?.focus();
    this.showAutoComplete = false;
  }

  hideAutoComplete() {
    setTimeout(() => {
      this.showAutoComplete = false;
      this.autoCompleteIndex = -1;
    }, 250);
  }

  handleDescKeyDown(event: any) {
    this.itemAdded = false;
    this.addEntryError = '';

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (this.autoCompleteIndex !== -1) {
        this.newEntry.description = this.descAutoComplete[this.autoCompleteIndex];
      }
      document.getElementById('new-record-amount')?.focus();
      this.showAutoComplete = false;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.autoCompleteIndex <= 0) {
        this.autoCompleteIndex = this.descAutoComplete.length - 1;
      } else {
        this.autoCompleteIndex--;
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.autoCompleteIndex >= this.descAutoComplete.length - 1) {
        this.autoCompleteIndex = 0;
      } else {
        this.autoCompleteIndex++;
      }
    }
  }

  handleDescKeyUp(event: any) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      return;
    }
    this.descAutoComplete = this.genCtrl.getDescSuggestions(event.target.value);
    this.autoCompleteIndex = -1;
  }

  handleAmountKeyDown(event: any) {
    this.itemAdded = false;
    this.addEntryError = '';

    if (event.key === 'Enter') {
      this.addEntry();
    }
  }

  handlePageNumKeyDown(event: any) {
    if (event.key === 'Enter') {
      const newPage = Number(this.pageNumInput);
      if (newPage !== this.currentPage) {
        this.currentPage = newPage;
        if (this.currentPage < 1) {
          this.currentPage = 1;
        } else if (this.currentPage > this.totalPages) {
          this.currentPage = this.totalPages;
        }
        this.getRecentEntries();
      }
    }
  }

  setPage(pageNum: number) {
    if (pageNum < 1) {
      pageNum = 1;
    } else if (pageNum > this.totalPages) {
      pageNum = this.totalPages;
    }
    if (this.currentPage !== pageNum) {
      this.currentPage = pageNum;
      this.pageNumInput = String(pageNum);
      this.getRecentEntries();
    }
  }

  updateItemsPerPage(event: any) {
    this.itemsPerPage = Number(event.target.value);
    this.totalPages = Math.ceil(this.totalEntryCount / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
      this.pageNumInput = String(this.currentPage);
    }
    this.getRecentEntries();
  }

  updateSortBy(event: any) {
    this.sortBy = event.target.value;
    this.getRecentEntries();
  }

  addEntry() {
    // Remove redundant fields
    (this.newEntry as any)._id = undefined;
    (this.newEntry as any).createTime = undefined;

    // Handle specific date
    if (this.specificDate) {
      switch (this.specificDateType) {
        case 'yesterday':
          this.newEntry.date = new Date();
          this.newEntry.date.setDate(this.newEntry.date.getDate() - 1);
          break;

        case 'lastWeek':
          this.newEntry.date = new Date();
          this.newEntry.date.setDate(this.newEntry.date.getDate() - (this.newEntry.date.getDay() + 7 - Number(this.lastWeekValue)) % 7);
          break;

        case 'specific':
          const splitTmp = this.specificDateValue.split('-').map((x: string) => Number(x));
          this.newEntry.date = new Date(Number(splitTmp[0]), Number(splitTmp[1]) - 1, Number(splitTmp[2]));
          break;
      }
    } else {
      this.newEntry.date = new Date();
    }

    // Check if the entry is valid
    if (!this.newEntry.description) {
      this.addEntryError = "Please provide a description";
      document.getElementById('new-record-desc')?.focus();
      return;
    }
    if (isNaN(Number(this.newEntry.amount))) {
      this.addEntryError = "Please provide a valid amount";
      document.getElementById('new-record-amount')?.focus();
      return;
    }
    if (this.newEntry.date === undefined) {
      this.addEntryError = "Please provide a date";
      return;
    }

    // Add the entry
    this.entryCtrl.insertEntry(this.newEntry).then((res: boolean) => {
      this.addEntryError = '';
      this.itemAdded = true;
      this.newEntry = new WalletEntry();
      (this.newEntry as any).amount = '';
      document.getElementById('new-record-desc')?.focus();
      this.getRecentEntries();
    }).catch((err: any) => {
      this.addEntryError = err;
    });
  }

  getRecentEntries() {
    this.loadEntryError = '';
    this.genCtrl.showLoading(true);

    this.entryCtrl.getEntries([], (this.currentPage - 1) * this.itemsPerPage, this.itemsPerPage, this.sortBy)
      .then((res: any) => {
        this.recentEntries = res.entries;
        this.totalEntryCount = res.count;
        this.totalPages = Math.ceil(this.totalEntryCount / this.itemsPerPage);
        this.genCtrl.updateFooter(
          `Total In: ${this.formatAmount(res.positiveAmount)} | Total Out: ${this.formatAmount(res.negativeAmount)} | Total: ${this.formatAmount(res.positiveAmount + res.negativeAmount)}`
        );
        for (const entry of this.recentEntries) {
          this.genCtrl.addDescToTrie(entry.description);
        }
      })
      .catch((err) => {
        this.loadEntryError = err;
      })
      .finally(() => {
        this.genCtrl.showLoading(false);
      });
  }

  formatDate(date: Date) {
    const formatOptions: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', formatOptions);
  }

  formatAmount(amount: number) {
    return (amount < 0 ? '' : '+') + amount.toFixed(2);
  }
}
