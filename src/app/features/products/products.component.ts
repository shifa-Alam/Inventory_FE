import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {

  products: any[] = [];
  categories: any[] = [];

  newProduct = {
    name: '',
    sku: '',
    category_id: 0,
    purchase_price: 0,
    sale_price: 0,
    current_stock: 0
  };

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.load();
    this.loadCategories();
  }

  load() {
    this.api.get('/products/').subscribe((res: any) => {
      this.products = res;
    });
  }
  loadCategories() {
    this.api.get('/categories/').subscribe((res: any) => {
      this.categories = res;
    });
  }
  save() {
    this.api.post('/products/', this.newProduct).subscribe(() => {
      alert('Product Added');
      this.newProduct = {
        name: '',
        sku: '',
        category_id: 0,
        purchase_price: 0,
        sale_price: 0,
        current_stock: 0
      };
      this.load();
    });
  }
}