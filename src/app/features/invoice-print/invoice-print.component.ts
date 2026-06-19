import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import html2pdf from 'html2pdf.js';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './invoice-print.component.html',
  styleUrls: ['./invoice-print.component.css']
})
export class InvoicePrintComponent implements OnInit {

  invoice: any;
  @ViewChild('invoiceBox', { static: false }) invoiceBox!: ElementRef;

  constructor(private location: Location) {}

  ngOnInit() {
    this.invoice = JSON.parse(localStorage.getItem('invoice') || '{}');
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