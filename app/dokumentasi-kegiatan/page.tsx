"use client";

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './dokumentasi.module.css';

// ─────────────────────────────
// TIPE
// ─────────────────────────────
type Siswa = { id: string; name: string };
type DokItem = {
  id: string;
  namaKegiatan: string;
  kelas: string;
  siswa: Siswa[];
  tanggal: string;
  gambar: string; // base64 atau url
};

const DUMMY_SISWA: Record<string, Siswa[]> = {
  'Kelas A': [
    { id: 'KelasA_1', name: 'Siswa 1' },
    { id: 'KelasA_2', name: 'Siswa 2' },
    { id: 'KelasA_3', name: 'Siswa 3' },
    { id: 'KelasA_4', name: 'Siswa 4' },
    { id: 'KelasA_5', name: 'Siswa 5' },
    { id: 'KelasA_6', name: 'Siswa 6' },
    { id: 'KelasA_7', name: 'Siswa 7' },
    { id: 'KelasA_8', name: 'Siswa 8' },
    { id: 'KelasA_9', name: 'Siswa 9' },
    { id: 'KelasA_10', name: 'Siswa 10' },
  ],
  'Kelas B': [
    { id: 'KelasB_1', name: 'Siswa B1' },
    { id: 'KelasB_2', name: 'Siswa B2' },
    { id: 'KelasB_3', name: 'Siswa B3' },
    { id: 'KelasB_4', name: 'Siswa B4' },
    { id: 'KelasB_5', name: 'Siswa B5' },
    { id: 'KelasB_6', name: 'Siswa B6' },
    { id: 'KelasB_7', name: 'Siswa B7' },
    { id: 'KelasB_8', name: 'Siswa B8' },
  ],
  'Kelas C': [
    { id: 'KelasC_1', name: 'Siswa C1' },
    { id: 'KelasC_2', name: 'Siswa C2' },
    { id: 'KelasC_3', name: 'Siswa C3' },
    { id: 'KelasC_4', name: 'Siswa C4' },
    { id: 'KelasC_5', name: 'Siswa C5' },
    { id: 'KelasC_6', name: 'Siswa C6' },
    { id: 'KelasC_7', name: 'Siswa C7' },
  ],
};

const ALL_KELAS = Object.keys(DUMMY_SISWA);

