import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.css']
})
export class CustomersComponent implements OnInit {

  customers: any[] = [];

  newCustomer = {
    name: '',
    phone: '',
    address: '',
    credit_limit: 0,
    current_due: 0
  };

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get('/customers/').subscribe((res: any) => {
      this.customers = res;
    });
  }

  save() {
    this.api.post('/customers/', this.newCustomer).subscribe(() => {
      alert('Customer Added');

      this.newCustomer = {
        name: '',
        phone: '',
        address: '',
        credit_limit: 0,
        current_due: 0
      };

      this.load();
    });
  }
}