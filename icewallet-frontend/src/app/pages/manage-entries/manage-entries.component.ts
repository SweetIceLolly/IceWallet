import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { SearchFilter } from '../../models/filter';
import { WalletEntry } from '../../models/walletEntry';
import { FILTER_TYPE, FILTER_OPERATOR } from '../../models/filter';

import { AppStorageController } from '../../controllers/appstorage.controller';
import { EntryController } from '../../controllers/entry.controller';
import { GeneralController } from '../../controllers/general.controller';
import * as Constants from "../../controllers/constants";

@Component({
  selector: 'app-manage-entries',
  templateUrl: './manage-entries.component.html',
  styleUrls: ['./manage-entries.component.css']
})
export class ManageEntriesComponent implements OnInit {
  filters: SearchFilter[] = [];
  entries: WalletEntry[] = [];
  deleteEntry: WalletEntry = new WalletEntry();

  totalEntryCount: number = 0;
  totalPages: number = 1;
  currentPage: number = 1;
  pageNumInput: string = '1';
  itemsPerPage: number = 10;
  sortBy: string = 'date';

  editingDesc: string = '';
  editingAmount: string = '';
  editingDate: string = '';
  prevEditingDate: Date = new Date();
  editingId: string = '';

  manageEntryError: string = '';
  editEntryError: string = '';
  deleteEntryError: string = '';

  positiveItemBgColor: string = Constants.DEFAULT_POSITIVE_AMOUNT_COLOR;
  negativeItemBgColor: string = Constants.DEFAULT_NEGATIVE_AMOUNT_COLOR;

  constructor(
    private modalService: NgbModal,
    private appStorageCtrl: AppStorageController,
    private entryCtrl: EntryController,
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

    // Get entries
    this.getEntries();
  }

  addFilter() {
    this.filters.push(new SearchFilter());
  }

  removeFilter(index: number) {
    this.filters.splice(index, 1);
  }

  clearFilters() {
    this.filters = [];
  }

  isDateFilter(filter: SearchFilter) {
    return filter.type === FILTER_TYPE.DATE || filter.type === FILTER_TYPE.ENTRY_DATE;
  }