export default function DokumentasiPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [items, setItems] = useState<DokItem[]>([]);
  const [panel, setPanel] = useState<'none' | 'add' | 'detail'>('none');
  const [detailItem, setDetailItem] = useState<DokItem | null>(null);

  // Form state
  const [formNama, setFormNama] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formGambar, setFormGambar] = useState('');
  const [formSiswa, setFormSiswa] = useState<Siswa[]>([]);
  const [availSiswa, setAvailSiswa] = useState<Siswa[]>([]);
  const [showSiswaDropdown, setShowSiswaDropdown] = useState(false);
  const [showDetailSiswaDropdown, setShowDetailSiswaDropdown] = useState(false);

  const [toast, setToast] = useState({ visible: false, msg: '', err: false });
  const fileRef = useRef<HTMLInputElement>(null);
  const detailFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedDark = localStorage.getItem('kindo_dark');
    if (savedDark === 'true') setIsDark(true);
    const saved: DokItem[] = JSON.parse(localStorage.getItem('kindo_dokumentasi') || '[]');
    setItems(saved);
  }, []);

  useEffect(() => {
    if (formKelas) setAvailSiswa(DUMMY_SISWA[formKelas] || []);
    else setAvailSiswa([]);
    setFormSiswa([]);
  }, [formKelas]);

  const showToast = (msg: string, err = false) => {
    setToast({ visible: true, msg, err });
    setTimeout(() => setToast({ visible: false, msg: '', err: false }), 3000);
  };

  const openAdd = () => {
    setFormNama(''); setFormKelas(''); setFormGambar(''); setFormSiswa([]);
    setPanel('add');
  };

  const openDetail = (item: DokItem) => {
    setDetailItem(item);
    setPanel('detail');
  };

  const closePanel = () => {
    setPanel('none');
    setDetailItem(null);
  };

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>, isDetail = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      if (isDetail && detailItem) {
        const updated = items.map(i => i.id === detailItem.id ? { ...i, gambar: result } : i);
        setItems(updated);
        localStorage.setItem('kindo_dokumentasi', JSON.stringify(updated));
        setDetailItem({ ...detailItem, gambar: result });
      } else {
        setFormGambar(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleSiswa = (s: Siswa) => {
    setFormSiswa(prev =>
      prev.find(p => p.id === s.id)
        ? prev.filter(p => p.id !== s.id)
        : [...prev, s]
    );
  };

  const handleTambah = () => {
    if (!formNama.trim()) { showToast('Nama kegiatan wajib diisi.', true); return; }
    if (!formKelas) { showToast('Pilih kelas terlebih dahulu.', true); return; }
    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
    const newItem: DokItem = {
      id: Date.now().toString(),
      namaKegiatan: formNama,
      kelas: formKelas,
      siswa: formSiswa,
      tanggal,
      gambar: formGambar,
    };
    const updated = [newItem, ...items];
    setItems(updated);
    localStorage.setItem('kindo_dokumentasi', JSON.stringify(updated));
    showToast('Kegiatan berhasil ditambahkan!');
    closePanel();
  };

  const handleSimpanDetail = () => {
    if (!detailItem) return;
    const updated = items.map(i => i.id === detailItem.id ? detailItem : i);
    setItems(updated);
    localStorage.setItem('kindo_dokumentasi', JSON.stringify(updated));
    showToast('Kegiatan berhasil disimpan!');
    closePanel();
  };

  const handleDetailKelasChange = (kelas: string) => {
    if (!detailItem) return;
    setDetailItem({ ...detailItem, kelas, siswa: [] });
  };

  const toggleDetailSiswa = (s: Siswa) => {
    if (!detailItem) return;
    const exists = detailItem.siswa.find(p => p.id === s.id);
    setDetailItem({
      ...detailItem,
      siswa: exists
        ? detailItem.siswa.filter(p => p.id !== s.id)
        : [...detailItem.siswa, s],
    });
  };

  const handleHapus = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem('kindo_dokumentasi', JSON.stringify(updated));
    closePanel();
    showToast('Kegiatan dihapus.');
  };

  const formatSiswaLabel = (siswa: Siswa[]) => {
    if (siswa.length === 0) return '-';
    if (siswa.length <= 2) return siswa.map(s => s.name).join(', ');
    return `${siswa.length} Siswa`;
  };

  const isPanelOpen = panel !== 'none';

  return (
    <div className={`${styles.page} ${isDark ? styles.dark : ''}`}>

      {/* ── HEADER ── */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>Dokumentasi Kegiatan</div>
      </div>

      {/* ── GRID CARDS — 369×142 ── */}
      <div className={styles.content}>
        <div className={styles.grid}>
          {items.map(item => (
            <div key={item.id} className={styles.card}>
              {/* Gambar 369×142 */}
              <div className={styles.cardImg}>
                {item.gambar ? (
                  <img src={item.gambar} alt={item.namaKegiatan} className={styles.cardImgEl} />
                ) : (
                  <Image src="/icongmbr.svg" alt="img" width={40} height={40} className={styles.cardImgPlaceholder} />
                )}
              </div>
              {/* Info + tombol */}
              <div className={styles.cardFooter}>
                <div className={styles.cardInfo}>
                  <div className={styles.cardNama}>{item.namaKegiatan}</div>
                  <div className={styles.cardSub}>{item.tanggal} · {formatSiswaLabel(item.siswa)}</div>
                </div>
                <button className={styles.btnLihat} onClick={() => openDetail(item)}>
                  Lihat selengkapnya
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tambah kegiatan */}
        <div className={styles.tambahRow}>
          <span className={styles.tambahLabel}>Tambah kegiatan</span>
          <button className={styles.btnPlus} onClick={openAdd}>+</button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          PANEL — Add / Detail (492×669)
      ══════════════════════════════════════ */}
      {isPanelOpen && (
        <div className={styles.panelOverlay} onClick={e => { if (e.target === e.currentTarget) closePanel(); }}>
          <div className={styles.panelCard}>

            {/* Tutup */}
            <button className={styles.btnClose} onClick={closePanel}>✕</button>

            {panel === 'add' ? (
              /* ── ADD MODE ── */
              <>
                {/* Kotak gambar 467×225 */}
                <div className={styles.panelImgBox} onClick={() => fileRef.current?.click()}>
                  {formGambar ? (
                    <img src={formGambar} alt="preview" className={styles.panelImgEl} />
                  ) : (
                    <div className={styles.panelImgPlaceholder}>
                      <Image src="/icongmbr.svg" alt="img" width={36} height={36} />
                      <span className={styles.panelImgHint}>&quot;Pilih gambar&quot;</span>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePickImage(e, false)} />
                </div>

                {/* Nama kegiatan + Pilih kelas — 230×50 each */}
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
                    onChange={e => setFormKelas(e.target.value)}
                  >
                    <option value="">Pilih kelas</option>
                    {ALL_KELAS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                {/* Tambah siswa — 468×233 */}
                <div className={styles.siswaBox}>
                  <div className={styles.siswaLabel}>Tambah siswa</div>
                  <div className={styles.siswaChips}>
                    {formSiswa.map(s => (
                      <div key={s.id} className={styles.siswaChip} onClick={() => toggleSiswa(s)}>
                        {s.name} ✕
                      </div>
                    ))}
                    {formKelas && (
                      <button
                        className={styles.btnAddSiswa}
                        onClick={() => setShowSiswaDropdown(p => !p)}
                      >+</button>
                    )}
                  </div>
                  {showSiswaDropdown && (
                    <div className={styles.siswaDropdown}>
                      {availSiswa.filter(s => !formSiswa.find(f => f.id === s.id)).map(s => (
                        <div key={s.id} className={styles.siswaDropdownItem}
                          onClick={() => { toggleSiswa(s); setShowSiswaDropdown(false); }}>
                          {s.name}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className={styles.siswaCount}>Jumlah: {formSiswa.length}</div>
                </div>

                {/* Tombol Tambah 468×55 kuning */}
                <button className={styles.btnTambah} onClick={handleTambah}>Tambah</button>
              </>
            ) : (
              /* ── DETAIL MODE — semua bisa diedit ── */
              <>
                {/* Kotak gambar — klik untuk ganti */}
                <div className={styles.panelImgBox} onClick={() => detailFileRef.current?.click()}>
                  {detailItem?.gambar ? (
                    <img src={detailItem.gambar} alt="preview" className={styles.panelImgEl} />
                  ) : (
                    <div className={styles.panelImgPlaceholder}>
                      <Image src="/icongmbr.svg" alt="img" width={36} height={36} />
                      <span className={styles.panelImgHint}>&quot;Pilih gambar&quot;</span>
                    </div>
                  )}
                  <input ref={detailFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePickImage(e, true)} />
                </div>

                {/* Nama kegiatan + Pilih kelas — keduanya editable */}
                <div className={styles.panelRow}>
                  <input
                    className={styles.inputNama}
                    placeholder="Nama kegiatan"
                    value={detailItem?.namaKegiatan || ''}
                    onChange={e => detailItem && setDetailItem({ ...detailItem, namaKegiatan: e.target.value })}
                  />
                  <select
                    className={styles.selectKelas}
                    value={detailItem?.kelas || ''}
                    onChange={e => handleDetailKelasChange(e.target.value)}
                  >
                    <option value="">Pilih kelas</option>
                    {ALL_KELAS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                {/* Tambah/hapus siswa — sama dengan add mode */}
                <div className={styles.siswaBox}>
                  <div className={styles.siswaLabel}>Tambah siswa</div>
                  <div className={styles.siswaChips}>
                    {detailItem?.siswa.map(s => (
                      <div
                        key={s.id}
                        className={styles.siswaChip}
                        onClick={() => toggleDetailSiswa(s)}
                        title="Klik untuk hapus"
                      >
                        {s.name} ✕
                      </div>
                    ))}
                    {detailItem?.kelas && (
                      <button
                        className={styles.btnAddSiswa}
                        onClick={() => setShowDetailSiswaDropdown(p => !p)}
                      >+</button>
                    )}
                  </div>

                  {/* Dropdown siswa yang belum dipilih */}
                  {showDetailSiswaDropdown && detailItem?.kelas && (
                    <div className={styles.siswaDropdown}>
                      {(DUMMY_SISWA[detailItem.kelas] || [])
                        .filter(s => !detailItem.siswa.find(f => f.id === s.id))
                        .map(s => (
                          <div
                            key={s.id}
                            className={styles.siswaDropdownItem}
                            onClick={() => { toggleDetailSiswa(s); setShowDetailSiswaDropdown(false); }}
                          >
                            {s.name}
                          </div>
                        ))
                      }
                      {(DUMMY_SISWA[detailItem.kelas] || []).filter(s => !detailItem.siswa.find(f => f.id === s.id)).length === 0 && (
                        <div className={styles.siswaDropdownItem} style={{ color: '#A8A8A8', cursor: 'default' }}>
                          Semua siswa sudah ditambahkan
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.siswaCount}>Jumlah: {detailItem?.siswa.length ?? 0}</div>
                </div>

                {/* Tanggal */}
                <div className={styles.detailDate}>{detailItem?.tanggal}</div>

                {/* Actions */}
                <div className={styles.detailActions}>
                  <button className={styles.btnTambah} onClick={handleSimpanDetail}>Simpan</button>
                  <button className={styles.btnHapus} onClick={() => detailItem && handleHapus(detailItem.id)}>
                    Hapus kegiatan
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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