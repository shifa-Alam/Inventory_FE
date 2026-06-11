import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-sales-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-list.component.html',
  styleUrls: ['./sales-list.component.css']
})
export class SalesListComponent implements OnInit {

  sales: any[] = [];

  constructor(
    private api: ApiService,
    private router: Router
  ) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get('/sales/').subscribe((res: any) => {
      this.sales = res;
    });
  }

  viewInvoice(sale: any) {
    localStorage.setItem('invoice', JSON.stringify(sale));
    this.router.navigate(['/invoice-print']);
  }
}