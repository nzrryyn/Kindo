"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './notif.module.css';
import { supabase } from '@/lib/supabase';
import {
  fetchIzinRequests,
  updateIzinStatus,
  upsertAttendance,
  subscribeIzinRequests,
} from '@/lib/supabase';

type IzinNotif = {
  id: number;
  siswa_id: string;
  siswa_name: string;
  kelas?: string;
  type: 'izin' | 'sakit';
  alasan: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
};

export default function NotifPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [notifs, setNotifs] = useState<IzinNotif[]>([]);
  const [toastData, setToastData] = useState({ visible: false, message: '', isError: false });

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);

    loadNotifs();

    // Realtime: auto-refresh saat orang tua kirim izin baru
    const sub = subscribeIzinRequests(loadNotifs);
    return () => { supabase.removeChannel(sub); };
  }, []);

  const loadNotifs = async () => {
    const rows = await fetchIzinRequests();
    setNotifs(rows.map((r: any) => ({
      id: r.id,
      siswa_id: r.siswa_id,
      siswa_name: r.siswa_name,
      kelas: r.kelas,
      type: r.type,
      alasan: r.alasan,
      date: r.date,
      status: r.status ?? 'pending',
    })));
  };

  const showToast = (msg: string, isError = false) => {
    setToastData({ visible: true, message: msg, isError });
    setTimeout(() => setToastData({ visible: false, message: '', isError: false }), 3000);
  };

  const handleApprove = async (notif: IzinNotif) => {
    // Update status izin
    await updateIzinStatus(notif.id, 'approved');
    // Update absensi otomatis
    await upsertAttendance(notif.siswa_id, notif.date, notif.type === 'izin' ? 'Izin' : 'Sakit');
    // Update state lokal
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'approved' } : n));
    showToast(`Izin ${notif.siswa_name} disetujui. Status absen diperbarui.`);
  };

  const handleReject = async (notif: IzinNotif) => {
    await updateIzinStatus(notif.id, 'rejected');
    setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'rejected' } : n));
    showToast(`Izin ${notif.siswa_name} ditolak.`, true);
  };

  const handleClear = async () => {
    // Hapus semua dari Supabase
    await supabase.from('izin_requests').delete().neq('id', 0);
    setNotifs([]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.btnBack} onClick={() => router.back()}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div className={styles.headerTitle}>Notifikasi Izin</div>
        {notifs.length > 0 && (
          <button className={styles.btnClear} onClick={handleClear}>Hapus semua</button>
        )}
      </div>

      {/* Content */}
      <div className={styles.content}>
        {notifs.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔔</div>
            <div>Belum ada notifikasi izin.</div>
          </div>
        ) : (
          notifs.map(notif => (
            <div key={notif.id} className={`${styles.notifCard} ${notif.status === 'pending' ? styles.notifUnread : ''}`}>
              {notif.status === 'pending' && <div className={styles.unreadDot} />}

              {/* Icon */}
              <div className={styles.notifIcon} style={{ backgroundColor: notif.type === 'sakit' ? '#F8F7F2' : '#0F0F0F' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M18 18.86H17.24C16.44 18.86 15.68 19.17 15.12 19.73L13.41 21.42C12.63 22.19 11.36 22.19 10.58 21.42L8.87 19.73C8.31 19.17 7.54 18.86 6.75 18.86H6C4.34 18.86 3 17.53 3 15.89V4.97C3 3.33 4.34 2 6 2H18C19.66 2 21 3.33 21 4.97V15.88C21 17.52 19.66 18.86 18 18.86Z"
                    stroke="#F8F7F2" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12.07 8.95C12.03 8.95 11.97 8.95 11.92 8.95C10.87 8.91 10.04 8.06 10.04 7C10.04 5.92 10.91 5.05 11.99 5.05C13.07 5.05 13.94 5.93 13.94 7C13.95 8.06 13.12 8.92 12.07 8.95Z"
                    stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.25 11.96C7.92 12.85 7.92 14.3 9.25 15.19C10.76 16.2 13.24 16.2 14.75 15.19C16.08 14.3 16.08 12.85 14.75 11.96C13.24 10.96 10.77 10.96 9.25 11.96Z"
                    stroke="#F8F7F2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Info */}
              <div className={styles.notifBody}>
                <div className={styles.notifTitle}>
                  <span className={styles.notifName}>{notif.siswa_name}</span>
                  {' '} mengajukan{' '}
                  <span className={notif.type === 'sakit' ? styles.tagSakit : styles.tagIzin}>
                    {notif.type}
                  </span>
                </div>
                {notif.kelas && <div className={styles.notifKelas}>{notif.kelas}</div>}
                <div className={styles.notifAlasan}>"{notif.alasan}"</div>
                <div className={styles.notifDate}>{formatDate(notif.date)}</div>

                {notif.status === 'pending' ? (
                  <div className={styles.actionRow}>
                    <button className={styles.btnApprove} onClick={() => handleApprove(notif)}>✓ Setujui</button>
                    <button className={styles.btnReject} onClick={() => handleReject(notif)}>✗ Tolak</button>
                  </div>
                ) : (
                  <div className={notif.status === 'approved' ? styles.statusApproved : styles.statusRejected}>
                    {notif.status === 'approved' ? '✓ Disetujui — absen otomatis diperbarui' : '✗ Ditolak'}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toast */}
      {toastData.visible && (
        <div className={`${styles.toast} ${toastData.isError ? styles.toastErr : ''}`}>
          {toastData.message}
        </div>
      )}

      {/* NAVBAR */}
      <nav className={styles.bottomNavbar}>
        <div className={styles.navItem} onClick={() => router.push('/home')}>
          <Image src="/home.svg" alt="Home" width={24} height={24} />
        </div>
        <div className={`${styles.navItem} ${styles.navActive}`}>
          <Image src="/notif.svg" alt="Notif" width={24} height={24} />
        </div>
        <div className={styles.navItem} onClick={() => router.push('/spp')}>
          <Image src="/spp.svg" alt="SPP" width={24} height={24} />
        </div>
        <div className={styles.navItem} onClick={() => router.push('/user')}>
          <Image src="/user.svg" alt="User" width={24} height={24} />
        </div>
      </nav>
    </div>
  );
}