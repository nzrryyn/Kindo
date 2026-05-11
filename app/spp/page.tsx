"use client";

import { useState, useEffect } from 'react';
import styles from './sppguru.module.css';

// ─────────────────────────────
// TIPE
// ─────────────────────────────
type SiswaRecord = {
  id: string;
  name: string;
  kelas: string;
  sppRecords: SppRecord[];
};

type SppRecord = {
  id: string;
  siswaId: string;
  siswaName: string;
  bulan: string;
  tahun: string;
  nominal: number;
  jatuhTempo: string;
  lunas: boolean;
  lunasAt?: string;
  notifSent?: boolean;
};

type PayNotif = {
  id: number;
  siswaId: string;
  siswaName: string;
  bulan: string;
  nominal: number;
  timestamp: number;
  read: boolean;
};

// Dummy data siswa + SPP
const DUMMY_SPP: SppRecord[] = [
  { id: 'spp1', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'Mei', tahun: '2026', nominal: 500000, jatuhTempo: '31/5/2026', lunas: true },
  { id: 'spp2', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'April', tahun: '2026', nominal: 500000, jatuhTempo: '30/4/2026', lunas: true },
  { id: 'spp3', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'Maret', tahun: '2026', nominal: 500000, jatuhTempo: '31/3/2026', lunas: false },
  { id: 'spp4', siswaId: 'KelasA_2', siswaName: 'Siswa 2', bulan: 'Mei', tahun: '2026', nominal: 500000, jatuhTempo: '31/5/2026', lunas: false },
  { id: 'spp5', siswaId: 'KelasA_2', siswaName: 'Siswa 2', bulan: 'April', tahun: '2026', nominal: 500000, jatuhTempo: '30/4/2026', lunas: true },
];

interface Props {
  onClose: () => void;
  isDark: boolean;
}

