"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './sppguru.module.css';

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

const DUMMY_SPP: SppRecord[] = [
  { id: 'spp1', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'Mei', tahun: '2026', nominal: 500000, jatuhTempo: '31/5/2026', lunas: true },
  { id: 'spp2', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'April', tahun: '2026', nominal: 500000, jatuhTempo: '30/4/2026', lunas: true },
  { id: 'spp3', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'Maret', tahun: '2026', nominal: 500000, jatuhTempo: '31/3/2026', lunas: false },
  { id: 'spp4', siswaId: 'KelasA_2', siswaName: 'Siswa 2', bulan: 'Mei', tahun: '2026', nominal: 500000, jatuhTempo: '31/5/2026', lunas: false },
  { id: 'spp5', siswaId: 'KelasA_2', siswaName: 'Siswa 2', bulan: 'April', tahun: '2026', nominal: 500000, jatuhTempo: '30/4/2026', lunas: true },
];

export default function SppGuruPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [records, setRecords] = useState<SppRecord[]>([]);
  const [selected, setSelected] = useState<SppRecord | null>(null);
  const [editJatuhTempo, setEditJatuhTempo] = useState('');
  const [editBulan, setEditBulan] = useState('');
  const [payNotifs, setPayNotifs] = useState<PayNotif[]>([]);
  const [filterBelum, setFilterBelum] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '', err: false });

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);
    loadAll();
  }, []);

  const loadAll = () => {
    const saved: SppRecord[] = JSON.parse(localStorage.getItem('kindo_spp_records') || 'null') || DUMMY_SPP;
    const pn: PayNotif[] = JSON.parse(localStorage.getItem('kindo_pay_notifs') || '[]');
    // Merge pay notifs → update lunas
    const merged = saved.map(r => {
      const paid = pn.find(n => n.siswaId === r.siswaId && n.bulan === r.bulan && !r.lunas);
      if (paid) return { ...r, lunas: true, lunasAt: new Date(paid.timestamp).toLocaleDateString('id-ID') };
      return r;
    });
    setRecords(merged);
    localStorage.setItem('kindo_spp_records', JSON.stringify(merged));
    setPayNotifs(pn);
  };

  const showToast = (msg: string, err = false) => {
    setToast({ visible: true, msg, err });
    setTimeout(() => setToast({ visible: false, msg: '', err: false }), 3000);
  };

  const handleSelect = (rec: SppRecord) => {
    setSelected(rec);
    // Konversi jatuhTempo (dd/mm/yyyy) → format input date (yyyy-mm-dd)
    const parts = rec.jatuhTempo.split('/');
    if (parts.length === 3) {
      setEditJatuhTempo(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
    } else {
      setEditJatuhTempo('');
    }
    setEditBulan(rec.bulan);
  };

  const handleSaveEdit = () => {
    if (!selected) return;
    // Format tanggal kembali ke dd/mm/yyyy
    let jatuhTempoFormatted = selected.jatuhTempo;
    if (editJatuhTempo) {
      const d = new Date(editJatuhTempo);
      jatuhTempoFormatted = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    }
    const updated = records.map(r =>
      r.id === selected.id
        ? { ...r, jatuhTempo: jatuhTempoFormatted, bulan: editBulan }
        : r
    );
    setRecords(updated);
    localStorage.setItem('kindo_spp_records', JSON.stringify(updated));
    setSelected({ ...selected, jatuhTempo: jatuhTempoFormatted, bulan: editBulan });
    showToast('Perubahan disimpan!');
  };

  const handleKirimPengingat = (rec: SppRecord) => {
    const notifs = JSON.parse(localStorage.getItem('kindo_notif_spp_ortu') || '[]');
    notifs.unshift({
      id: Date.now(), siswaId: rec.siswaId, siswaName: rec.siswaName,
      bulan: rec.bulan, tahun: rec.tahun, nominal: rec.nominal,
      jatuhTempo: rec.jatuhTempo, timestamp: Date.now(), read: false,
    });
    localStorage.setItem('kindo_notif_spp_ortu', JSON.stringify(notifs));
    const updated = records.map(r => r.id === rec.id ? { ...r, notifSent: true } : r);
    setRecords(updated);
    localStorage.setItem('kindo_spp_records', JSON.stringify(updated));
    if (selected) setSelected({ ...selected, notifSent: true });
    showToast('Pengingat berhasil dikirim ke orang tua!');
  };

  const markPayNotifsRead = () => {
    const updated = payNotifs.map(n => ({ ...n, read: true }));
    setPayNotifs(updated);
    localStorage.setItem('kindo_pay_notifs', JSON.stringify(updated));
  };

  const unreadPay = payNotifs.filter(n => !n.read).length;
  const displayed = filterBelum ? records.filter(r => !r.lunas) : records;

  // Inline SVG icons
  const UserSearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none" style={{ color: '#A8A8A8' }}>
      <path d="M10.502 10.5C12.918 10.5 14.877 8.541 14.877 6.125C14.877 3.708 12.918 1.75 10.502 1.75C8.086 1.75 6.127 3.708 6.127 6.125C6.127 8.541 8.086 10.5 10.502 10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.982 19.25C2.982 15.864 6.351 13.125 10.499 13.125" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.925 18.725C17.471 18.725 18.725 17.471 18.725 15.925C18.725 14.379 17.471 13.125 15.925 13.125C14.379 13.125 13.125 14.379 13.125 15.925C13.125 17.471 14.379 18.725 15.925 18.725Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.25 19.25L18.375 18.375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CalEditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 21 21" fill="none" style={{ color: '#A8A8A8' }}>
      <path d="M7 1.75V4.375M14 1.75V4.375M3.06 7.953H17.935" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.806 13.798L13.708 16.896C13.586 17.018 13.472 17.246 13.446 17.412L13.28 18.593C13.218 19.022 13.516 19.32 13.945 19.258L15.126 19.092C15.292 19.066 15.528 18.952 15.642 18.83L18.74 15.732C19.273 15.198 19.527 14.577 18.74 13.79C17.961 13.011 17.34 13.265 16.806 13.798Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.5 19.25H7C3.938 19.25 2.625 17.5 2.625 14.875V7.438C2.625 4.813 3.938 3.063 7 3.063H14C17.063 3.063 18.375 4.813 18.375 7.438V10.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CalIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#A8A8A8' }}>
      <path d="M8 2V5M16 2V5M3.5 9.09H20.5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>

      {/* ── CONTENT ── */}
      <div className={styles.content}>
        {selected ? (
          /* ────── DETAIL VIEW ────── */
          <>
            <button className={styles.btnBack} onClick={() => setSelected(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Kembali
            </button>

            {/* Outer card 423×320 bg #A8A8A8 r30 */}
            <div className={styles.outerCard}>
              <div className={styles.outerCardTop}>
                <div className={styles.outerCardLabel}>Tagihan SPP</div>
                <div className={styles.outerCardNominal}>
                  Rp{selected.nominal.toLocaleString('id-ID')}
                </div>
              </div>

              {/* Inner card 387×212 bg white r20 */}
              <div className={styles.innerCard}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><UserSearchIcon /> Nama siswa:</span>
                  <span className={styles.infoVal}>{selected.siswaName}</span>
                </div>

                {/* Jatuh tempo — editable date */}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><CalEditIcon /> Jatuh tempo:</span>
                  <div className={styles.editInputWrap}>
                    <input
                      type="date"
                      className={styles.editInput}
                      value={editJatuhTempo}
                      onChange={e => setEditJatuhTempo(e.target.value)}
                    />
                  </div>
                </div>

                {/* Bulan — editable select */}
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><CalIcon /> Bulan:</span>
                  <select
                    className={styles.editSelect}
                    value={editBulan}
                    onChange={e => setEditBulan(e.target.value)}
                  >
                    {['Januari','Februari','Maret','April','Mei','Juni',
                      'Juli','Agustus','September','Oktober','November','Desember'].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Simpan perubahan tanggal */}
              <button className={styles.btnSimpanEdit} onClick={handleSaveEdit}>
                Simpan perubahan
              </button>

              {/* Tombol kuning 387×48 */}
              {!selected.lunas ? (
                <button
                  className={styles.btnPengingat}
                  onClick={() => handleKirimPengingat(selected)}
                  disabled={!!selected.notifSent}
                >
                  {selected.notifSent ? '✓ Pengingat terkirim' : 'Beri pengingat ke orang tua'}
                </button>
              ) : (
                <div className={styles.lunasBadge}>
                  ✓ SPP bulan {selected.bulan} sudah lunas
                  {selected.lunasAt && <span style={{ fontWeight: 400, marginLeft: 4 }}>({selected.lunasAt})</span>}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ────── LIST VIEW ────── */
          <>
            <div className={styles.listHeader}>
              <div className={styles.pageTitle}>Tagihan SPP</div>
              <div className={styles.listHeaderRight}>
                {unreadPay > 0 && (
                  <button className={styles.payBadge} onClick={() => { markPayNotifsRead(); showToast(`${unreadPay} siswa telah membayar.`); }}>
                    🔔 {unreadPay} bayar
                  </button>
                )}
                <button
                  className={`${styles.filterBtn} ${filterBelum ? styles.filterActive : ''}`}
                  onClick={() => setFilterBelum(p => !p)}
                >
                  {filterBelum ? 'Semua' : 'Belum lunas'}
                </button>
              </div>
            </div>

            {/* Outer card 423×auto bg #A8A8A8 r30 */}
            <div className={styles.outerCard} style={{ minHeight: 'auto', padding: 16 }}>
              {displayed.length === 0 ? (
                <div className={styles.empty}>Semua SPP sudah lunas 🎉</div>
              ) : (
                displayed.map(rec => (
                  <div key={rec.id} className={styles.listRow} onClick={() => handleSelect(rec)}>
                    <div>
                      <div className={styles.listName}>{rec.siswaName}</div>
                      <div className={styles.listSub}>{rec.bulan} {rec.tahun} · Rp{rec.nominal.toLocaleString('id-ID')}</div>
                    </div>
                    <div className={styles.listRowRight}>
                      <span className={rec.lunas ? styles.badgeLunas : styles.badgeBelum}>
                        {rec.lunas ? 'Lunas' : 'Belum'}
                      </span>
                      <span className={styles.chevron}>›</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* ── NAVBAR ── */}
      <nav className={styles.bottomNavbar}>
        <div className={styles.navItem} onClick={() => router.push('/home')}>
          <Image src="/home.svg" alt="Home" width={24} height={24} />
        </div>
        <div className={styles.navItem} onClick={() => router.push('/notif')}>
          <Image src="/notif.svg" alt="Notif" width={24} height={24} />
        </div>
        <div className={`${styles.navItem} ${styles.navActive}`}>
          <Image src="/spp.svg" alt="SPP" width={24} height={24} />
        </div>
        <div className={styles.navItem} onClick={() => router.push('/user')}>
          <Image src="/user.svg" alt="User" width={24} height={24} />
        </div>
      </nav>

      {toast.visible && (
        <div className={`${styles.toast} ${toast.err ? styles.toastErr : ''}`}>{toast.msg}</div>
      )}
    </div>
  );
}