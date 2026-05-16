"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './dokumentasi.module.css';

type DokItem = {
  id: string; namaKegiatan: string; kelas: string;
  siswa: { id: string; name: string }[];
  tanggal: string; gambar: string;
};
type SiswaOpt = { id: string; name: string; kelas: string };

const KELAS_LIST = ['Kelas A', 'Kelas B', 'Kelas C', 'Kelas D', 'Kelas E'];
const DUMMY_SISWA: SiswaOpt[] = [
  ...Array.from({ length: 17 }, (_, i) => ({ id: `KelasA_${i+1}`, name: `Siswa ${i+1}`, kelas: 'Kelas A' })),
  ...Array.from({ length: 16 }, (_, i) => ({ id: `KelasB_${i+1}`, name: `Siswa ${i+1}`, kelas: 'Kelas B' })),
  ...Array.from({ length: 18 }, (_, i) => ({ id: `KelasC_${i+1}`, name: `Siswa ${i+1}`, kelas: 'Kelas C' })),
  ...Array.from({ length: 15 }, (_, i) => ({ id: `KelasD_${i+1}`, name: `Siswa ${i+1}`, kelas: 'Kelas D' })),
  ...Array.from({ length: 15 }, (_, i) => ({ id: `KelasE_${i+1}`, name: `Siswa ${i+1}`, kelas: 'Kelas E' })),
];

