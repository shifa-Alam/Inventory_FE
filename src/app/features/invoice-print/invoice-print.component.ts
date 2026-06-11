import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import html2pdf from 'html2pdf.js';
@Component({
  selector: 'app-invoice-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-print.component.html',
  styleUrls: ['./invoice-print.component.css']
})
export class InvoicePrintComponent implements OnInit {

  invoice: any;
  @ViewChild('invoiceBox', { static: false }) invoiceBox!: ElementRef;
  ngOnInit() {
    this.invoice = JSON.parse(localStorage.getItem('invoice') || '{}');
  }

  // print(): void {

  //   const printContents =
  //     document.getElementById('invoice')?.innerHTML;

  //   if (!printContents) {
  //     alert('Invoice content not found');
  //     return;
  //   }

  //   const popupWindow = window.open(
  //     '',
  //     '_blank',
  //     'width=1000,height=800'
  //   );

  //   if (!popupWindow) {
  //     alert('Unable to open print window');
  //     return;
  //   }

  //   popupWindow.document.open();

  //   popupWindow.document.write(`
  //   <html>
  //     <head>
  //       <title>Invoice</title>

  //       <style>

  //         body{
  //           font-family: Arial, sans-serif;
  //           margin:20px;
  //           color:#000;
  //         }

  //         table{
  //           width:100%;
  //           border-collapse:collapse;
  //         }

  //         th,
  //         td{
  //           border:1px solid #ddd;
  //           padding:8px;
  //           text-align:left;
  //         }

  //         th{
  //           background:#f5f5f5;
  //         }

  //         .summary{
  //           width:300px;
  //           margin-left:auto;
  //           margin-top:20px;
  //         }

  //         .footer{
  //           margin-top:80px;
  //           display:flex;
  //           justify-content:space-between;
  //         }

  //         @page{
  //           size:A4;
  //           margin:10mm;
  //         }

  //       </style>
  //     </head>

  //     <body>

  //       ${printContents}

  //     </body>
  //   </html>
  // `);

  //   popupWindow.document.close();

  //   setTimeout(() => {
  //     popupWindow.focus();
  //     popupWindow.print();
  //     popupWindow.close();
  //   }, 500);
  // }
  print(): void {
    const printContent = document.getElementById('invoice-print-area');

    if (!printContent) return;

    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printContent.innerHTML;

    window.print();

    document.body.innerHTML = originalContents;

    window.location.reload();
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