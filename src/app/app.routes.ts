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

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },

    { path: 'login', component: LoginComponent },

    {
        path: '',
        component: LayoutComponent,
        // canActivate: [AuthGuard],
        children: [
            { path: 'dashboard', component: DashboardComponent },
            { path: 'categories', component: CategoriesComponent },
            { path: 'products', component: ProductsComponent },
            { path: 'billing', component: SalesComponent },
            { path: 'customers', component: CustomersComponent },
            { path: 'purchase', component: PurchaseComponent },
            {
                path: 'sales',
                component: SalesListComponent
            },
            {
                path: 'invoice-print',
                component: InvoicePrintComponent
            },
            {
                path: 'suppliers',
                component: SuppliersComponent
            }
        ]
    }
];