export default function SppGuruPanel({ onClose, isDark }: Props) {
  const [records, setRecords] = useState<SppRecord[]>([]);
  const [selected, setSelected] = useState<SppRecord | null>(null);
  const [payNotifs, setPayNotifs] = useState<PayNotif[]>([]);
  const [toast, setToast] = useState({ visible: false, msg: '', err: false });
  const [filterBelum, setFilterBelum] = useState(false);

  useEffect(() => {
    // Load SPP records — merge dummy + any updates from localStorage
    const saved: SppRecord[] = JSON.parse(localStorage.getItem('kindo_spp_records') || 'null') || DUMMY_SPP;
    setRecords(saved);
    // Load pay notifs from ortu
    const pn: PayNotif[] = JSON.parse(localStorage.getItem('kindo_pay_notifs') || '[]');
    setPayNotifs(pn);
    // Check if any notif matches → mark as lunas
    const updatedRecords = saved.map(r => {
      const paid = pn.find(n => n.siswaId === r.siswaId && n.bulan === r.bulan && !r.lunas);
      if (paid) return { ...r, lunas: true, lunasAt: new Date(paid.timestamp).toLocaleDateString('id-ID') };
      return r;
    });
    setRecords(updatedRecords);
    localStorage.setItem('kindo_spp_records', JSON.stringify(updatedRecords));
  }, []);

  const showToast = (msg: string, err = false) => {
    setToast({ visible: true, msg, err });
    setTimeout(() => setToast({ visible: false, msg: '', err: false }), 3000);
  };

  const handleKirimPengingat = (rec: SppRecord) => {
    // Push notif izin ke sistem notif ortu
    const notifs = JSON.parse(localStorage.getItem('kindo_notif_spp_ortu') || '[]');
    notifs.unshift({
      id: Date.now(),
      siswaId: rec.siswaId,
      siswaName: rec.siswaName,
      bulan: rec.bulan,
      tahun: rec.tahun,
      nominal: rec.nominal,
      jatuhTempo: rec.jatuhTempo,
      timestamp: Date.now(),
      read: false,
    });
    localStorage.setItem('kindo_notif_spp_ortu', JSON.stringify(notifs));
    // Mark notifSent
    const updated = records.map(r => r.id === rec.id ? { ...r, notifSent: true } : r);
    setRecords(updated);
    localStorage.setItem('kindo_spp_records', JSON.stringify(updated));
    if (selected) setSelected({ ...selected, notifSent: true });
    showToast('Pengingat berhasil dikirim ke orang tua!');
  };

  // Mark pay notif as read
  const markPayNotifsRead = () => {
    const updated = payNotifs.map(n => ({ ...n, read: true }));
    setPayNotifs(updated);
    localStorage.setItem('kindo_pay_notifs', JSON.stringify(updated));
  };

  const unreadPay = payNotifs.filter(n => !n.read).length;
  const displayed = filterBelum ? records.filter(r => !r.lunas) : records;

  // Icon components
  const UserIcon = () => (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
      <path d="M10.502 10.4995C12.9182 10.4995 14.877 8.54076 14.877 6.12451C14.877 3.70827 12.9182 1.74951 10.502 1.74951C8.08571 1.74951 6.12695 3.70827 6.12695 6.12451C6.12695 8.54076 8.08571 10.4995 10.502 10.4995Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.98242 19.25C2.98242 15.8638 6.3512 13.125 10.4987 13.125" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.925 18.725C17.4714 18.725 18.725 17.4714 18.725 15.925C18.725 14.3786 17.4714 13.125 15.925 13.125C14.3786 13.125 13.125 14.3786 13.125 15.925C13.125 17.4714 14.3786 18.725 15.925 18.725Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.25 19.25L18.375 18.375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CalEditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none">
      <path d="M6.998 1.75V4.375" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.002 1.75V4.375" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.06 7.953H17.935" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.806 13.798L13.708 16.896C13.586 17.018 13.472 17.246 13.446 17.412L13.28 18.593C13.218 19.022 13.516 19.32 13.945 19.258L15.126 19.092C15.292 19.066 15.528 18.952 15.642 18.83L18.74 15.732C19.273 15.198 19.527 14.577 18.74 13.79C17.961 13.011 17.34 13.265 16.806 13.798Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 19.25H7C3.938 19.25 2.625 17.5 2.625 14.875V7.438C2.625 4.813 3.938 3.063 7 3.063H14C17.063 3.063 18.375 4.813 18.375 7.438V10.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const WarnIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 14.667C11.667 14.667 14.667 11.667 14.667 8C14.667 4.334 11.667 1.334 8 1.334C4.333 1.334 1.333 4.334 1.333 8C1.333 11.667 4.333 14.667 8 14.667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 5.334V8.667" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.996 10.667H8.002" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CalIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.995 13.7H12.005" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.294 13.7H8.303" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className={`${styles.overlay} ${isDark ? styles.dark : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.outerCard}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.title}>Tagihan SPP</div>
            {unreadPay > 0 && (
              <button className={styles.payNotifBadge} onClick={() => { markPayNotifsRead(); showToast(`${unreadPay} siswa telah membayar SPP.`); }}>
                🔔 {unreadPay} pembayaran baru
              </button>
            )}
          </div>
          <div className={styles.headerRight}>
            <button
              className={`${styles.filterBtn} ${filterBelum ? styles.filterActive : ''}`}
              onClick={() => setFilterBelum(p => !p)}
            >
              {filterBelum ? 'Semua' : 'Belum lunas'}
            </button>
            <button className={styles.btnClose} onClick={onClose}>✕</button>
          </div>
        </div>

        {selected ? (
          /* ── DETAIL TAGIHAN ── */
          <div className={styles.detailWrap}>
            <button className={styles.btnBack} onClick={() => setSelected(null)}>← Kembali</button>

            {/* Outer big card 423×320 */}
            <div className={styles.bigCard}>
              <div className={styles.bigCardTitle}>Tagihan SPP</div>
              <div className={styles.bigCardNominal}>Rp{selected.nominal.toLocaleString('id-ID')}</div>

              {/* Inner card 387×212 */}
              <div className={styles.innerCard}>
                <div className={styles.infoRow}>
                  <div className={styles.infoLabel}>
                    <span className={styles.infoIcon}><UserIcon /></span>
                    Nama siswa:
                  </div>
                  <span className={styles.infoVal}>{selected.siswaName}</span>
                </div>
                <div className={styles.infoRow}>
                  <div className={styles.infoLabel}>
                    <span className={styles.infoIcon}><CalEditIcon /></span>
                    Jatuh tempo:
                  </div>
                  <span className={styles.infoVal}>{selected.jatuhTempo}</span>
                </div>
                <div className={styles.infoRow}>
                  <div className={styles.infoLabel}>
                    <span className={styles.infoIcon}><WarnIcon /></span>
                    Status:
                  </div>
                  <span className={styles.infoVal} style={{ color: selected.lunas ? '#4CAF50' : '#FF4343', fontWeight: 600 }}>
                    {selected.lunas ? `Lunas${selected.lunasAt ? ` (${selected.lunasAt})` : ''}` : 'Belum lunas'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <div className={styles.infoLabel}>
                    <span className={styles.infoIcon}><CalIcon /></span>
                    Bulan:
                  </div>
                  <span className={styles.infoVal}>{selected.bulan}</span>
                </div>
              </div>

              {/* Tombol kuning — kirim pengingat */}
              {!selected.lunas && (
                <button
                  className={styles.btnPengingat}
                  onClick={() => handleKirimPengingat(selected)}
                  disabled={selected.notifSent}
                >
                  {selected.notifSent ? '✓ Pengingat terkirim' : 'Beri pengingat ke orang tua'}
                </button>
              )}
              {selected.lunas && (
                <div className={styles.lunasBadge}>✓ SPP bulan {selected.bulan} sudah lunas</div>
              )}
            </div>
          </div>
        ) : (
          /* ── DAFTAR TAGIHAN ── */
          <div className={styles.listWrap}>
            {displayed.length === 0 ? (
              <div className={styles.empty}>Semua SPP sudah lunas 🎉</div>
            ) : (
              displayed.map(rec => (
                <div key={rec.id} className={styles.listRow} onClick={() => setSelected(rec)}>
                  <div className={styles.listLeft}>
                    <div className={styles.listName}>{rec.siswaName}</div>
                    <div className={styles.listBulan}>{rec.bulan} {rec.tahun} · Rp{rec.nominal.toLocaleString('id-ID')}</div>
                  </div>
                  <div className={styles.listRight}>
                    <span className={rec.lunas ? styles.badgeLunas : styles.badgeBelum}>
                      {rec.lunas ? 'Lunas' : 'Belum'}
                    </span>
                    <span className={styles.chevron}>›</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {toast.visible && (
        <div className={`${styles.toast} ${toast.err ? styles.toastErr : ''}`}>{toast.msg}</div>
      )}
    </div>
  );
}