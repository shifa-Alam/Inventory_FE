import { Type } from '@angular/core';
import { PrintSaleInvoiceAt01Component } from './print-sale-invoice-at-01.component';
import { PrintSaleInvoiceUd01Component } from './print-sale-invoice-ud-01.component';

/**
 * Bespoke sale-invoice templates keyed by the tenant's unique CODE (not id).
 *
 * The code lives on the tenant record (set on the Tenants screen) and is
 * returned in the tenant settings. A tenant with code "at_01" prints with
 * PrintSaleInvoiceAt01Component (file: print-sale-invoice-at-01.component.*).
 *
 * Resolution order in InvoicePrintComponent:
 *   1. TENANT_TEMPLATES[settings.code]  → bespoke component wins
 *   2. settings.invoice_template        → generic template from tenant config
 *
 * To add one for another tenant: create print-sale-invoice-<code>.component.*
 * and register it here under that code.
 */
export const TENANT_TEMPLATES: Record<string, Type<unknown>> = {
  at_01: PrintSaleInvoiceAt01Component,   // Amira Traders
  ud_01: PrintSaleInvoiceUd01Component,   // Bangladesh commercial invoice
};
