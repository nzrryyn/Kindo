"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './notif.module.css';

type IzinNotif = {
  id: number;
  studentId: string;
  studentName: string;
  kelas: string;
  type: 'izin' | 'sakit';
  alasan: string;
  date: string;
  read: boolean;
  timestamp: number;
};

type IzinRequest = {
  id: number;
  studentId: string;
  studentName: string;
  type: 'izin' | 'sakit';
  alasan: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
};

type AttendanceData = Record<string, string>;

export default function NotifPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [notifs, setNotifs] = useState<IzinNotif[]>([]);
  const [toastData, setToastData] = useState({ visible: false, message: '', isError: false });

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);
    loadNotifs();
    const interval = setInterval(loadNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifs = () => {
    const saved: IzinNotif[] = JSON.parse(localStorage.getItem('kindo_notif_izin') || '[]');
    setNotifs(saved);
    // Mark all as read
    const updated = saved.map(n => ({ ...n, read: true }));
    localStorage.setItem('kindo_notif_izin', JSON.stringify(updated));
  };

  const showToast = (msg: string, isError = false) => {
    setToastData({ visible: true, message: msg, isError });
    setTimeout(() => setToastData({ visible: false, message: '', isError: false }), 3000);
  };

  const getRequest = (notif: IzinNotif): IzinRequest | null => {
    const requests: IzinRequest[] = JSON.parse(localStorage.getItem('kindo_izin_requests') || '[]');
    return requests.find(r => r.id === notif.id) || null;
  };

  const getRequestStatus = (notif: IzinNotif): 'pending' | 'approved' | 'rejected' => {
    const req = getRequest(notif);
    return req?.status || 'pending';
  };

  const handleApprove = (notif: IzinNotif) => {
    // Update request status
    const requests: IzinRequest[] = JSON.parse(localStorage.getItem('kindo_izin_requests') || '[]');
    const updated = requests.map(r => r.id === notif.id ? { ...r, status: 'approved' as const } : r);
    localStorage.setItem('kindo_izin_requests', JSON.stringify(updated));

    // Update attendance
    const att: AttendanceData = JSON.parse(localStorage.getItem('kindo_attendance') || '{}');
    const key = `${notif.studentId}_${notif.date}`;
    att[key] = notif.type === 'izin' ? 'Izin' : 'Sakit';
    localStorage.setItem('kindo_attendance', JSON.stringify(att));

    // Refresh notifs
    setNotifs(prev => [...prev]); // trigger re-render
    showToast(`Izin ${notif.studentName} disetujui. Status absen diperbarui.`);
    loadNotifs();
  };

  const handleReject = (notif: IzinNotif) => {
    const requests: IzinRequest[] = JSON.parse(localStorage.getItem('kindo_izin_requests') || '[]');
    const updated = requests.map(r => r.id === notif.id ? { ...r, status: 'rejected' as const } : r);
    localStorage.setItem('kindo_izin_requests', JSON.stringify(updated));
    showToast(`Izin ${notif.studentName} ditolak.`, true);
    loadNotifs();
  };

  const handleClear = () => {
    localStorage.setItem('kindo_notif_izin', '[]');
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
          notifs.map(notif => {
            const status = getRequestStatus(notif);
            return (
              <div key={notif.id} className={`${styles.notifCard} ${!notif.read ? styles.notifUnread : ''}`}>
                {!notif.read && <div className={styles.unreadDot} />}

                {/* Icon */}
                <div className={styles.notifIcon} style={{
                  backgroundColor: notif.type === 'sakit' ? '#FFF4DC' : '#EEF3FF'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 18.86H17.24C16.44 18.86 15.68 19.17 15.12 19.73L13.41 21.42C12.63 22.19 11.36 22.19 10.58 21.42L8.87 19.73C8.31 19.17 7.54 18.86 6.75 18.86H6C4.34 18.86 3 17.53 3 15.89V4.97C3 3.33 4.34 2 6 2H18C19.66 2 21 3.33 21 4.97V15.88C21 17.52 19.66 18.86 18 18.86Z"
                      stroke={notif.type === 'sakit' ? '#A06B00' : '#3E71A3'} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.07 8.95C12.03 8.95 11.97 8.95 11.92 8.95C10.87 8.91 10.04 8.06 10.04 7C10.04 5.92 10.91 5.05 11.99 5.05C13.07 5.05 13.94 5.93 13.94 7C13.95 8.06 13.12 8.92 12.07 8.95Z"
                      stroke={notif.type === 'sakit' ? '#A06B00' : '#3E71A3'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9.25 11.96C7.92 12.85 7.92 14.3 9.25 15.19C10.76 16.2 13.24 16.2 14.75 15.19C16.08 14.3 16.08 12.85 14.75 11.96C13.24 10.96 10.77 10.96 9.25 11.96Z"
                      stroke={notif.type === 'sakit' ? '#A06B00' : '#3E71A3'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Info */}
                <div className={styles.notifBody}>
                  <div className={styles.notifTitle}>
                    <span className={styles.notifName}>{notif.studentName}</span>
                    {' '} mengajukan{' '}
                    <span className={notif.type === 'sakit' ? styles.tagSakit : styles.tagIzin}>
                      {notif.type}
                    </span>
                  </div>
                  <div className={styles.notifKelas}>{notif.kelas}</div>
                  <div className={styles.notifAlasan}>"{notif.alasan}"</div>
                  <div className={styles.notifDate}>{formatDate(notif.date)}</div>

                  {/* Status & Actions */}
                  {status === 'pending' ? (
                    <div className={styles.actionRow}>
                      <button className={styles.btnApprove} onClick={() => handleApprove(notif)}>✓ Setujui</button>
                      <button className={styles.btnReject} onClick={() => handleReject(notif)}>✗ Tolak</button>
                    </div>
                  ) : (
                    <div className={status === 'approved' ? styles.statusApproved : styles.statusRejected}>
                      {status === 'approved' ? '✓ Disetujui — absen otomatis diperbarui' : '✗ Ditolak'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toastData.visible && (
        <div className={`${styles.toast} ${toastData.isError ? styles.toastErr : ''}`}>
          {toastData.message}
        </div>
      )}
    </div>
  );
}