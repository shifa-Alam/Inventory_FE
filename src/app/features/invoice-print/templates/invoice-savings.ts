/** Total customer savings on an invoice: Σ (MRP − rate) × qty, over lines
 *  priced below their MRP. Shared by the invoice templates behind show_savings. */
export function invoiceSavings(invoice: any): number {
  const items: any[] = invoice?.items ?? [];
  return items.reduce((sum, it) => {
    const mrp = Number(it?.mrp) || 0;
    const rate = Number(it?.rate) || 0;
    const qty = Number(it?.quantity) || 0;
    return sum + (mrp > rate ? (mrp - rate) * qty : 0);
  }, 0);
}
