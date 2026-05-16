"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './rekap.module.css';

type GradeKey = 'BSB' | 'BSH' | 'MB' | 'BB';
type AspekNilai = { grade: GradeKey; image: string };
type Assessment = {
  bb: string; tb: string; catatan: string; tahun: string; fase: string;
  aspects: { [aspek: string]: AspekNilai };
};
type DokItem = {
  id: string; namaKegiatan: string; kelas: string;
  siswa: { id: string; name: string }[];
  tanggal: string; gambar: string;
};
type Siswa = { id: string; name: string; kelas: string };

const KELAS_LIST = ['Kelas A', 'Kelas B', 'Kelas C', ,'Kelas D','Kelas E'];
const ASPEK_LIST = ['Agama', 'Jati diri', 'Literasi & Sains'];
const TAHUN_LIST = ['2023/2024', '2024/2025', '2025/2026'];

const GRADE_COLORS: Record<GradeKey, string> = {
  BSB: '#FFB843', BSH: '#EEA223', MB: '#C58619', BB: '#A36C0F',
};
const GRADE_LABELS: Record<GradeKey, string> = {
  BSB: 'Berkembang Sangat Baik', BSH: 'Berkembang Sesuai Harapan',
  MB: 'Mulai Berkembang', BB: 'Belum Berkembang',
};

const DUMMY_SISWA: Siswa[] = [
  ...Array.from({ length: 17 }, (_, i) => ({ id: `KelasA_${i + 1}`, name: `Siswa ${i + 1}`, kelas: 'Kelas A' })),
  ...Array.from({ length: 16 }, (_, i) => ({ id: `KelasB_${i + 1}`, name: `Siswa ${i + 1}`, kelas: 'Kelas B' })),
  ...Array.from({ length: 18  }, (_, i) => ({ id: `KelasC_${i + 1}`, name: `Siswa ${i + 1}`, kelas: 'Kelas C' })),
  ...Array.from({ length: 15  }, (_, i) => ({ id: `KelasD_${i + 1}`, name: `Siswa ${i + 1}`, kelas: 'Kelas D' })),
  ...Array.from({ length: 15  }, (_, i) => ({ id: `KelasE_${i + 1}`, name: `Siswa ${i + 1}`, kelas: 'Kelas E' })),
];

