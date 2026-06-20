import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import html2pdf from 'html2pdf.js';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './invoice-print.component.html',
  styleUrls: ['./invoice-print.component.css']
})
export class InvoicePrintComponent implements OnInit {

  invoice: any = null;
  loading = true;
  @ViewChild('invoiceBox', { static: false }) invoiceBox!: ElementRef;

  constructor(
    private location: Location,
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const autoPrint = this.route.snapshot.queryParamMap.get('print') === '1';

    if (id) {
      this.api.get(`/sales/${id}`).subscribe({
        next: (res: any) => {
          this.invoice = res;
          this.loading = false;
          if (autoPrint) {
            setTimeout(() => window.print(), 1200);
          }
        },
        error: (err) => { console.error('Failed to load invoice', err); this.loading = false; }
      });
    } else {
      this.invoice = JSON.parse(localStorage.getItem('invoice') || '{}');
      this.loading = false;
    }
  }

  goBack() { this.location.back(); }

  print(): void {
    window.print();
  }

  downloadPDF() {
    const element = this.invoiceBox.nativeElement;
    const options = {
      margin: 0.5,
      filename: `invoice-${this.invoice.id}.pdf`,
      image: { type: <"jpeg">"jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait' as const
      }
    };
    html2pdf().from(element).set(options).save();
  }
}