export default function DokumentasiPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [items, setItems] = useState<DokItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<'add' | 'detail'>('add');
  const [selectedItem, setSelectedItem] = useState<DokItem | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formKelas, setFormKelas] = useState('Kelas A');
  const [formGambar, setFormGambar] = useState('');
  const [formSiswa, setFormSiswa] = useState<{ id: string; name: string }[]>([]);
  const [showSiswaDropdown, setShowSiswaDropdown] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: '', err: false });

  // ── Inline edit nama siswa (sama dengan home) ──
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);
    const saved: DokItem[] = JSON.parse(localStorage.getItem('kindo_dokumentasi') || '[]');
    setItems(saved);
    const savedNames = JSON.parse(localStorage.getItem('kindo_student_names') || '{}');
    setStudentNames(savedNames);
  }, []);

  const showToast = (msg: string, err = false) => {
    setToast({ visible: true, msg, err });
    setTimeout(() => setToast({ visible: false, msg: '', err: false }), 3000);
  };

  const getSiswaName = (siswaId: string, defaultName: string) =>
    studentNames[siswaId] || defaultName;

  const handleSaveName = (siswaId: string) => {
    const trimmed = tempName.trim();
    if (!trimmed) { setEditingStudentId(null); return; }
    const updated = { ...studentNames, [siswaId]: trimmed };
    setStudentNames(updated);
    localStorage.setItem('kindo_student_names', JSON.stringify(updated));
    setEditingStudentId(null);
    // Update chips di form jika siswa ini ada di formSiswa
    setFormSiswa(prev => prev.map(s => s.id === siswaId ? { ...s, name: trimmed } : s));
  };

  const saveItems = (newItems: DokItem[]) => {
    setItems(newItems);
    localStorage.setItem('kindo_dokumentasi', JSON.stringify(newItems));
  };

  const openAdd = () => {
    setFormNama(''); setFormKelas('Kelas A'); setFormGambar(''); setFormSiswa([]);
    setPanelMode('add'); setPanelOpen(true);
  };

  const openDetail = (item: DokItem) => {
    setSelectedItem(item);
    setPanelMode('detail'); setPanelOpen(true);
  };

  const handleImagePick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setFormGambar(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    inp.click();
  };

  const handleTambah = () => {
    if (!formNama.trim()) { showToast('Nama kegiatan wajib diisi', true); return; }
    const newItem: DokItem = {
      id: Date.now().toString(), namaKegiatan: formNama.trim(), kelas: formKelas,
      siswa: formSiswa, tanggal: new Date().toLocaleDateString('id-ID'), gambar: formGambar,
    };
    saveItems([newItem, ...items]);
    setPanelOpen(false);
    showToast('Dokumentasi berhasil ditambahkan!');
  };

  const handleHapus = (id: string) => {
    saveItems(items.filter(i => i.id !== id));
    setPanelOpen(false);
    showToast('Dokumentasi dihapus.');
  };

  const availableSiswa = DUMMY_SISWA.filter(
    s => s.kelas === formKelas && !formSiswa.find(fs => fs.id === s.id)
  );

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>Dokumentasi Kegiatan</div>
      </div>

      <div className={styles.content}>
        {/* Tambah row */}
        <div className={styles.tambahRow}>
          <span className={styles.tambahLabel}>Tambah dokumentasi</span>
          <button className={styles.btnPlus} onClick={openAdd}>+</button>
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {items.map(item => (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardImg}>
                {item.gambar
                  ? <img src={item.gambar} alt={item.namaKegiatan} className={styles.cardImgEl} />
                  : <Image src="/icongmbr.svg" alt="placeholder" width={40} height={40} className={styles.cardImgPlaceholder} />
                }
              </div>
              <div className={styles.cardFooter}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardNama}>{item.namaKegiatan}</div>
                  <div className={styles.cardSub}>{item.kelas} · {item.tanggal}</div>
                  {/* Chips nama siswa — inline editable */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {item.siswa.map(s => {
                      const displayName = getSiswaName(s.id, s.name);
                      return editingStudentId === `${item.id}_${s.id}` ? (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            autoFocus
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveName(s.id);
                              if (e.key === 'Escape') setEditingStudentId(null);
                            }}
                            style={{
                              fontSize: '11px', fontWeight: 500,
                              border: 'none', borderBottom: '1.5px solid #FFB843',
                              background: 'transparent', outline: 'none',
                              color: isDark ? '#F0F0F0' : '#333', width: 80,
                              padding: '1px 0', fontFamily: 'inherit',
                            }}
                          />
                          <button
                            onClick={() => handleSaveName(s.id)}
                            style={{
                              background: '#FFB843', border: 'none', borderRadius: 5,
                              padding: '1px 6px', fontSize: 10, fontWeight: 700,
                              cursor: 'pointer', color: '#1A1A1A',
                            }}
                          >✓</button>
                        </div>
                      ) : (
                        <span
                          key={s.id}
                          style={{
                            fontSize: '11px', color: '#A8A8A8',
                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}
                          onClick={() => { setTempName(displayName); setEditingStudentId(`${item.id}_${s.id}`); }}
                          title="Klik untuk ubah nama"
                        >
                          {displayName}
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <button className={styles.btnLihat} onClick={() => openDetail(item)}>
                  Lihat selengkapnya
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel */}
      {panelOpen && (
        <div className={styles.panelOverlay} onClick={e => { if (e.target === e.currentTarget) setPanelOpen(false); }}>
          <div className={styles.panelCard}>
            <button className={styles.btnClose} onClick={() => setPanelOpen(false)}>✕</button>

            {panelMode === 'add' ? (
              <>
                {/* Gambar */}
                <div className={styles.panelImgBox} onClick={handleImagePick}>
                  {formGambar
                    ? <img src={formGambar} alt="preview" className={styles.panelImgEl} />
                    : <div className={styles.panelImgPlaceholder}>
                        <Image src="/icongmbr.svg" alt="upload" width={36} height={36} />
                        <span className={styles.panelImgHint}>Klik untuk tambah foto</span>
                      </div>
                  }
                </div>

                <div className={styles.panelRow}>
                  <input
                    className={styles.inputNama}
                    placeholder="Nama kegiatan"
                    value={formNama}
                    onChange={e => setFormNama(e.target.value)}
                  />
                  <select
                    className={styles.selectKelas}
                    value={formKelas}
                    onChange={e => { setFormKelas(e.target.value); setFormSiswa([]); }}
                  >
                    {KELAS_LIST.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                {/* Tambah siswa */}
                <div className={styles.siswaBox}>
                  <div className={styles.siswaLabel}>Siswa yang terlibat</div>
                  <div className={styles.siswaChips}>
                    {formSiswa.map(s => (
                      <span key={s.id} className={styles.siswaChip} onClick={() => setFormSiswa(formSiswa.filter(x => x.id !== s.id))}>
                        {getSiswaName(s.id, s.name)} ✕
                      </span>
                    ))}
                    <button className={styles.btnAddSiswa} onClick={() => setShowSiswaDropdown(p => !p)}>+</button>
                  </div>
                  {showSiswaDropdown && (
                    <div className={styles.siswaDropdown}>
                      {availableSiswa.map(s => (
                        <div key={s.id} className={styles.siswaDropdownItem} onClick={() => {
                          setFormSiswa([...formSiswa, { id: s.id, name: getSiswaName(s.id, s.name) }]);
                          setShowSiswaDropdown(false);
                        }}>
                          {getSiswaName(s.id, s.name)}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.siswaCount}>{formSiswa.length} siswa dipilih</div>
                </div>

                <button className={styles.btnTambah} onClick={handleTambah}>Tambahkan</button>
              </>
            ) : selectedItem && (
              <>
                <div className={styles.panelImgBox} style={{ cursor: 'default' }}>
                  {selectedItem.gambar
                    ? <img src={selectedItem.gambar} alt={selectedItem.namaKegiatan} className={styles.panelImgEl} />
                    : <div className={styles.panelImgPlaceholder}>
                        <Image src="/icongmbr.svg" alt="no img" width={36} height={36} />
                      </div>
                  }
                </div>

                <div className={styles.panelRow}>
                  <span className={styles.kelasTag}>{selectedItem.namaKegiatan}</span>
                  <span className={styles.kelasTag}>{selectedItem.kelas}</span>
                </div>

                <div className={styles.detailDate}>{selectedItem.tanggal}</div>

                {/* Chips siswa — inline editable di panel detail */}
                <div className={styles.siswaBox}>
                  <div className={styles.siswaLabel}>Siswa yang terlibat</div>
                  <div className={styles.siswaChips}>
                    {selectedItem.siswa.map(s => {
                      const displayName = getSiswaName(s.id, s.name);
                      return editingStudentId === `panel_${s.id}` ? (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <input
                            autoFocus
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveName(s.id);
                              if (e.key === 'Escape') setEditingStudentId(null);
                            }}
                            style={{
                              fontSize: '13px', fontWeight: 500,
                              border: 'none', borderBottom: '1.5px solid #FFB843',
                              background: 'transparent', outline: 'none',
                              color: '#F8F7F2', width: 100, padding: '2px 0', fontFamily: 'inherit',
                            }}
                          />
                          <button
                            onClick={() => handleSaveName(s.id)}
                            style={{
                              background: '#FFB843', border: 'none', borderRadius: 6,
                              padding: '2px 7px', fontSize: 11, fontWeight: 700,
                              cursor: 'pointer', color: '#1A1A1A',
                            }}
                          >✓</button>
                        </div>
                      ) : (
                        <span
                          key={s.id}
                          className={styles.siswaChip}
                          onClick={() => { setTempName(displayName); setEditingStudentId(`panel_${s.id}`); }}
                          title="Klik untuk ubah nama"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          {displayName}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#F8F7F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#F8F7F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.detailActions}>
                  <button className={styles.btnHapus} onClick={() => handleHapus(selectedItem.id)}>Hapus dokumentasi</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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