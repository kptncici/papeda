import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import { GuestOnly, RequireActiveStore, RequireRole } from './guards';
import { PageLoader } from '../components/ui/Feedback';

const Home = lazy(() => import('../pages/public/Home'));
const Catalog = lazy(() => import('../pages/public/Catalog'));
const Categories = lazy(() => import('../pages/public/Categories'));
const ProductDetail = lazy(() => import('../pages/public/ProductDetail'));
const StoreProfile = lazy(() => import('../pages/public/StoreProfile'));
const About = lazy(() => import('../pages/public/About'));
const Contact = lazy(() => import('../pages/public/Contact'));
const Login = lazy(() => import('../pages/public/Login'));
const Register = lazy(() => import('../pages/public/Register'));
const ForgotPassword = lazy(() => import('../pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/public/ResetPassword'));
const NotFound = lazy(() => import('../pages/public/NotFound'));

const Profile = lazy(() => import('../pages/shared/Profile'));
const Notifications = lazy(() => import('../pages/shared/Notifications'));

const BuyerDashboard = lazy(() => import('../pages/buyer/Dashboard'));
const Cart = lazy(() => import('../pages/buyer/Cart'));
const Checkout = lazy(() => import('../pages/buyer/Checkout'));
const Payment = lazy(() => import('../pages/buyer/Payment'));
const BuyerOrders = lazy(() => import('../pages/buyer/Orders'));
const BuyerOrderDetail = lazy(() => import('../pages/buyer/OrderDetail'));
const Addresses = lazy(() => import('../pages/buyer/Addresses'));
const Reviews = lazy(() => import('../pages/buyer/Reviews'));

const SellerDashboard = lazy(() => import('../pages/seller/Dashboard'));
const StoreApplication = lazy(() => import('../pages/seller/StoreApplication'));
const SellerStoreProfile = lazy(() => import('../pages/seller/StoreProfile'));
const StoreSettings = lazy(() => import('../pages/seller/StoreSettings'));
const SellerProducts = lazy(() => import('../pages/seller/Products'));
const ProductForm = lazy(() => import('../pages/seller/ProductForm'));
const SellerOrders = lazy(() => import('../pages/seller/Orders'));
const SellerOrderDetail = lazy(() => import('../pages/seller/OrderDetail'));
const SellerSalesReport = lazy(() => import('../pages/seller/SalesReport'));

const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('../pages/admin/Users'));
const AdminStores = lazy(() => import('../pages/admin/Stores'));
const AdminCategories = lazy(() => import('../pages/admin/Categories'));
const AdminProducts = lazy(() => import('../pages/admin/Products'));
const AdminTransactions = lazy(() => import('../pages/admin/Transactions'));
const AdminOrders = lazy(() => import('../pages/admin/Orders'));
const AdminSalesReport = lazy(() => import('../pages/admin/SalesReport'));
const AdminCommissionReport = lazy(() => import('../pages/admin/CommissionReport'));
const AdminLogs = lazy(() => import('../pages/admin/ActivityLogs'));
const AdminSettings = lazy(() => import('../pages/admin/Settings'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader label="Memuat halaman" />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="produk" element={<Catalog />} />
          <Route path="produk/:id" element={<ProductDetail />} />
          <Route path="kategori" element={<Categories />} />
          <Route path="kategori/:slug" element={<Catalog />} />
          <Route path="toko/:id" element={<StoreProfile />} />
          <Route path="tentang" element={<About />} />
          <Route path="kontak" element={<Contact />} />
          <Route element={<GuestOnly />}>
            <Route path="masuk" element={<Login />} />
            <Route path="daftar" element={<Register />} />
            <Route path="lupa-sandi" element={<ForgotPassword />} />
          </Route>
          <Route path="atur-ulang-sandi" element={<ResetPassword />} />
          <Route element={<RequireRole roles={['buyer']} />}>
            <Route path="keranjang" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="pembayaran/:orderId" element={<Payment />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<RequireRole roles={['buyer']} />}>
          <Route path="akun" element={<DashboardLayout />}>
            <Route index element={<BuyerDashboard />} />
            <Route path="pesanan" element={<BuyerOrders />} />
            <Route path="pesanan/:id" element={<BuyerOrderDetail />} />
            <Route path="ulasan" element={<Reviews />} />
            <Route path="alamat" element={<Addresses />} />
            <Route path="notifikasi" element={<Notifications />} />
            <Route path="profil" element={<Profile />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['seller']} />}>
          <Route path="seller" element={<DashboardLayout />}>
            <Route path="pengajuan" element={<StoreApplication />} />
            <Route path="notifikasi" element={<Notifications />} />
            <Route path="profil" element={<Profile />} />
            <Route element={<RequireActiveStore />}>
              <Route index element={<SellerDashboard />} />
              <Route path="toko" element={<SellerStoreProfile />} />
              <Route path="pengaturan" element={<StoreSettings />} />
              <Route path="produk" element={<SellerProducts />} />
              <Route path="produk/tambah" element={<ProductForm />} />
              <Route path="produk/:id/edit" element={<ProductForm />} />
              <Route path="pesanan" element={<SellerOrders />} />
              <Route path="pesanan/:id" element={<SellerOrderDetail />} />
              <Route path="laporan" element={<SellerSalesReport />} />
            </Route>
          </Route>
        </Route>

        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="pengguna" element={<AdminUsers />} />
            <Route path="toko" element={<AdminStores />} />
            <Route path="kategori" element={<AdminCategories />} />
            <Route path="produk" element={<AdminProducts />} />
            <Route path="transaksi" element={<AdminTransactions />} />
            <Route path="pesanan" element={<AdminOrders />} />
            <Route path="laporan-penjualan" element={<AdminSalesReport />} />
            <Route path="laporan-komisi" element={<AdminCommissionReport />} />
            <Route path="log" element={<AdminLogs />} />
            <Route path="pengaturan" element={<AdminSettings />} />
            <Route path="notifikasi" element={<Notifications />} />
            <Route path="profil" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
