import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { LoginComponent } from './features/login/login.component';
import { ProductsComponent } from './features/products/products.component';
import { LayoutComponent } from './layout/layout.component';
import { SuppliersComponent } from './features/suppliers/suppliers.component';
import { CategoriesComponent } from './features/categories/categories.component';
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
import { StockLedgerComponent } from './features/stock-ledger/stock-ledger.component';
import { UsersComponent } from './features/users/users.component';
import { CustomerPaymentComponent } from './features/customer-payment/customer-payment.component';
import { PaymentLedgerComponent } from './features/payment-ledger/payment-ledger.component';
import { OperatorSummaryComponent } from './features/operator-summary/operator-summary.component';
import { TenantsComponent } from './features/tenants/tenants.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },

    { path: 'login', component: LoginComponent },

    {
        path: '',
        component: LayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: 'dashboard', component: DashboardComponent },
            { path: 'categories', component: CategoriesComponent },
            { path: 'products', component: ProductsComponent },
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
            { path: 'stock-ledger', component: StockLedgerComponent },
            { path: 'users', component: UsersComponent },
            { path: 'customer-payment', component: CustomerPaymentComponent },
            { path: 'payment-ledger', component: PaymentLedgerComponent },
            { path: 'operator-summary', component: OperatorSummaryComponent },
            { path: 'tenants', component: TenantsComponent }
        ]
    }
];
