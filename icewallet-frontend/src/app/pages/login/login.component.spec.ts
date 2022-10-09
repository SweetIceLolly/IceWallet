import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageTypesComponent } from './manage-types.component';

describe('ManageTypesComponent', () => {
  let component: ManageTypesComponent;
  let fixture: ComponentFixture<ManageTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageTypesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
