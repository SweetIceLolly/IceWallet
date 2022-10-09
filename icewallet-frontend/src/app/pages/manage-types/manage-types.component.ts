import { Component, OnInit } from '@angular/core';
import { AppStorageController } from '../../controllers/appstorage.controller';

@Component({
  selector: 'app-manage-types',
  templateUrl: './manage-types.component.html',
  styleUrls: ['./manage-types.component.css']
})
export class ManageTypesComponent implements OnInit {

  constructor(
    private appStorageCtrl: AppStorageController
  ) { }

  ngOnInit(): void {
    // Check if the user is logged in
    if (!this.appStorageCtrl.getLoginToken()) {
      window.location.href = '/login';
    }
  }

}
