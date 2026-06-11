import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.css']
})
export class SalesComponent implements OnInit {

  customers: any[] = [];
  products: any[] = [];

  customer_id: number = 0;
  paid_amount: number = 0;

  items: any[] = [
    { product_id: 0, quantity: 1, rate: 0, stock: 0 }
  ];

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.loadCustomers();
    this.loadProducts();
  }

  loadCustomers() {
    this.api.get('/customers/').subscribe((res: any) => {
      this.customers = res;
    });
  }

  loadProducts() {
    this.api.get('/products/').subscribe((res: any) => {
      this.products = res;
    });
  }

  onProductChange(item: any) {
    const product = this.products.find(p => p.id == item.product_id);
    if (product) {
      item.rate = product.sale_price;
      item.stock = product.current_stock;
    }
  }

  addRow() {
    this.items.push({ product_id: 0, quantity: 1, rate: 0, stock: 0 });
  }

  removeRow(i: number) {
    this.items.splice(i, 1);
  }

  getTotal(): number {
    return this.items.reduce((sum, i) => sum + (i.quantity * i.rate), 0);
  }

  submit() {

    const payload = {
      customer_id: this.customer_id,
      paid_amount: this.paid_amount,
      items: this.items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        rate: i.rate
      }))
    };

    this.api.post('/sales/', payload).subscribe(() => {
      alert('Sale Completed Successfully');

      this.customer_id = 0;
      this.paid_amount = 0;
      this.items = [{ product_id: 0, quantity: 1, rate: 0, stock: 0 }];
    });
  }
}