import {Component, ElementRef, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {BehaviorSubject} from 'rxjs';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';

import {ExportService} from './shared/export-service/export-service.service';
import {EMPLOYEE_LIST, IEmployee} from './employee-meta-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  @ViewChild('toast', {static: false}) toast: ElementRef;

  readonly STORAGE_KEY = 'EMPLOYEE_TABLE';

  public columnList = [
    {field: 'status', label: 'Status', visible: true},
    {field: 'name', label: 'Name', visible: true},
    {field: 'salary', label: 'Salary', visible: true},
    {field: 'email', label: 'Email', visible: true},
    {field: 'action', label: 'Action', visible: true}
  ];

  public employeeList = EMPLOYEE_LIST;
  public dataSource = new BehaviorSubject<IEmployee[]>([]);

  public search = '';
  public status = 'All';
  public sortKey = '';
  public sortDirection = 'asc';
  public itemsCount = 0;
  public itemsPerPage = 5;
  public currentPage = 1;

  private errorMessages = validations;
  private employeeId: number;

  public form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private exportService: ExportService
  ) {
    this.employeeList.map((employee: IEmployee) => {
      return {
        ...employee,
        edit: employee.edit ? employee.edit : false
      };
    });
  }

  get displayedColumns() {
    return this.columnList
      .filter(column => column.visible)
      .map(column => column.field);
  }

  ngOnInit(): void {
    if (localStorage.getItem(this.STORAGE_KEY)) {
      const preferences = JSON.parse(localStorage.getItem(this.STORAGE_KEY));

      this.columnList = this.columnList.map((column) => {
        const preference = preferences.find(data => data.field === column.field);

        if (preference) {
          column.visible = preference.visible;
        }

        return column;
      });
    }

    this.getEmployees();
  }

  getEmployees(): void {
    const items = this.employeeList
      .sort((x, y) => {
        if (x.id > y.id) {
          return -1;
        }
        return 1;
      })
      .filter((employee: IEmployee) => {
        let allowed = this.status === 'All' || employee.status === this.status;

        if (allowed && this.search) {
          const matches = employee.employee_name.toLocaleUpperCase().match(this.search.toLocaleUpperCase());
          allowed = matches && matches.length > 0;
        }

        return allowed;
      });

    if (this.sortKey) {
      items.sort((x, y) => {
        let xField;
        let yField;

        if (['employee_salary'].indexOf(this.sortKey) !== -1) {
          xField = x[this.sortKey];
          yField = y[this.sortKey];
        } else {
          xField = x[this.sortKey].toString().toLocaleUpperCase();
          yField = y[this.sortKey].toString().toLocaleUpperCase();
        }

        if (xField === yField) {
          return 0;
        }
        if (this.sortDirection === 'asc' && xField < yField) {
          return -1;
        }
        if (this.sortDirection === 'dsc' && xField > yField) {
          return -1;
        }

        return 1;
      });
    }

    this.itemsCount = items.length;
    const noOfRowsToDisplay = items.slice(
      this.itemsPerPage * (this.currentPage - 1),
      this.itemsPerPage * this.currentPage
    );

    this.dataSource.next(noOfRowsToDisplay);
    this.formInit(noOfRowsToDisplay);
  }

  doSort(field: string): void {
    if (field === this.sortKey) {
      this.sortDirection === 'asc' ? this.sortDirection = 'dsc' : this.sortDirection = 'asc';
    } else {
      this.sortKey = field;
      this.sortDirection = 'asc';
    }

    this.getEmployees();
  }

  persistColumnPreference(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.columnList));
  }

  pageChange(value: number): void {
    this.currentPage = value;
    this.getEmployees();
  }

  formInit(employeeList: IEmployee[]): void {
    this.form = this.fb.group({
      employeeList: this.fb.array(employeeList.map((employee: IEmployee) => {
        return this.fb.group({
          id: [employee.id],
          status: [employee.status || '',
            Validators.compose([
              Validators.required
            ])
          ],
          name: [employee.employee_name || '',
            Validators.compose([
              Validators.required,
              Validators.minLength(5),
              Validators.maxLength(32)
            ])
          ],
          salary: [employee.employee_salary || '',
            Validators.compose([
              Validators.required,
              Validators.min(0)
            ])
          ],
          email: [employee.employee_email || '',
            Validators.compose([
              Validators.required,
              Validators.pattern(/^[_a-zA-Z0-9]+(\.[_a-zA-Z0-9]+)*@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*(\.[a-zA-Z]{2,4})$/)
            ])
          ]
        });
      }))
    });
  }

  addEmployee(): void {
    const newControl: IEmployee = {
      id: this.employeeList[0].id + 1, // not required if you are integrating with backend.
      status: '',
      employee_name: '',
      employee_salary: null,
      employee_email: '',
      edit: true
    };

    this.employeeList.push(newControl);
    this.getEmployees();
  }

  saveEmployee(employee: IEmployee): void {
    const getIndex = this.employeeList.findIndex(data => data.id === employee.id);
    const employeeDetails = this.form.get('employeeList').get(getIndex.toString()).value;

    if (this.form.get('employeeList').get(getIndex.toString()).valid) {
      this.employeeList[getIndex].status = employeeDetails.status;
      this.employeeList[getIndex].employee_name = employeeDetails.name;
      this.employeeList[getIndex].employee_salary = employeeDetails.salary;
      this.employeeList[getIndex].employee_email = employeeDetails.email;

      this.employeeList[getIndex].edit = false;

      this.enableToaster('success', 'Successfully updated !!!');
    } else {
      this.enableToaster('error', 'Oops !!! Error occurred');

      Object.keys(this.form.controls['employeeList'].value['0']).forEach((field: string) => {
        const control = this.form.get('employeeList').get(getIndex.toString()).get(field);
        control.markAsDirty();
      });
    }
  }

  openModal(content: TemplateRef<any>, employeeId: number): void {
    this.employeeId = employeeId;
    this.modalService.open(content, {backdrop: 'static', centered: true});
  }

  deleteEmployee(): void {
    this.employeeList = this.employeeList.filter(employee => employee.id !== this.employeeId);
    this.getEmployees();
    this.enableToaster('success', 'Successfully deleted !!!');
  }

  cancelEditing(employee: IEmployee): void {
    const getIndex = this.employeeList.findIndex(data => data.id === employee.id);
    const fieldValidity = !!(
      this.employeeList[getIndex].status
      && this.employeeList[getIndex].employee_name
      && this.employeeList[getIndex].employee_salary
      && this.employeeList[getIndex].employee_email
    );

    if (fieldValidity) {
      employee.edit = false;
    } else {
      this.employeeList = this.employeeList.filter(data => data.id !== employee.id);
      employee.edit = false;
    }

    this.getEmployees();
  }

  getError(index: number, property: string, validations: string[]) {
    const control = this.form.get('employeeList').get(index.toString()).get(property);

    if (!control || !control.dirty || !control.errors) {
      return false;
    }

    for (const validation of validations) {
      if (control.errors[validation]) {
        return this.errorMessages[property][validation];
      }
    }

    return false;
  }

  enableToaster(status: string, message: string): void {
    const element = this.toast.nativeElement;

    element.innerText = message;

    if (status === 'success') {
      element.classList.add('label-success');
    }

    if (status === 'error') {
      element.classList.add('label-danger');
    }

    element.classList.add('show-toast');

    setTimeout(() => {
      element.classList.remove('show-toast', 'label-success', 'label-danger');
      element.innerText = '';
    }, 3000);
  }

  getRowList() {
    return this.dataSource.value.map((employee: IEmployee) => {
      return {
        status: employee.status,
        name: employee.employee_name,
        salary: employee.employee_salary,
        email: employee.employee_email
      };
    });
  }

  getHeaderList() {
    return this.columnList
      .filter(column => column.field !== 'action')
      .map(column => column.field);
  }

  downloadAsPdf(type: string): void {
    const rowList = this.getRowList();
    const headerList = this.getHeaderList();

    const pdfData = this.exportService.convertToPdf(rowList, headerList);

    if (type === 'download') {
      pdfData.save('employee_list.pdf');
    }

    if (type === 'print') {
      const file = pdfData.output('blob');
      const objectUrl = URL.createObjectURL(file);
      const iFrame: any = document.createElement('iframe');

      iFrame.style.display = 'none';
      iFrame.src = objectUrl;
      document.body.appendChild(iFrame);
      iFrame.contentWindow.print();
    }
  }

  downloadAsExcel(): void {
    const rowList = this.getRowList();
    const headerList = this.getHeaderList();

    const csvData = this.exportService.convertToCsv(rowList, headerList);

    const csvBlob = new Blob([csvData], {type: 'text/csv'});
    const objectUrl = URL.createObjectURL(csvBlob);
    const link: any = document.createElement('a');

    link.download = 'employee_list.csv';
    link.href = objectUrl;
    link.click();
  }

}

export const validations = {
  status: {
    required: 'Please provide status'
  },
  name: {
    required: 'Please provide name',
    minlength: 'Min length should be 5',
    maxlength: 'Max length should be 32'
  },
  salary: {
    required: 'Please provide salary',
    min: 'Salary can\'t be less than 0'
  },
  email: {
    required: 'Please provide email',
    pattern: 'Please provide valid email'
  }
};
