"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './rekap.module.css';

// ─────────────────────────────
// TIPE
// ─────────────────────────────
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

const KELAS_LIST = ['Kelas A', 'Kelas B', 'Kelas C'];
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
  { id: 'KelasA_1', name: 'Siswa 1', kelas: 'Kelas A' },
  { id: 'KelasA_2', name: 'Siswa 2', kelas: 'Kelas A' },
  { id: 'KelasA_3', name: 'Siswa 3', kelas: 'Kelas A' },
  { id: 'KelasA_4', name: 'Siswa 4', kelas: 'Kelas A' },
  { id: 'KelasA_5', name: 'Siswa 5', kelas: 'Kelas A' },
  { id: 'KelasA_6', name: 'Siswa 6', kelas: 'Kelas A' },
  { id: 'KelasB_1', name: 'Siswa B1', kelas: 'Kelas B' },
  { id: 'KelasB_2', name: 'Siswa B2', kelas: 'Kelas B' },
  { id: 'KelasC_1', name: 'Siswa C1', kelas: 'Kelas C' },
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
  const [toast, setToast] = useState({ visible: false, msg: '', err: false });

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);
    const a: Record<string, Assessment> = JSON.parse(localStorage.getItem('kindo_assessments') || '{}');
    setAssessments(a);
    const d: DokItem[] = JSON.parse(localStorage.getItem('kindo_dokumentasi') || '[]');
    setDokumentasi(d);
  }, []);

  const showToast = (msg: string, err = false) => {
    setToast({ visible: true, msg, err });
    setTimeout(() => setToast({ visible: false, msg: '', err: false }), 3000);
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

  // Kegiatan yang melibatkan siswa ini
  const getKegiatanSiswa = (siswaId: string): DokItem[] =>
    dokumentasi.filter(d => d.siswa.some(s => s.id === siswaId));

  const filteredSiswa = DUMMY_SISWA.filter(s => s.kelas === selectedKelas);

  const handleUnduhPDF = (siswa: Siswa) => {
    showToast(`Mengunduh laporan ${siswa.name}...`);
    // Simulasi unduh — implementasi jsPDF bisa ditambahkan
  };

  const handleSelesai = () => {
    setDetailSiswa(null);
  };

  // Detail assessment untuk siswa yang dipilih
  const detailAssessment = detailSiswa ? getAssessment(detailSiswa.id) : null;
  const detailAspekData = detailAssessment?.aspects[detailAspek];

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>

      {/* ── KONTEN UTAMA ── */}
      <div className={styles.contentWrap}>

        {/* ══ MAIN CARD — Rekap Nilai 757×713 ══ */}
        <div className={styles.mainCard}>
          {/* Header */}
          <div className={styles.mainCardHeader}>
            <div className={styles.mainCardTitle}>Rekap nilai</div>
            <select
              className={styles.selectKelas}
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
            >
              {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          {/* Grid siswa */}
          <div className={styles.siswaGrid}>
            {filteredSiswa.map(siswa => {
              const asm = getAssessment(siswa.id);
              const kegiatanSiswa = getKegiatanSiswa(siswa.id);

              return (
                <div key={siswa.id} className={styles.siswaCard}>
                  {/* Row atas: foto + highlight berdampingan */}
                  <div className={styles.siswaCardTop}>
                    {/* Foto siswa 130×130 */}
                    <div className={styles.siswaFoto}>
                      <Image src="/icongmbr.svg" alt={siswa.name} width={40} height={40} style={{ opacity: 0.3 }} />
                    </div>

                    {/* Highlight nilai 187×130 */}
                    <div className={styles.highlightCard}>
                      <div className={styles.highlightName}>{siswa.name}</div>
                      <div className={styles.highlightAspek}>Total aspek: {getTotalAspek(siswa.id)}</div>
                      {/* Grade squares 34×34 */}
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

                  {/* Aspek yang kurang 323×41 */}
                  <div className={styles.aspekKurangRow}>
                    <span className={styles.aspekKurangLabel}>Aspek yang kurang:</span>
                    <span className={styles.aspekKurangVal}>{getAspekKurang(siswa.id)}</span>
                  </div>

                  {/* Foto kegiatan 35×35 */}
                  <div className={styles.kegiatanFotoRow}>
                    {kegiatanSiswa.slice(0, 4).map(dok => (
                      <div key={dok.id} className={styles.kegiatanFotoBox}>
                        {dok.gambar
                          ? <img src={dok.gambar} alt={dok.namaKegiatan} className={styles.kegiatanFotoImg} />
                          : <Image src="/icongmbr.svg" alt="kegiatan" width={18} height={18} style={{ opacity: 0.3 }} />
                        }
                      </div>
                    ))}
                    {/* Shortcut unduh 52×35 */}
                    <div className='horizontal'>
                    <button
                      className={styles.btnUnduhShortcut}
                      onClick={() => handleUnduhPDF(siswa)}
                      title="Unduh PDF"
                    >
                      <Image src="/unduh.svg" alt="Unduh" width={16} height={16} />
                    </button>
                  </div>

                  {/* Tombol lihat selengkapnya 146×33 */}
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
        </div>

        {/* ══ DETAIL CARD — 289×614 ══ */}
        {detailSiswa && (
          <div className={styles.detailCard}>
            {/* Foto + nama */}
            <div className={styles.detailFotoBox}>
              <Image src="/icongmbr.svg" alt={detailSiswa.name} width={40} height={40} style={{ opacity: 0.3 }} />
            </div>
            <div className={styles.detailName}>{detailSiswa.name}</div>
            <div className={styles.detailKelas}>{detailSiswa.kelas}</div>

            {/* Kegiatan siswa */}
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

            {/* Dropdown aspek 250×39 + tahun 113×25 */}
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

            {/* Kotak nilai 62×24 */}
            {detailAspekData && (
              <div
                className={styles.nilaiBox}
                style={{ backgroundColor: GRADE_COLORS[detailAspekData.grade] }}
              >
                {detailAspekData.grade}
              </div>
            )}

            {/* Catatan guru 250×115 */}
            <div className={styles.catatanBox}>
              <div className={styles.catatanText}>
                {detailAssessment?.catatan || ''}
              </div>
            </div>

            {/* Tombol Unduh PDF + Selesai */}
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