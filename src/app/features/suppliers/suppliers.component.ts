import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.css']
})
export class SuppliersComponent implements OnInit {

  suppliers: any[] = [];

  newSupplier = {
    name: '',
    phone: '',
    address: '',
    opening_due: 0
  };

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get('/suppliers/').subscribe((res: any) => {
      this.suppliers = res;
    });
  }

  save() {
    this.api.post('/suppliers/', this.newSupplier).subscribe(() => {
      alert('Supplier Added');
      this.newSupplier = {
        name: '',
        phone: '',
        address: '',
        opening_due: 0
      };
      this.load();
    });
  }
}