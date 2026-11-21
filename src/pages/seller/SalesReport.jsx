import SalesReportView from '../../components/SalesReportView';
import { getSalesReport } from '../../services/seller';

export default function SellerSalesReport() {
  return (
    <SalesReportView title="Laporan penjualan" fetchReport={getSalesReport}
      description="Riwayat penjualan toko, komisi marketplace, dan pendapatan bersih Anda." />
  );
}