  isStringFilter(filter: SearchFilter) {
    return filter.type === FILTER_TYPE.DESC;
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
        this.getEntries();
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
      this.getEntries();
    }
  }

  updateFilter(filter: SearchFilter, event: Event, updateType: string) {
    const newVal = (event.target as HTMLInputElement).value;

    switch (updateType) {
      case 'type':
        switch (newVal) {
          case 'Date':
            filter.type = FILTER_TYPE.DATE;
            filter.operator = FILTER_OPERATOR.LT;
            break;

          case 'Amount':
            filter.type = FILTER_TYPE.AMOUNT;
            filter.operator = FILTER_OPERATOR.LT;
            break;

          case 'Desc':
            filter.type = FILTER_TYPE.DESC;
            filter.operator = FILTER_OPERATOR.CONTAINS;
            break;

          case 'EntryDate':
            filter.type = FILTER_TYPE.ENTRY_DATE;
            filter.operator = FILTER_OPERATOR.LT;
            break;
        }
        break;

      case 'op':
        switch (newVal) {
          case 'lt':
            filter.operator = FILTER_OPERATOR.LT;
            break;

          case 'leq':
            filter.operator = FILTER_OPERATOR.LEQ;
            break;

          case 'eq':
            filter.operator = FILTER_OPERATOR.EQ;
            break;

          case 'geq':
            filter.operator = FILTER_OPERATOR.GEQ;
            break;

          case 'gt':
            filter.operator = FILTER_OPERATOR.GT;
            break;

          case 'neq':
            filter.operator = FILTER_OPERATOR.NEQ;
            break;

          case 'contains':
            filter.operator = FILTER_OPERATOR.CONTAINS;
            break;

          case 'not-contains':
            filter.operator = FILTER_OPERATOR.NOT_CONTAINS;
            break;
        }
        break;

      case 'value':
        if (filter.type === FILTER_TYPE.AMOUNT) {
          filter.value = Number(newVal);
        } else if (filter.type === FILTER_TYPE.DATE || filter.type === FILTER_TYPE.ENTRY_DATE) {
          filter.value = new Date(newVal);
        } else {
          filter.value = newVal;
        }
        break;
    }
  }

  updateItemsPerPage(event: any) {
    this.itemsPerPage = Number(event.target.value);
    this.totalPages = Math.ceil(this.totalEntryCount / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
      this.pageNumInput = String(this.currentPage);
    }
    this.getEntries();
  }

  updateSortBy(event: any) {
    this.sortBy = event.target.value;
    this.getEntries();
  }

  getEntries() {
    this.manageEntryError = '';

    // Validate filters
    for (const filter of this.filters) {
      switch (filter.type) {
        case FILTER_TYPE.DATE:
        case FILTER_TYPE.ENTRY_DATE:
          if (!(filter.value instanceof Date)) {
            this.manageEntryError = 'Invalid date filter';
            return;
          }
          break;

        case FILTER_TYPE.AMOUNT:
          if (typeof filter.value !== 'number') {
            this.manageEntryError = 'Invalid amount filter';
            return;
          }
          break;

        case FILTER_TYPE.DESC:
          if (!filter.value) {
            this.manageEntryError = 'Invalid description filter';
            return;
          }
          break;
      }
    }

    this.genCtrl.showLoading(true);

    this.entryCtrl.getEntries(this.filters, (this.currentPage - 1) * this.itemsPerPage, this.itemsPerPage, this.sortBy)
      .then((res: any) => {
        this.entries = res.entries;
        this.totalEntryCount = res.count;
        this.totalPages = Math.ceil(this.totalEntryCount / this.itemsPerPage);
        this.genCtrl.updateFooter(
          `Total In: ${this.formatAmount(res.positiveAmount)} | Total Out: ${this.formatAmount(res.negativeAmount)} | Total: ${this.formatAmount(res.positiveAmount + res.negativeAmount)}`
        );
        for (const entry of this.entries) {
          this.genCtrl.addDescToTrie(entry.description);
        }
      })
      .catch((err) => {
        this.manageEntryError = err;
      })
      .finally(() => {
        this.genCtrl.showLoading(false);
      });
  }

  openPopup(content: any) {
    this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'});
  }

  showEdit(entry: WalletEntry, popupModal: any) {
    this.editingDesc = entry.description;
    this.editingAmount = entry.amount.toString();
    this.prevEditingDate = new Date(entry.date);
    this.editingDate = entry.date.toString().split('T')[0];
    this.editingId = entry._id;
    this.editEntryError = '';
    this.openPopup(popupModal);
  }

  saveEdit(modal: any) {
    this.editEntryError = '';

    if (!this.editingDesc) {
      this.editEntryError = 'Description is required';
      return;
    }
    if (!this.editingAmount || isNaN(Number(this.editingAmount))) {
      this.editEntryError = 'Amount is required';
      return;
    }
    if (!this.editingDate || isNaN(Date.parse(this.editingDate))) {
      this.editEntryError = 'Date is required';
      return;
    }

    let newDate = this.prevEditingDate;
    const splitTmp = this.editingDate.split('-');
    newDate.setFullYear(Number(splitTmp[0]), Number(splitTmp[1]) - 1, Number(splitTmp[2]));

    this.genCtrl.showLoading(true);
    this.entryCtrl.updateEntry(this.editingId, this.editingDesc, Number(this.editingAmount), newDate)
      .then(() => {
        this.getEntries();
        modal.close();
      })
      .catch((err) => {
        this.editEntryError = err;
      })
      .finally(() => {
        this.genCtrl.showLoading(false);
      });
  }

  showDelete(entry: WalletEntry, popupModal: any) {
    this.deleteEntry = entry;
    this.deleteEntryError = '';
    this.openPopup(popupModal);
  }

  confirmDelete(modal: any) {
    this.deleteEntryError = '';

    this.genCtrl.showLoading(true);
    this.entryCtrl.deleteEntry(this.deleteEntry._id)
      .then(() => {
        this.getEntries();
        modal.close();
      })
      .catch((err) => {
        this.deleteEntryError = err;
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
