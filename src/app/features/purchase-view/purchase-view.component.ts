import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { ApiService } from '../../core/services/api.service';


@Component({
  selector: 'app-purchase-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './purchase-view.component.html',
  styleUrl: './purchase-view.component.css'
})
export class PurchaseViewComponent {

  purchase: any;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    public location: Location
  ) { }

  ngOnInit() {
    this.loadPurchase();
  }

  loadPurchase() {

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) return;

    this.api.get(`/purchases/${id}`)
      .subscribe({
        next: (res: any) => {
          this.purchase = res;
        },
        error: (err) => {
          console.error('Error loading purchase', err);
        }
      });

  }

  print() {
    window.print();
  }
}