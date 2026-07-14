import { Type } from '@angular/core';
import { InvoiceTenant1Component } from './tenant-1.component';

/**
 * Per-tenant CUSTOM invoice templates.
 *
 * When a tenant needs a fully bespoke invoice layout (beyond the generic
 * classic/compact/thermal templates configured on the Tenants screen),
 * build a `tenant-<id>.component` next to this file and register it here.
 *
 * Resolution order in InvoicePrintComponent:
 *   1. TENANT_TEMPLATES[tenant_id]  → this custom component wins
 *   2. settings.invoice_template    → generic template from tenant config
 *
 * Every template receives the same inputs: [invoice] and [settings].
 */
export const TENANT_TEMPLATES: Record<number, Type<unknown>> = {
  1: InvoiceTenant1Component,   // Amira Traders — bespoke wholesale layout
};
