import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {

  categories: any[] = [];

  newCategory = {
    name: ''
  };

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get('/categories/').subscribe((res: any) => {
      this.categories = res;
    });
  }

  save() {
    this.api.post('/categories/', this.newCategory).subscribe(() => {
      alert('Category Added');
      this.newCategory.name = '';
      this.load();
    });
  }
}