export default function LaporanPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState('Kelas A');
  const [assessments, setAssessments] = useState<Record<string, Assessment>>({});
  const [dokumentasi, setDokumentasi] = useState<DokItem[]>([]);
  const [detailSiswa, setDetailSiswa] = useState<Siswa | null>(null);
  const [detailAspek, setDetailAspek] = useState(ASPEK_LIST[0]);
  const [detailTahun, setDetailTahun] = useState('2025/2026');
  const [toast, setToast] = useState({ visible: false , msg: '', err: false });
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Inline edit nama siswa (sama dengan home) ──
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);
    const a: Record<string, Assessment> = JSON.parse(localStorage.getItem('kindo_assessments') || '{}');
    setAssessments(a);
    const d: DokItem[] = JSON.parse(localStorage.getItem('kindo_dokumentasi') || '[]');
    setDokumentasi(d);
    // Load nama siswa yang sudah diedit (shared dengan home)
    const savedNames = JSON.parse(localStorage.getItem('kindo_student_names') || '{}');
    setStudentNames(savedNames);
  }, []);

  const showToast = (msg: string, err = false) => {
    setToast({ visible: true, msg, err });
    setTimeout(() => setToast({ visible: false, msg: '', err: false }), 3000);
  };

  // Nama display — custom atau default
  const getSiswaName = (siswaId: string, defaultName: string) =>
    studentNames[siswaId] || defaultName;

  // Simpan nama yang diedit
  const handleSaveName = (siswaId: string) => {
    const trimmed = tempName.trim();
    if (!trimmed) { setEditingStudentId(null); return; }
    const updated = { ...studentNames, [siswaId]: trimmed };
    setStudentNames(updated);
    localStorage.setItem('kindo_student_names', JSON.stringify(updated));
    setEditingStudentId(null);
    // Sinkronkan detailSiswa jika sedang dibuka
    if (detailSiswa?.id === siswaId) {
      setDetailSiswa({ ...detailSiswa, name: trimmed });
    }
  };

  const getAssessment = (siswaId: string): Assessment | null =>
    assessments[siswaId] || null;

  const getGradeCount = (siswaId: string, grade: GradeKey): number => {
    const a = getAssessment(siswaId);
    if (!a) return 0;
    return Object.values(a.aspects).filter(v => v.grade === grade).length;
  };

  const getTotalAspek = (siswaId: string): number => {
    const a = getAssessment(siswaId);
    return a ? Object.keys(a.aspects).length : 0;
  };

  const getAspekKurang = (siswaId: string): number => {
    const a = getAssessment(siswaId);
    if (!a) return 0;
    return Object.values(a.aspects).filter(v => v.grade === 'BB' || v.grade === 'MB').length;
  };

  const getKegiatanSiswa = (siswaId: string): DokItem[] =>
    dokumentasi.filter(d => d.siswa.some(s => s.id === siswaId));

  const filteredSiswa = DUMMY_SISWA.filter(s =>
    s.kelas === selectedKelas &&
    getSiswaName(s.id, s.name).toLowerCase().includes(searchQuery.toLowerCase())
  );
  const visibleSiswa = showAll ? filteredSiswa : filteredSiswa.slice(0, 4);

  const handleUnduhPDF = (siswa: Siswa) => {
    showToast(`Mengunduh laporan ${getSiswaName(siswa.id, siswa.name)}...`);
  };

  const handleSelesai = () => {
    setDetailSiswa(null);
  };

  const detailAssessment = detailSiswa ? getAssessment(detailSiswa.id) : null;
  const detailAspekData = detailAssessment?.aspects[detailAspek];

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>

      {detailSiswa && (
        <div className={styles.detailOverlay} onClick={() => setDetailSiswa(null)} />
      )}

      <div className={styles.contentWrap}>

        {/* ══ MAIN CARD ══ */}
        <div className={styles.mainCard}>
          {/* Header */}
          <div className={styles.mainCardHeader}>
            <div className={styles.mainCardTitle}>Rekap nilai</div>
            <select
              className={styles.selectKelas}
              value={selectedKelas}
              onChange={e => { setSelectedKelas(e.target.value); setShowAll(false); setDetailSiswa(null); setSearchQuery(''); }}
            >
              {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Search bar */}
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#A8A8A8" strokeWidth="2"/>
              <path d="M16.5 16.5L21 21" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className={styles.searchBar}
              type="text"
              placeholder="Cari nama siswa..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowAll(false); }}
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#A8A8A8" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Grid siswa */}
          <div className={styles.siswaGrid}>
            {visibleSiswa.length === 0 && (
              <div className={styles.searchEmpty}>
                Tidak ada siswa dengan nama "{searchQuery}"
              </div>
            )}
            {visibleSiswa.map(siswa => {
              const asm = getAssessment(siswa.id);
              const kegiatanSiswa = getKegiatanSiswa(siswa.id);
              const displayName = getSiswaName(siswa.id, siswa.name);

              return (
                <div key={siswa.id} className={styles.siswaCard}>
                  <div className={styles.siswaCardTop}>
                    <div className={styles.siswaFoto}>
                      <Image src="/icongmbr.svg" alt={displayName} width={40} height={40} style={{ opacity: 0.3 }} />
                    </div>

                    <div className={styles.highlightCard}>
                      {/* Nama — inline edit */}
                      {editingStudentId === siswa.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <input
                            autoFocus
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveName(siswa.id);
                              if (e.key === 'Escape') setEditingStudentId(null);
                            }}
                            style={{
                              fontSize: '13px', fontWeight: 600,
                              border: 'none', borderBottom: '1.5px solid #FFB843',
                              background: 'transparent', outline: 'none',
                              color: '#F8F7F2', width: 100, padding: '2px 0',
                              fontFamily: 'inherit',
                            }}
                          />
                          <button
                            onClick={() => handleSaveName(siswa.id)}
                            style={{
                              background: '#FFB843', border: 'none', borderRadius: 6,
                              padding: '2px 7px', fontSize: 11, fontWeight: 700,
                              cursor: 'pointer', color: '#1A1A1A', flexShrink: 0,
                            }}
                          >✓</button>
                        </div>
                      ) : (
                        <div
                          className={styles.highlightName}
                          onClick={() => { setTempName(displayName); setEditingStudentId(siswa.id); }}
                          title="Klik untuk ubah nama"
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                          {displayName}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#F8F7F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#F8F7F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                      <div className={styles.highlightAspek}>Total aspek: {getTotalAspek(siswa.id)}</div>
                      <div className={styles.gradeRow}>
                        {(['BSB', 'BSH', 'MB', 'BB'] as GradeKey[]).map(g => (
                          <div key={g} className={styles.gradeCell}>
                            <div className={styles.gradeSquare} style={{ backgroundColor: GRADE_COLORS[g] }}>
                              {getGradeCount(siswa.id, g)}
                            </div>
                            <div className={styles.gradeKey}>{g}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.aspekKurangRow}>
                    <span className={styles.aspekKurangLabel}>Aspek yang kurang:</span>
                    <span className={styles.aspekKurangVal}>{getAspekKurang(siswa.id)}</span>
                  </div>

                  <div className={styles.kegiatanFotoRow}>
                    {kegiatanSiswa.slice(0, 4).map(dok => (
                      <div key={dok.id} className={styles.kegiatanFotoBox}>
                        {dok.gambar
                          ? <img src={dok.gambar} alt={dok.namaKegiatan} className={styles.kegiatanFotoImg} />
                          : <Image src="/icongmbr.svg" alt="kegiatan" width={18} height={18} style={{ opacity: 0.3 }} />
                        }
                      </div>
                    ))}
                  </div>

                  <div className={styles.cardActions}>
                    <button
                      className={styles.btnUnduhShortcut}
                      onClick={() => handleUnduhPDF(siswa)}
                      title="Unduh PDF"
                    >
                      <Image src="/unduh.svg" alt="Unduh" width={16} height={16} />
                    </button>
                    <button
                      className={styles.btnLihat}
                      onClick={() => { setDetailSiswa(siswa); setDetailAspek(ASPEK_LIST[0]); }}
                    >
                      Lihat selengkapnya
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSiswa.length > 4 && (
            <button
              className={styles.btnLihatSemua}
              onClick={() => setShowAll(prev => !prev)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d={showAll ? 'M18 15l-6-6-6 6' : 'M6 9l6 6 6-6'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showAll ? 'Sembunyikan' : `Lihat selengkapnya (${filteredSiswa.length - 4} lagi)`}
            </button>
          )}
        </div>

        {/* ══ DETAIL CARD ══ */}
        {detailSiswa && (
          <div className={styles.detailCard}>
            <div className={styles.detailHeader}>
              <div className={styles.detailFotoBox}>
                <Image src="/icongmbr.svg" alt={getSiswaName(detailSiswa.id, detailSiswa.name)} width={40} height={40} style={{ opacity: 0.3 }} />
              </div>
              <div className={styles.detailHeaderInfo}>
                {/* Nama di detail card — juga inline editable */}
                {editingStudentId === detailSiswa.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <input
                      autoFocus
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveName(detailSiswa.id);
                        if (e.key === 'Escape') setEditingStudentId(null);
                      }}
                      style={{
                        fontSize: '15px', fontWeight: 700,
                        border: 'none', borderBottom: '1.5px solid #FFB843',
                        background: 'transparent', outline: 'none',
                        color: isDark ? '#F0F0F0' : '#333', width: 130,
                        padding: '2px 0', fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => handleSaveName(detailSiswa.id)}
                      style={{
                        background: '#FFB843', border: 'none', borderRadius: 6,
                        padding: '2px 8px', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', color: '#1A1A1A',
                      }}
                    >✓</button>
                  </div>
                ) : (
                  <div
                    className={styles.detailName}
                    onClick={() => { setTempName(getSiswaName(detailSiswa.id, detailSiswa.name)); setEditingStudentId(detailSiswa.id); }}
                    title="Klik untuk ubah nama"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {getSiswaName(detailSiswa.id, detailSiswa.name)}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
                <div className={styles.detailKelas}>{detailSiswa.kelas}</div>
              </div>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.detailSectionLabel}>Kegiatan</div>
              <div className={styles.detailKegiatanGrid}>
                {getKegiatanSiswa(detailSiswa.id).slice(0, 4).map(dok => (
                  <div key={dok.id} className={styles.detailKegiatanBox}>
                    {dok.gambar
                      ? <img src={dok.gambar} alt={dok.namaKegiatan} className={styles.detailKegiatanImg} />
                      : <Image src="/icongmbr.svg" alt="kegiatan" width={24} height={24} style={{ opacity: 0.25 }} />
                    }
                    <div className={styles.detailKegiatanNama}>{dok.namaKegiatan}</div>
                    <div className={styles.detailKegiatanTgl}>{dok.tanggal}</div>
                  </div>
                ))}
                {getKegiatanSiswa(detailSiswa.id).length === 0 && (
                  <div className={styles.detailKegiatanEmpty}>Belum ada kegiatan</div>
                )}
              </div>
            </div>

            <div className={styles.detailDropdownRow}>
              <select
                className={styles.dropdownAspek}
                value={detailAspek}
                onChange={e => setDetailAspek(e.target.value)}
              >
                {ASPEK_LIST.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                className={styles.dropdownTahun}
                value={detailTahun}
                onChange={e => setDetailTahun(e.target.value)}
              >
                {TAHUN_LIST.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {detailAspekData && (
              <div
                className={styles.nilaiBox}
                style={{ backgroundColor: GRADE_COLORS[detailAspekData.grade] }}
              >
                {detailAspekData.grade}
              </div>
            )}

            <div className={styles.catatanBox}>
              <div className={styles.catatanText}>
                {detailAssessment?.catatan || ''}
              </div>
            </div>

            <div className={styles.detailActions}>
              <button className={styles.btnUnduhPDF} onClick={() => handleUnduhPDF(detailSiswa)}>
                <Image src="/unduh.svg" alt="Unduh" width={16} height={16} />
                Unduh PDF
              </button>
              <button className={styles.btnSelesai} onClick={handleSelesai}>
                Selesai
              </button>
            </div>
          </div>
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
        <div className={styles.navItem} onClick={() => router.push('/spp')}>
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