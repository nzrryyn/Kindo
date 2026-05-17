"use client";
// ─── page-home-ortu.tsx (versi Supabase) ───

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './ortu.module.css';
import { supabase } from '@/lib/supabase';
import {
  fetchStudentNames,
  subscribeStudentNames,
  fetchAttendance,
  fetchAssessments,
  subscribeAssessments,
  fetchKegiatanHarian,
  subscribeKegiatanHarian,
  fetchIzinByDateAndSiswa,
  subscribeIzinRequests,
  fetchSppRecords,
  insertNotification,
} from '@/lib/supabase';

type KegiatanItem = { id: number; text: string; time: string };
type StudentAssessment = {
  bb: string; tb: string; catatan: string; tahun: string; fase: string;
  aspects: { [key: string]: { grade: string; image: string } };
};
type IzinRequest = {
  id: number; siswa_id: string; siswa_name: string; type: 'izin' | 'sakit';
  alasan: string; date: string; status: 'pending' | 'approved' | 'rejected';
};
type SppRecord = {
  id: string; siswaId: string; siswaName: string; bulan: string; tahun: string;
  nominal: number; jatuhTempo: string; lunas: boolean; notifSent?: boolean;
};

const MY_CHILD = { id: 'KelasA_1', name: 'Siswa 1', kelas: 'Kelas A' };

const ASPEK_LABELS = ['Agama', 'Jati diri', 'Literasi & Sains'];
const GRADE_LABELS: Record<string, string> = {
  BB: 'Belum Berkembang', MB: 'Mulai Berkembang',
  BSH: 'Berkembang Sesuai Harapan', BSB: 'Berkembang Sangat Baik',
};
const GRADE_COLORS: Record<string, string> = {
  BB: '#1A6ABB', MB: '#3083D7', BSH: '#5B9FE4', BSB: '#7FB6EC',
};

const SPP_DUMMY: SppRecord[] = [
  { id: 'spp1', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'Mei', tahun: '2026', nominal: 500000, jatuhTempo: '31/5/2026', lunas: true },
  { id: 'spp2', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'April', tahun: '2026', nominal: 500000, jatuhTempo: '30/4/2026', lunas: true },
  { id: 'spp3', siswaId: 'KelasA_1', siswaName: 'Siswa 1', bulan: 'Maret', tahun: '2026', nominal: 500000, jatuhTempo: '31/3/2026', lunas: false },
];

