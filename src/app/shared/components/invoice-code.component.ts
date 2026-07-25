import {
  AfterViewInit, Component, ElementRef, Input, OnChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { QRCodeModule } from 'angularx-qrcode';
import JsBarcode from 'jsbarcode';

/**
 * Renders a scannable QR code or Code128 barcode for an invoice, used behind
 * the tenant's show_qr / show_barcode toggles. QR is drawn by angularx-qrcode;
 * the barcode by jsbarcode into an inline <svg> (crisp when printed).
 */
@Component({
  selector: 'app-invoice-code',
  standalone: true,
  imports: [CommonModule, QRCodeModule],
  template: `
    <qrcode *ngIf="type === 'qr' && value"
            [qrdata]="value" [width]="size" [margin]="0"
            errorCorrectionLevel="M" elementType="svg"
            cssClass="inv-code-qr"></qrcode>
    <svg *ngIf="type === 'barcode' && value" #bc class="inv-code-barcode"></svg>
  `,
  styles: [`
    :host { display: inline-block; line-height: 0; }
    .inv-code-barcode { max-width: 100%; }
  `],
})
export class InvoiceCodeComponent implements AfterViewInit, OnChanges {
  @Input() value = '';
  @Input() type: 'qr' | 'barcode' = 'qr';
  @Input() size = 96;
  @ViewChild('bc') bc?: ElementRef<SVGElement>;

  ngAfterViewInit(): void { this.renderBarcode(); }
  ngOnChanges(): void { this.renderBarcode(); }

  private renderBarcode(): void {
    if (this.type !== 'barcode' || !this.bc || !this.value) return;
    try {
      JsBarcode(this.bc.nativeElement, String(this.value), {
        format: 'CODE128',
        displayValue: true,
        fontSize: 12,
        height: 38,
        width: 1.4,
        margin: 0,
      });
    } catch {
      /* An unencodable value just renders nothing rather than throwing. */
    }
  }
}
