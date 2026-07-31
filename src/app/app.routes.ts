import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LoginComponent } from './features/login/login.component';
import { ProductsComponent } from './features/products/products.component';
import { ImportProductsComponent } from './features/import-products/import-products.component';
import { LayoutComponent } from './layout/layout.component';
import { SuppliersComponent } from './features/suppliers/suppliers.component';
import { CategoriesComponent } from './features/categories/categories.component';
import { UnitsComponent } from './features/units/units.component';
import { SalesComponent } from './features/sales/sales.component';
import { CustomersComponent } from './features/customers/customers.component';
import { PurchaseComponent } from './features/purchase/purchase.component';
import { SalesListComponent } from './features/sales-list/sales-list.component';
import { InvoicePrintComponent } from './features/invoice-print/invoice-print.component';
import { PurchaseHistoryComponent } from './features/purchase-history/purchase-history.component';
import { PurchaseViewComponent } from './features/purchase-view/purchase-view.component';
import { StockDashboardComponent } from './features/stock-dashboard/stock-dashboard.component';
import { SaleReturnComponent } from './features/sale-return/sale-return.component';
import { ProductWasteComponent } from './features/product-waste/product-waste.component';
import { StockCountComponent } from './features/stock-count/stock-count.component';
import { PurchaseReturnComponent } from './features/purchase-return/purchase-return.component';
import { StockLedgerComponent } from './features/stock-ledger/stock-ledger.component';
import { UsersComponent } from './features/users/users.component';
import { CustomerPaymentComponent } from './features/customer-payment/customer-payment.component';
import { SupplierPaymentComponent } from './features/supplier-payment/supplier-payment.component';
import { PaymentLedgerComponent } from './features/payment-ledger/payment-ledger.component';
import { OperatorSummaryComponent } from './features/operator-summary/operator-summary.component';
import { TenantsComponent } from './features/tenants/tenants.component';
import { ExpensesComponent } from './features/expenses/expenses.component';
import { ShiftComponent } from './features/shift/shift.component';
import { AgingComponent } from './features/aging/aging.component';
import { ProfitLossComponent } from './features/profit-loss/profit-loss.component';
import { NotificationSettingsComponent } from './features/notification-settings/notification-settings.component';
import { TenantSettingsComponent } from './features/tenant-settings/tenant-settings.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },

    { path: 'login', component: LoginComponent, canActivate: [guestGuard] },

    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: DashboardComponent },
            { path: 'categories', component: CategoriesComponent },
            { path: 'units', component: UnitsComponent },
            { path: 'products', component: ProductsComponent },
            { path: 'products/import', component: ImportProductsComponent },
            { path: 'billing', component: SalesComponent },
            { path: 'customers', component: CustomersComponent },
            { path: 'purchase', component: PurchaseComponent },
            { path: 'purchases', component: PurchaseHistoryComponent },
            { path: 'purchase/:id', component: PurchaseViewComponent },
            { path: 'sales', component: SalesListComponent },
            { path: 'invoice-print', component: InvoicePrintComponent },
            { path: 'invoice/:id', component: InvoicePrintComponent },
            { path: 'suppliers', component: SuppliersComponent },
            { path: 'stock', component: StockDashboardComponent },
            { path: 'sale-return', component: SaleReturnComponent },
            { path: 'product-waste', component: ProductWasteComponent },
            { path: 'stock-count', component: StockCountComponent },
            { path: 'purchase-return', component: PurchaseReturnComponent },
            { path: 'stock-ledger', component: StockLedgerComponent },
            { path: 'users', component: UsersComponent },
            { path: 'customer-payment', component: CustomerPaymentComponent },
            { path: 'supplier-payment', component: SupplierPaymentComponent },
            { path: 'payment-ledger', component: PaymentLedgerComponent },
            { path: 'operator-summary', component: OperatorSummaryComponent },
            { path: 'tenants', component: TenantsComponent },
            { path: 'expenses', component: ExpensesComponent },
            { path: 'shift', component: ShiftComponent },
            { path: 'aging', component: AgingComponent },
            { path: 'profit-loss', component: ProfitLossComponent },
            { path: 'notifications', component: NotificationSettingsComponent },
            { path: 'settings', component: TenantSettingsComponent }
        ]
    },

    // Catch-all: any unknown URL (stale bookmark, bad link) goes to the
    // dashboard instead of rendering a blank page. The auth guard on the
    // layout route bounces unauthenticated users to /login.
    { path: '**', redirectTo: 'dashboard' }
];
