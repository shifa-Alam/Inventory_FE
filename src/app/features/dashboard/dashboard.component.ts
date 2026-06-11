import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  data: any = {};

  constructor(private api: ApiService) { }

  ngOnInit() {
    this.api.get('/dashboard').subscribe(res => {
      this.data = res;
    });
  }
}
