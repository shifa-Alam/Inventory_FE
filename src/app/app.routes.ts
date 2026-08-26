import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

// Every leaf route is lazy: each feature component ships in its own chunk,
// fetched only when that route is visited, instead of all ~30 screens
// weighing down the initial bundle.
export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },

    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
    },

    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
            { path: 'categories', loadComponent: () => import('./features/categories/categories.component').then(m => m.CategoriesComponent) },
            { path: 'units', loadComponent: () => import('./features/units/units.component').then(m => m.UnitsComponent) },
            { path: 'products', loadComponent: () => import('./features/products/products.component').then(m => m.ProductsComponent) },
            { path: 'products/import', loadComponent: () => import('./features/import-products/import-products.component').then(m => m.ImportProductsComponent) },
            { path: 'billing', loadComponent: () => import('./features/sales/sales.component').then(m => m.SalesComponent) },
            { path: 'customers', loadComponent: () => import('./features/customers/customers.component').then(m => m.CustomersComponent) },
            { path: 'purchase', loadComponent: () => import('./features/purchase/purchase.component').then(m => m.PurchaseComponent) },
            { path: 'purchases', loadComponent: () => import('./features/purchase-history/purchase-history.component').then(m => m.PurchaseHistoryComponent) },
            { path: 'purchase/:id', loadComponent: () => import('./features/purchase-view/purchase-view.component').then(m => m.PurchaseViewComponent) },
            { path: 'sales', loadComponent: () => import('./features/sales-list/sales-list.component').then(m => m.SalesListComponent) },
            { path: 'invoice-print', loadComponent: () => import('./features/invoice-print/invoice-print.component').then(m => m.InvoicePrintComponent) },
            { path: 'invoice/:id', loadComponent: () => import('./features/invoice-print/invoice-print.component').then(m => m.InvoicePrintComponent) },
            { path: 'suppliers', loadComponent: () => import('./features/suppliers/suppliers.component').then(m => m.SuppliersComponent) },
            { path: 'stock', loadComponent: () => import('./features/stock-dashboard/stock-dashboard.component').then(m => m.StockDashboardComponent) },
            { path: 'sale-return', loadComponent: () => import('./features/sale-return/sale-return.component').then(m => m.SaleReturnComponent) },
            { path: 'product-waste', loadComponent: () => import('./features/product-waste/product-waste.component').then(m => m.ProductWasteComponent) },
            { path: 'stock-count', loadComponent: () => import('./features/stock-count/stock-count.component').then(m => m.StockCountComponent) },
            { path: 'purchase-return', loadComponent: () => import('./features/purchase-return/purchase-return.component').then(m => m.PurchaseReturnComponent) },
            { path: 'stock-ledger', loadComponent: () => import('./features/stock-ledger/stock-ledger.component').then(m => m.StockLedgerComponent) },
            { path: 'users', loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent) },
            { path: 'customer-payment', loadComponent: () => import('./features/customer-payment/customer-payment.component').then(m => m.CustomerPaymentComponent) },
            { path: 'supplier-payment', loadComponent: () => import('./features/supplier-payment/supplier-payment.component').then(m => m.SupplierPaymentComponent) },
            { path: 'payment-ledger', loadComponent: () => import('./features/payment-ledger/payment-ledger.component').then(m => m.PaymentLedgerComponent) },
            { path: 'operator-summary', loadComponent: () => import('./features/operator-summary/operator-summary.component').then(m => m.OperatorSummaryComponent) },
            { path: 'tenants', loadComponent: () => import('./features/tenants/tenants.component').then(m => m.TenantsComponent) },
            { path: 'expenses', loadComponent: () => import('./features/expenses/expenses.component').then(m => m.ExpensesComponent) },
            { path: 'shift', loadComponent: () => import('./features/shift/shift.component').then(m => m.ShiftComponent) },
            { path: 'aging', loadComponent: () => import('./features/aging/aging.component').then(m => m.AgingComponent) },
            { path: 'profit-loss', loadComponent: () => import('./features/profit-loss/profit-loss.component').then(m => m.ProfitLossComponent) },
            { path: 'notifications', loadComponent: () => import('./features/notification-settings/notification-settings.component').then(m => m.NotificationSettingsComponent) },
            { path: 'settings', loadComponent: () => import('./features/tenant-settings/tenant-settings.component').then(m => m.TenantSettingsComponent) },
        ]
    },

    // Catch-all: any unknown URL (stale bookmark, bad link) goes to the
    // dashboard instead of rendering a blank page. The auth guard on the
    // layout route bounces unauthenticated users to /login.
    { path: '**', redirectTo: 'dashboard' }
];
