import SalesReportView from '../../components/SalesReportView';
import { getSalesReport } from '../../services/admin';

export default function AdminSalesReport() {
  return (
    <SalesReportView title="Laporan penjualan" fetchReport={getSalesReport} showStores
      description="Penjualan seluruh toko berdasarkan pesanan yang sudah dibayar." />
  );
}
