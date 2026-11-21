import { useNavigate } from 'react-router-dom';
import { BellOff, CheckCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listNotifications, markRead, markAllRead, deleteNotification } from '../../services/notifications';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import { tanggal } from '../../utils/format';

export default function Notifications() {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const state = useAsync(() => listNotifications(profile.id), [profile.id]);

  const run = async (action) => {
    try {
      await action();
      state.reload();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const open = async (notification) => {
    if (!notification.is_read) await markRead(notification.id).catch(() => {});
    if (notification.link) navigate(notification.link);
    else state.reload();
  };

  const unread = (state.data || []).filter((n) => !n.is_read).length;

  return (
    <>
      <PageHeader
        eyebrow="Kabar Terbaru"
        title="Notifikasi"
        description={unread ? `${unread} pemberitahuan belum dibaca.` : 'Semua pemberitahuan telah dibaca.'}
        actions={
          unread > 0 && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => markAllRead(profile.id))}>
              <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.5} />Tandai semua dibaca
            </button>
          )
        }
      />
      <DataState state={state}>
        {(notifications) => notifications.length === 0 ? (
          <EmptyState icon={BellOff} title="Belum ada notifikasi" description="Kabar tentang toko, pesanan, pembayaran, dan ulasan akan muncul di sini." />
        ) : (
          <ul className="card divide-y divide-cream-200">
            {notifications.map((notification) => (
              <li key={notification.id} className={`flex items-start gap-4 p-5 transition-colors hover:bg-cream-50/70 ${notification.is_read ? '' : 'bg-cream-50/60'}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-cream-300' : 'bg-clay-500'}`} aria-hidden="true" />
                <button type="button" onClick={() => open(notification)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={`text-sm ${notification.is_read ? 'font-normal text-charcoal' : 'font-medium text-charcoal'}`}>{notification.title}</p>
                    <p className="text-[11px] text-charcoal-400">{tanggal(notification.created_at, true)}</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-charcoal-600">{notification.message}</p>
                </button>
                <button type="button" aria-label="Hapus notifikasi" onClick={() => run(() => deleteNotification(notification.id))}
                  className="p-2 text-charcoal-400 transition-colors hover:bg-clay-50 hover:text-clay-600">
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </>
  );
}
