import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth, homePathFor } from '../contexts/AuthContext';
import { countUnread } from '../services/notifications';

export default function NotificationBell({ light = false }) {
  const { profile } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // Dihitung ulang setiap pindah halaman dan setiap 60 detik.
  useEffect(() => {
    if (!profile) return undefined;
    let active = true;
    const load = () => countUnread(profile.id).then((n) => { if (active) setUnread(n); });
    load();
    const timer = setInterval(load, 60000);
    return () => { active = false; clearInterval(timer); };
  }, [profile, location.pathname]);

  if (!profile) return null;
  return (
    <Link to={`${homePathFor(profile.role)}/notifikasi`} aria-label={`Notifikasi, ${unread} belum dibaca`}
      className={`relative rounded-full p-2 ${light ? 'text-cream-100 hover:bg-white/10' : 'text-charcoal-600 hover:bg-cream-200'}`}>
      <Bell className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