export default function HomeOrangTua() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [kegiatanHarian, setKegiatanHarian] = useState<KegiatanItem[]>([]);
  const [statusAbsen, setStatusAbsen] = useState<string>('Belum tercatat');
  const [allAssessments, setAllAssessments] = useState<Record<string, any>>({});
  const [izinType, setIzinType] = useState<'izin' | 'sakit'>('izin');
  const [izinAlasan, setIzinAlasan] = useState('');
  const [izinRequest, setIzinRequest] = useState<IzinRequest | null>(null);
  const [selectedAspek, setSelectedAspek] = useState('Agama');
  const [selectedPeriode, setSelectedPeriode] = useState('2024/2025');
  const [showSppPanel, setShowSppPanel] = useState(false);
  const [sppRecords, setSppRecords] = useState<SppRecord[]>(SPP_DUMMY);
  const [selectedSpp, setSelectedSpp] = useState<SppRecord | null>(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState('');
  const [showPerkPanel, setShowPerkPanel] = useState(false);
  const [childName, setChildName] = useState(MY_CHILD.name);
  const [showAllKegiatan, setShowAllKegiatan] = useState(false);
  const [showUserPopup, setShowUserPopup] = useState(false);
  const [toastData, setToastData] = useState({ visible: false, message: '', isError: false });
  const popupRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);

    loadAll();

    const nameSub = subscribeStudentNames(names => {
      if (names[MY_CHILD.id]) setChildName(names[MY_CHILD.id]);
    });

    const kegSub = subscribeKegiatanHarian(today, setKegiatanHarian);

    const izinSub = subscribeIzinRequests(async () => {
      const req = await fetchIzinByDateAndSiswa(MY_CHILD.id, today);
      if (req) setIzinRequest({
        id: req.id, siswa_id: req.siswa_id, siswa_name: req.siswa_name,
        type: req.type, alasan: req.alasan, date: req.date, status: req.status,
      });
    });

    const asmSub = subscribeAssessments(setAllAssessments);

    const interval = setInterval(loadAll, 30000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(nameSub);
      supabase.removeChannel(kegSub);
      supabase.removeChannel(izinSub);
      supabase.removeChannel(asmSub);
    };
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) setShowUserPopup(false);
    };
    if (showUserPopup) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showUserPopup]);

  const loadAll = async () => {
    const items = await fetchKegiatanHarian(today);
    setKegiatanHarian(items);

    const att = await fetchAttendance();
    setStatusAbsen(att[`${MY_CHILD.id}_${today}`] || 'Belum tercatat');

    const asm = await fetchAssessments();
    setAllAssessments(asm);

    const names = await fetchStudentNames();
    if (names[MY_CHILD.id]) setChildName(names[MY_CHILD.id]);

    const req = await fetchIzinByDateAndSiswa(MY_CHILD.id, today);
    if (req) setIzinRequest({
      id: req.id, siswa_id: req.siswa_id, siswa_name: req.siswa_name,
      type: req.type, alasan: req.alasan, date: req.date, status: req.status,
    });

    const sppRows = await fetchSppRecords();
    const mySpp = (sppRows.length > 0 ? sppRows : SPP_DUMMY)
      .filter((r: any) => (r.siswa_id ?? r.siswaId) === MY_CHILD.id)
      .map((r: any) => ({
        id: r.id,
        siswaId: r.siswa_id ?? r.siswaId,
        siswaName: r.siswa_name ?? r.siswaName ?? MY_CHILD.name,
        bulan: r.bulan,
        tahun: r.tahun ?? '2026',
        nominal: r.nominal,
        jatuhTempo: r.jatuh_tempo ?? r.jatuhTempo ?? '',
        lunas: (r.status ?? '') === 'lunas',
        notifSent: r.notif_sent ?? r.notifSent,
      }));
    if (mySpp.length > 0) setSppRecords(mySpp);
  };

  // ─── FIX: handleKirimIzin — hapus id dari payload, pakai insert langsung ───
  const handleKirimIzin = async () => {
    if (!izinAlasan.trim()) { showToast('Mohon isi alasan terlebih dahulu.', true); return; }

    const payload = {
      siswa_id: MY_CHILD.id,
      siswa_name: childName,
      kelas: MY_CHILD.kelas,
      type: izinType,
      alasan: izinAlasan,
      date: today,
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('izin_requests')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('handleKirimIzin:', error);
      showToast('Gagal mengirim izin. Coba lagi.', true);
      return;
    }

    // Kirim notifikasi ke guru
    await insertNotification('izin', {
      siswaId: MY_CHILD.id,
      siswaName: childName,
      kelas: MY_CHILD.kelas,
      type: izinType,
      alasan: izinAlasan,
      date: today,
    });

    setIzinRequest({
      id: data.id,
      siswa_id: data.siswa_id,
      siswa_name: data.siswa_name,
      type: data.type,
      alasan: data.alasan,
      date: data.date,
      status: 'pending',
    });
    setIzinAlasan('');
    showToast('Izin berhasil dikirim ke guru! Menunggu konfirmasi.');
  };

  const showToast = (msg: string, isError = false) => {
    setToastData({ visible: true, message: msg, isError });
    setTimeout(() => setToastData({ visible: false, message: '', isError: false }), 3500);
  };

  const toggleDark = () => {
    const next = !isDark; setIsDark(next);
    localStorage.setItem('kindo_dark', String(next));
  };

  const getStatusColor = () => ({
    'Hadir': '#4CAF50', 'Sakit': '#FFB843',
    'Izin': '#4A90E2', 'Alfa': '#FF4343',
  }[statusAbsen] || '#FF4343');

  const getStatusLabel = () => ({
    'Hadir': 'Anak sudah hadir di sekolah',
    'Sakit': 'Anak sedang sakit hari ini',
    'Izin': 'Anak izin tidak masuk hari ini',
    'Alfa': 'Anak tidak hadir (Alfa)',
  }[statusAbsen] || 'Ananda belum tiba di sekolah');

  const assessment: StudentAssessment | null =
    allAssessments[`${MY_CHILD.id}__${selectedPeriode}`] || null;

  const getGradeCount = (g: string) =>
    assessment ? Object.values(assessment.aspects).filter(a => a.grade === g).length : 0;

  const totalAspek = assessment ? Object.keys(assessment.aspects).length : 0;
  const kegiatanToShow = showAllKegiatan ? kegiatanHarian : kegiatanHarian.slice(0, 3);
  const latestSpp = sppRecords[0];

  const iconS = isDark ? '#F8F7F2' : '#A8A8A8';

  const IzinIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M18 18.86H17.24C16.44 18.86 15.68 19.17 15.12 19.73L13.41 21.42C12.63 22.19 11.36 22.19 10.58 21.42L8.87 19.73C8.31 19.17 7.54 18.86 6.75 18.86H6C4.34 18.86 3 17.53 3 15.89V4.97C3 3.33 4.34 2 6 2H18C19.66 2 21 3.33 21 4.97V15.88C21 17.52 19.66 18.86 18 18.86Z" stroke={iconS} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.07 8.95C12.03 8.95 11.97 8.95 11.92 8.95C10.87 8.91 10.04 8.06 10.04 7C10.04 5.92 10.91 5.05 11.99 5.05C13.07 5.05 13.94 5.93 13.94 7C13.95 8.06 13.12 8.92 12.07 8.95Z" stroke={iconS} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.25 11.96C7.92 12.85 7.92 14.3 9.25 15.19C10.76 16.2 13.24 16.2 14.75 15.19C16.08 14.3 16.08 12.85 14.75 11.96C13.24 10.96 10.77 10.96 9.25 11.96Z" stroke={iconS} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SppIcon = () => (
    <svg width="22" height="22" viewBox="0 0 25 24" fill="none">
      <path d="M2.066 8.505H22.727" stroke={iconS} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.653 3.505H18.13C21.808 3.505 22.727 4.385 22.727 7.895V16.105C22.727 19.615 21.808 20.495 18.141 20.495H6.653C2.985 20.505 2.066 19.625 2.066 16.115V7.895C2.066 4.385 2.985 3.505 6.653 3.505Z" stroke={iconS} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const TogaIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M10.05 2.53L4.03 6.46C2.1 7.72 2.1 10.54 4.03 11.8L10.05 15.73C11.13 16.44 12.91 16.44 13.99 15.73L19.98 11.8C21.9 10.54 21.9 7.73 19.98 6.47L13.99 2.54C12.91 1.82 11.13 1.82 10.05 2.53Z" stroke={iconS} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const IzinStatusBadge = () => {
    if (!izinRequest) return null;
    const cfg = {
      pending:  { bg: '#FFF4DC', color: '#A06B00', text: '⏳ Menunggu konfirmasi guru' },
      approved: { bg: '#E8F5E9', color: '#4CAF50', text: '✓ Izin disetujui guru' },
      rejected: { bg: '#FFE9E9', color: '#E53E3E', text: '✗ Izin ditolak guru' },
    }[izinRequest.status];
    return (
      <div style={{ padding: '6px 12px', borderRadius: 10, backgroundColor: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 600, marginTop: 4 }}>
        {cfg.text}
      </div>
    );
  };

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>
      <div className={styles.bgWrap} aria-hidden>
        <img src="/gradortu.png" alt="" className={styles.bgImg} />
      </div>

      {/* HEADER */}
      <div className={styles.header}>
        <div className={styles.headerName}>{childName}</div>
        <div ref={popupRef} style={{ position: 'relative' }}>
          <div className={styles.avatarCircle} onClick={() => setShowUserPopup(p => !p)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.8">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          {showUserPopup && (
            <div className={styles.userPopup}>
              <div style={{ fontWeight: 700, fontSize: 14, color: isDark ? '#F0F0F0' : '#333' }}>{childName}</div>
              <div style={{ fontSize: 12, color: '#A8A8A8', marginBottom: 12 }}>Orang Tua · {MY_CHILD.kelas}</div>
              <div style={{ height: 1, background: isDark ? '#2E2E2E' : '#E8E8E8', marginBottom: 12 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: isDark ? '#D0D0D0' : '#555' }}>{isDark ? 'Mode Gelap' : 'Mode Terang'}</span>
                <div onClick={toggleDark} style={{ width: 40, height: 22, borderRadius: 11, backgroundColor: isDark ? '#F8F7F2' : '#333', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: isDark ? 21 : 3, width: 16, height: 16, borderRadius: '50%', backgroundColor: isDark ? '#333' : '#F8F7F2', transition: 'left .25s' }} />
                </div>
              </div>
              <button onClick={() => router.push('/')} style={{ width: '100%', height: 38, borderRadius: 10, border: 'none', backgroundColor: isDark ? '#F8F7F2' : '#333', color: isDark ? '#333' : '#F8F7F2', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Keluar</button>
            </div>
          )}
        </div>
      </div>

      {/* SCROLL AREA */}
      <div className={styles.scrollArea}>
        <div className={styles.topRow}>
          <div className={styles.kegCard}>
            <div className={styles.kegTitle}>Kegiatan hari ini</div>
            {kegiatanHarian.length === 0 ? (
              <div className={styles.kegEmpty}>Belum ada kegiatan dari guru.</div>
            ) : (
              <>
                {kegiatanToShow.map(item => (
                  <div key={item.id} className={styles.kegRow}>
                    <span className={styles.kegTime}>{item.time}</span>
                    <span className={styles.kegDash}>–</span>
                    <span className={styles.kegText}>{item.text || '—'}</span>
                  </div>
                ))}
                {kegiatanHarian.length > 3 && (
                  <button className={styles.btnLihat} onClick={() => setShowAllKegiatan(p => !p)}>
                    {showAllKegiatan ? 'Sembunyikan ↑' : `+${kegiatanHarian.length - 3} lainnya ↓`}
                  </button>
                )}
              </>
            )}
          </div>

          <div className={styles.statusCard}>
            <div className={styles.statusRow}>
              <div className={styles.statusDot} style={{ backgroundColor: getStatusColor() }} />
              <span className={styles.statusTitle}>Status anak</span>
            </div>
            <div className={styles.statusSub}>{getStatusLabel()}</div>
          </div>
        </div>

        {/* MAIN CARD */}
        <div className={styles.mainCard}>

          {/* Izin anak */}
          <div className={styles.childCard}>
            <div className={styles.childCardLeft}>
              <div className={styles.childIconBox}><IzinIcon /></div>
              <div className={styles.childCardInfo}>
                <div className={styles.childCardTitle}>Izin anak</div>
                <div className={styles.childCardDesc}>
                  Kehadiran:&nbsp;
                  <label className={styles.radioLbl}>
                    <input type="radio" name="izinType" value="izin" checked={izinType === 'izin'} onChange={() => setIzinType('izin')} disabled={!!izinRequest} /> Izin
                  </label>
                  <label className={styles.radioLbl}>
                    <input type="radio" name="izinType" value="sakit" checked={izinType === 'sakit'} onChange={() => setIzinType('sakit')} disabled={!!izinRequest} /> Sakit
                  </label>
                </div>
                <IzinStatusBadge />
              </div>
            </div>
            <div className={styles.childCardRight}>
              {!izinRequest && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <input
                    className={styles.izinInput}
                    placeholder="Alasan..."
                    value={izinAlasan}
                    onChange={e => setIzinAlasan(e.target.value)}
                  />
                  <button className={styles.btnAction} onClick={handleKirimIzin}>Kirim</button>
                </div>
              )}
            </div>
          </div>

          {/* Info SPP */}
          <div className={styles.childCard}>
            <div className={styles.childCardLeft}>
              <div className={styles.childIconBox}><SppIcon /></div>
              <div className={styles.childCardInfo}>
                <div className={styles.childCardTitle}>Info SPP</div>
                <div className={styles.childCardDesc}>
                  {latestSpp
                    ? `SPP bulan ${latestSpp.bulan} ${latestSpp.lunas ? 'sudah lunas' : 'belum lunas'}`
                    : 'Memuat data SPP...'}
                </div>
              </div>
            </div>
            <button className={styles.btnAction} onClick={() => setShowSppPanel(true)}>Selengkapnya</button>
          </div>

          {/* Perkembangan anak */}
          <div className={styles.childCard} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className={styles.childCardLeft} style={{ marginBottom: 8 }}>
              <div className={styles.childIconBox}><TogaIcon /></div>
              <div className={styles.childCardInfo}>
                <div className={styles.childCardTitle}>Perkembangan anak</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                  <select className={styles.perkDropdown} value={selectedPeriode} onChange={e => setSelectedPeriode(e.target.value)}>
                    <option value="2024/2025">Periode: TA 2024/2025</option>
                    <option value="2025/2026">Periode: TA 2025/2026</option>
                  </select>
                  <div className={styles.totalAspekBox}>Total aspek: {totalAspek}</div>
                </div>
                <div className={styles.gradeRow}>
                  {(['BSB', 'BSH', 'MB', 'BB'] as const).map(g => (
                    <div key={g} className={styles.gradeCell}>
                      <div className={styles.gradeSquare} style={{ backgroundColor: GRADE_COLORS[g] }}>{getGradeCount(g)}</div>
                      <div className={styles.gradeLabel}>{g}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button className={styles.btnAction} style={{ alignSelf: 'flex-end' }} onClick={() => setShowPerkPanel(true)}>
              Selengkapnya
            </button>
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav className={styles.bottomNavbar}>
        <div className={styles.navItem} onClick={() => router.push('/home-ortu')}><Image src="/home.svg" alt="Home" width={24} height={24} /></div>
        <div className={styles.navItem} onClick={() => router.push('/user-ortu')}><Image src="/user.svg" alt="User" width={24} height={24} /></div>
      </nav>

      {/* PANEL SPP */}
      {showSppPanel && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) { setShowSppPanel(false); setSelectedSpp(null); } }}>
          <div className={styles.sppOuterCard}>
            {selectedSpp ? (
              <>
                <div className={styles.sppDetailHeader}>
                  <div>
                    <div className={styles.sppDetailLabel}>Tagihan SPP</div>
                  </div>
                  <div className={styles.sppDateBadge}>{selectedSpp.bulan.slice(0,3)}, {selectedSpp.tahun}</div>
                </div>
                <div className={styles.sppTopCard}>
                  <div className={styles.sppNominalLabel}>Tagihan SPP</div>
                  <div className={styles.sppNominal}>Rp{selectedSpp.nominal.toLocaleString('id-ID')}</div>
                </div>
                <div className={styles.sppInnerCard}>
                  <div className={styles.sppInfoRow}><span className={styles.sppInfoLabel}>Nama siswa:</span><span className={styles.sppInfoVal}>{childName}</span></div>
                  <div className={styles.sppInfoRow}><span className={styles.sppInfoLabel}>Jatuh tempo:</span><span className={styles.sppInfoVal}>{selectedSpp.jatuhTempo}</span></div>
                  <div className={styles.sppInfoRow}><span className={styles.sppInfoLabel}>Status:</span><span className={styles.sppInfoVal} style={{ color: selectedSpp.lunas ? '#4CAF50' : '#FF4343', fontWeight: 600 }}>{selectedSpp.lunas ? 'Lunas' : 'Belum lunas'}</span></div>
                  <div className={styles.sppInfoRow}><span className={styles.sppInfoLabel}>Bulan:</span><span className={styles.sppInfoVal}>{selectedSpp.bulan}</span></div>
                </div>
                {!selectedSpp.lunas && (
                  <div className={styles.sppPayCard}>
                    <div className={styles.sppPayLabel}>Pilih metode pembayaran</div>
                    <select className={styles.sppPaySelect} value={selectedPayMethod} onChange={e => setSelectedPayMethod(e.target.value)}>
                      <option value="">Pilih bank/E-Wallet</option>
                      <option>BCA</option><option>Mandiri</option><option>GoPay</option><option>OVO</option>
                    </select>
                  </div>
                )}
                {!selectedSpp.lunas ? (
                  <button className={styles.btnBayarOrtu} onClick={async () => {
                    if (!selectedPayMethod) { showToast('Pilih metode pembayaran terlebih dahulu.', true); return; }
                    await insertNotification('spp_pay', {
                      siswaId: MY_CHILD.id, siswaName: childName,
                      bulan: selectedSpp.bulan, nominal: selectedSpp.nominal,
                      metode: selectedPayMethod,
                    });
                    const updated = sppRecords.map(r => r.id === selectedSpp.id ? { ...r, lunas: true } : r);
                    setSppRecords(updated);
                    setSelectedSpp({ ...selectedSpp, lunas: true });
                    showToast('Pembayaran berhasil! Notifikasi dikirim ke guru.');
                  }}>Bayar</button>
                ) : (
                  <div className={styles.sppLunasBadge}>✓ SPP bulan {selectedSpp.bulan} sudah lunas</div>
                )}
                <button className={styles.sppBtnBack} onClick={() => setSelectedSpp(null)}>← Kembali</button>
              </>
            ) : (
              <>
                <div className={styles.sppPanelTitle}>Tagihan SPP</div>
                {sppRecords.map(item => (
                  <div key={item.id} className={styles.sppListRow} onClick={() => setSelectedSpp(item)}>
                    <div>
                      <div className={styles.sppListBulan}>{item.bulan} {item.tahun}</div>
                      <div className={styles.sppListNominal}>Rp{item.nominal.toLocaleString('id-ID')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={item.lunas ? styles.badgeLunas : styles.badgeBelum}>{item.lunas ? 'Lunas' : 'Belum'}</span>
                      <span style={{ color: '#A8A8A8', fontSize: 18 }}>›</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* PANEL PERKEMBANGAN */}
      {showPerkPanel && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowPerkPanel(false); }}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>Perkembangan Anak</div>
            <div className={styles.panelSub}>{childName} · {MY_CHILD.kelas}</div>
            {assessment ? (
              <>
                <div className={styles.perkInfoGrid}>
                  {[
                    { label: 'Berat Badan', val: assessment.bb ? `${assessment.bb} kg` : '—' },
                    { label: 'Tinggi Badan', val: assessment.tb ? `${assessment.tb} cm` : '—' },
                    { label: 'Tahun Ajaran', val: assessment.tahun || '—' },
                    { label: 'Fase', val: assessment.fase || '—' },
                  ].map(({ label, val }) => (
                    <div key={label} className={styles.perkInfoBox}>
                      <div className={styles.perkInfoLabel}>{label}</div>
                      <div className={styles.perkInfoVal}>{val}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.aspekTabs}>
                  {ASPEK_LABELS.map(a => (
                    <button key={a} className={`${styles.aspekTab} ${selectedAspek === a ? styles.aspekTabActive : ''}`} onClick={() => setSelectedAspek(a)}>{a}</button>
                  ))}
                </div>
                {assessment.aspects[selectedAspek] ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className={styles.aspekGradePill} style={{ backgroundColor: GRADE_COLORS[assessment.aspects[selectedAspek].grade] || '#3A6FD8' }}>
                      {assessment.aspects[selectedAspek].grade} — {GRADE_LABELS[assessment.aspects[selectedAspek].grade] || ''}
                    </div>
                    {assessment.aspects[selectedAspek].image && (
                      <img src={assessment.aspects[selectedAspek].image} alt="Dokumentasi" className={styles.aspekImg} />
                    )}
                  </div>
                ) : (
                  <div className={styles.emptyText}>Belum ada penilaian untuk aspek ini.</div>
                )}
                {assessment.catatan && (
                  <div className={styles.catatanBox}>
                    <div className={styles.catatanLabel}>Catatan Guru</div>
                    <div className={styles.catatanText}>{assessment.catatan}</div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyText} style={{ textAlign: 'center', padding: '32px 0' }}>📋 Belum ada data rapor dari guru.</div>
            )}
          </div>
        </div>
      )}

      {toastData.visible && (
        <div className={`${styles.toast} ${toastData.isError ? styles.toastErr : ''}`}>{toastData.message}</div>
      )}
    </div>
  );
}