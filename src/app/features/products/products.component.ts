import { Component, HostListener, OnInit } from '@angular/core';
import { AutofocusDirective } from '../../shared/directives/autofocus.directive';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslatePipe } from '@ngx-translate/core';
import { PaginatorComponent } from '../../shared/paginator/paginator.component';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmService } from '../../shared/services/confirm.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, PaginatorComponent, AutofocusDirective],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.css']
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  categories: any[] = [];
  loading = false;

  filterName = '';
  filterCategoryId = 0;
  filterStatus = '';
  filterActive = '';
  private filterTimer: any;

  page = 1;
  pages = 1;
  total = 0;
  pageSize = 20;

  showForm = false;

  /** Esc closes the open form modal — standard desktop expectation. */
  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.cancelForm(); }
  newProduct: any = this.blankProduct();

  /* ── Variant builder state ── */
  /** Template product whose variant panel is open (null = closed). */
  variantFor: any = null;
  existingVariants: any[] = [];
  variantTypes: any[] = [];
  /** Attribute axes being edited: name + comma-entered option chips. */
  vbAxes: { name: string; optionInput: string; options: string[] }[] = [];
  /** Generated grid rows, one per sellable variant. */
  variantRows: any[] = [];
  savingVariants = false;

  constructor(private api: ApiService, private toast: ToastService, private confirmSvc: ConfirmService) {}

  ngOnInit() {
    this.load();
    this.loadCategories();
  }

  load() {
    const params: string[] = [`page=${this.page}`, `page_size=${this.pageSize}`];
    if (this.filterName.trim()) params.push(`name=${encodeURIComponent(this.filterName.trim())}`);
    if (+this.filterCategoryId > 0) params.push(`category_id=${this.filterCategoryId}`);
    if (this.filterStatus) params.push(`status=${this.filterStatus}`);
    if (this.filterActive !== '') params.push(`is_active=${this.filterActive}`);

    this.loading = true;
    this.api.get(`/products/?${params.join('&')}`).subscribe({
      next: (res: any) => {
        this.products = res.data;
        this.total = res.total;
        this.pages = res.pages;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadCategories() {
    this.api.get('/categories/').subscribe({
      next: (res: any) => { this.categories = res.data ?? res; },
      error: () => {}
    });
  }

  applyFilter() { this.page = 1; this.load(); }
  onSearchInput() { clearTimeout(this.filterTimer); this.filterTimer = setTimeout(() => this.applyFilter(), 400); }
  clearFilter() { this.filterName = ''; this.filterCategoryId = 0; this.filterStatus = ''; this.filterActive = ''; this.applyFilter(); }
  onPageChange(p: number) { this.page = p; this.load(); }

  save() {
    if (!this.newProduct.name?.trim()) { this.toast.error('Product name is required'); return; }
    if (!+this.newProduct.category_id) { this.toast.error('Please select a category'); return; }
    this.newProduct.id ? this.update() : this.create();
  }

  create() {
    this.toast.startSaving();
    this.api.post('/products/', this.newProduct).subscribe({
      next: (created: any) => {
        this.toast.stopSaving(); this.toast.success('Product Added'); this.load(); this.reset();
        // A new template goes straight into the variant builder.
        if (created?.has_variants) this.openVariants(created);
      },
      error: (err: any) => { this.toast.stopSaving(); this.toast.error(err?.error?.detail || 'Failed to create product'); }
    });
  }

  update() {
    const { name, barcode, category_id, average_cost, sale_price, wholesale_price, mrp, minimum_stock } = this.newProduct;
    this.toast.startSaving();
    this.api.put(`/products/${this.newProduct.id}`, { name, barcode, category_id, average_cost, sale_price, wholesale_price, mrp, minimum_stock }).subscribe({
      next: () => { this.toast.stopSaving(); this.toast.success('Product Updated'); this.load(); this.reset(); },
      error: (err: any) => { this.toast.stopSaving(); this.toast.error(err?.error?.detail || 'Failed to update product'); }
    });
  }

  openAdd() { this.resetFields(); this.showForm = true; }
  cancelForm() { this.resetFields(); this.showForm = false; }
  edit(item: any) { this.newProduct = { ...item }; this.showForm = true; }

  toggleActive(p: any) {
    this.api.patch(`/products/${p.id}/toggle-active`, {}).subscribe({
      next: (res: any) => { p.is_active = res.is_active; },
      error: () => this.toast.error('Failed to update product status')
    });
  }

  async delete(id: number) {
    if (!await this.confirmSvc.open('Deactivate this product? It will be hidden and cannot be sold, but its history is kept.')) return;
    this.api.delete(`/products/${id}`).subscribe({
      next: () => this.load(),
      error: () => this.toast.error('Failed to delete product.')
    });
  }

  blankProduct() {
    return { id: 0, name: '', barcode: '', category_id: 0, average_cost: 0, sale_price: 0,
             wholesale_price: 0, mrp: 0, minimum_stock: 0, current_stock: 0, has_variants: false };
  }

  resetFields() { this.newProduct = this.blankProduct(); }

  reset() { this.cancelForm(); }

  /* ══════════════ Variant builder ══════════════ */

  openVariants(p: any) {
    this.variantFor = p;
    this.vbAxes = [{ name: '', optionInput: '', options: [] }];
    this.variantRows = [];
    this.existingVariants = [];
    this.api.get(`/products/${p.id}/variants`).subscribe({
      next: (res: any) => this.existingVariants = res,
      error: () => {}
    });
    this.api.get('/variants/types').subscribe({
      next: (res: any) => this.variantTypes = res,
      error: () => {}
    });
  }

  closeVariants() { this.variantFor = null; this.variantRows = []; }

  addAxis() { this.vbAxes.push({ name: '', optionInput: '', options: [] }); }
  removeAxis(i: number) { this.vbAxes.splice(i, 1); }

  addOption(axis: any) {
    const vals = (axis.optionInput || '').split(',').map((v: string) => v.trim()).filter(Boolean);
    for (const v of vals) if (!axis.options.includes(v)) axis.options.push(v);
    axis.optionInput = '';
  }
  removeOption(axis: any, opt: string) { axis.options = axis.options.filter((o: string) => o !== opt); }

  /** Cartesian product of every axis's options → one editable grid row each. */
  generateRows() {
    const axes = this.vbAxes.filter(a => a.name.trim() && a.options.length);
    if (!axes.length) { this.toast.error('Add at least one variant type with options'); return; }
    let combos: string[][] = [[]];
    for (const a of axes) combos = combos.flatMap(c => a.options.map(o => [...c, o]));
    const existing = new Set(this.existingVariants.map(v => v.variant_name));
    this.variantRows = combos
      .map(c => c.join(' '))
      .filter(name => !existing.has(name))
      .map(name => ({
        variant_name: name, barcode: '',
        average_cost: 0, sale_price: 0, wholesale_price: 0, mrp: 0,
        current_stock: 0, minimum_stock: 0, _axes: axes.map((a, i) => ({ type: a.name, value: name.split(' ')[i] }))
      }));
    if (!this.variantRows.length) this.toast.error('All combinations already exist');
  }

  removeRow(i: number) { this.variantRows.splice(i, 1); }

  /** Ensure types/options exist on the server, then create the variant rows. */
  saveVariants() {
    if (!this.variantRows.length || this.savingVariants) return;
    this.savingVariants = true;
    const axes = this.vbAxes.filter(a => a.name.trim() && a.options.length);

    const ensureType = async (name: string): Promise<any> => {
      const found = this.variantTypes.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (found) return found;
      const created: any = await this.api.post('/variants/types', { name }).toPromise();
      this.variantTypes.push(created);
      return created;
    };

    (async () => {
      try {
        // type name → { option value → option id }
        const optionIds: Record<string, Record<string, number>> = {};
        for (const a of axes) {
          const t = await ensureType(a.name.trim());
          const opts: any[] = await this.api.get(`/variants/options?variant_type_id=${t.id}`).toPromise() as any;
          optionIds[a.name] = {};
          for (const v of a.options) {
            const found = opts.find(o => o.value.toLowerCase() === v.toLowerCase());
            const opt = found ?? await this.api.post('/variants/options', { variant_type_id: t.id, value: v }).toPromise() as any;
            optionIds[a.name][v] = opt.id;
          }
        }
        const payload = {
          variants: this.variantRows.map(r => ({
            variant_name: r.variant_name,
            option_ids: (r._axes || []).map((x: any) => optionIds[x.type]?.[x.value]).filter(Boolean),
            barcode: r.barcode || null,
            average_cost: +r.average_cost || 0, sale_price: +r.sale_price || 0,
            wholesale_price: +r.wholesale_price || 0, mrp: +r.mrp || 0,
            current_stock: +r.current_stock || 0, minimum_stock: +r.minimum_stock || 0,
          }))
        };
        const created: any = await this.api.post(`/products/${this.variantFor.id}/variants`, payload).toPromise();
        this.toast.success(`${created.length} variant(s) created`);
        this.existingVariants = [...this.existingVariants, ...created];
        this.variantRows = [];
        this.variantFor.has_variants = true;
        this.load();
      } catch (err: any) {
        this.toast.error(err?.error?.detail || 'Failed to save variants');
      } finally {
        this.savingVariants = false;
      }
    })();
  }
}
