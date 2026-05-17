// lib/supabase.ts
// ─────────────────────────────────────────────────────────────
// Satu file terpusat untuk semua operasi Supabase di Kindo.
// Letakkan di: src/lib/supabase.ts
// ─────────────────────────────────────────────────────────────

import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════════════════
// TABEL SUPABASE YANG DIBUTUHKAN
// Jalankan SQL ini di Supabase Dashboard → SQL Editor:
// ═══════════════════════════════════════════════════════════════
//
// -- 1. Nama siswa
// create table student_names (
//   id text primary key,           -- e.g. "KelasA_1"
//   name text not null,
//   updated_at timestamptz default now()
// );
//
// -- 2. Foto siswa (URL dari Supabase Storage)
// create table student_photos (
//   id text primary key,
//   url text not null,
//   updated_at timestamptz default now()
// );
//
// -- 3. Absensi siswa
// create table attendance (
//   siswa_id text not null,
//   date text not null,            -- format YYYY-MM-DD
//   status text not null,          -- "Hadir" | "Sakit" | "Izin" | "Alfa"
//   updated_at timestamptz default now(),
//   primary key (siswa_id, date)
// );
//
// -- 4. Penilaian / Rapor
// create table assessments (
//   siswa_id text primary key,
//   data jsonb not null,
//   updated_at timestamptz default now()
// );
//
// -- 5. SPP
// create table spp_records (
//   id text primary key,
//   siswa_id text not null,
//   bulan text not null,
//   tahun text not null default '2026',
//   nominal integer not null,
//   status text not null default 'belum',  -- "lunas" | "belum" | "reminder_sent"
//   jatuh_tempo text,
//   lunas_at text,
//   notif_sent boolean default false,
//   updated_at timestamptz default now()
// );
//
// -- 6. Dokumentasi kegiatan
// create table dokumentasi (
//   id text primary key,
//   data jsonb not null,
//   updated_at timestamptz default now()
// );
//
// -- 7. Notifikasi (izin, SPP, absen guru, dll.)
// create table notifications (
//   id bigserial primary key,
//   type text not null,            -- "izin" | "spp_pay" | "spp_reminder" | "absen_guru"
//   data jsonb not null,
//   read boolean default false,
//   created_at timestamptz default now()
// );
//
// -- 8. Profil guru
// create table profiles (
//   id text primary key,           -- "guru" | user_id
//   nama text,
//   tanggal_lahir text,
//   photo_url text,
//   updated_at timestamptz default now()
// );
//
// -- 9. Profil orang tua
// create table profiles_ortu (
//   id text primary key,           -- siswa_id yang diasuh
//   nama text,
//   tanggal_lahir text,
//   updated_at timestamptz default now()
// );
//
// -- 10. Absen guru (QR scan)
// create table absen_guru (
//   id text primary key,           -- "datang_{tanggal}" | "pulang_{tanggal}"
//   nik text,
//   sesi text not null,            -- "datang" | "pulang"
//   tanggal text not null,
//   jam text not null,
//   telat boolean default false,
//   created_at timestamptz default now()
// );
//
// -- 11. Izin siswa (dari orang tua)
// create table izin_requests (
//   id bigint primary key,
//   siswa_id text not null,
//   siswa_name text,
//   kelas text,
//   type text not null,            -- "izin" | "sakit"
//   alasan text,
//   date text not null,
//   status text default 'pending', -- "pending" | "approved" | "rejected"
//   created_at timestamptz default now()
// );
//
// -- 12. Kegiatan harian guru
// create table kegiatan_harian (
//   tanggal text primary key,
//   items jsonb not null,
//   updated_at timestamptz default now()
// );
//
// -- Aktifkan Realtime untuk tabel student_names & notifications:
// alter publication supabase_realtime add table student_names;
// alter publication supabase_realtime add table notifications;
// alter publication supabase_realtime add table izin_requests;
// alter publication supabase_realtime add table absen_guru;

// ═══════════════════════════════════════════════════════════════
// STORAGE BUCKET
// Buat bucket bernama "student-photos" di Supabase → Storage
// Set ke Public agar URL bisa langsung dipakai di <img>
// ═══════════════════════════════════════════════════════════════
// ─────────────────────────────────────────
// TAMBAHKAN fungsi ini ke lib/supabase.ts
// ─────────────────────────────────────────

// Realtime subscription — penilaian siswa
// Dipakai di halaman ortu agar penilaian langsung update saat guru simpan
export function subscribeAssessments(
  onChange: (assessments: Record<string, any>) => void
) {
  return supabase
    .channel('assessments_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'assessments' },
      async () => {
        const data = await fetchAssessments();
        onChange(data);
      }
    )
    .subscribe();
}

// Realtime subscription — kegiatan harian
// (jika belum ada di supabase.ts kamu)
export function subscribeKegiatanHarian(
  tanggal: string,
  onChange: (items: { id: number; text: string; time: string }[]) => void
) {
  return supabase
    .channel('kegiatan_harian_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kegiatan_harian' },
      async () => {
        const items = await fetchKegiatanHarian(tanggal);
        onChange(items);
      }
    )
    .subscribe();
}


// ─────────────────────────────────────────
// 1. NAMA SISWA
// ─────────────────────────────────────────

export async function fetchStudentNames(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('student_names').select('id, name');
  if (error) { console.error('fetchStudentNames:', error); return {}; }
  return Object.fromEntries((data ?? []).map((r: any) => [r.id, r.name]));
}

export async function upsertStudentName(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('student_names')
    .upsert({ id, name, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.error('upsertStudentName:', error);
}

export function subscribeStudentNames(
  onChange: (names: Record<string, string>) => void
): RealtimeChannel {
  const channel = supabase
    .channel('student_names_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_names' }, async () => {
      const updated = await fetchStudentNames();
      onChange(updated);
    })
    .subscribe();
  return channel;
}


// ─────────────────────────────────────────
// 2. FOTO SISWA (Supabase Storage)
// ─────────────────────────────────────────

export async function fetchStudentPhotos(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('student_photos').select('id, url');
  if (error) { console.error('fetchStudentPhotos:', error); return {}; }
  return Object.fromEntries((data ?? []).map((r: any) => [r.id, r.url]));
}

export async function upsertStudentPhoto(siswaId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${siswaId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('student-photos')
    .upload(path, file, { upsert: true });

  if (uploadError) { console.error('upsertStudentPhoto upload:', uploadError); return null; }

  const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(path);
  const url = urlData?.publicUrl ?? null;
  if (!url) return null;

  await supabase
    .from('student_photos')
    .upsert({ id: siswaId, url, updated_at: new Date().toISOString() }, { onConflict: 'id' });

  return url;
}

export async function deleteStudentPhoto(siswaId: string): Promise<void> {
  // Hapus dari Storage (coba semua ekstensi umum)
  const exts = ['jpg', 'jpeg', 'png', 'webp'];
  await Promise.allSettled(
    exts.map(ext => supabase.storage.from('student-photos').remove([`${siswaId}.${ext}`]))
  );
  await supabase.from('student_photos').delete().eq('id', siswaId);
}


// ─────────────────────────────────────────
// 3. ABSENSI SISWA
// ─────────────────────────────────────────

export async function fetchAttendance(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('attendance').select('siswa_id, date, status');
  if (error) { console.error('fetchAttendance:', error); return {}; }
  return Object.fromEntries((data ?? []).map((r: any) => [`${r.siswa_id}_${r.date}`, r.status]));
}

export async function upsertAttendance(siswaId: string, date: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .upsert(
      { siswa_id: siswaId, date, status, updated_at: new Date().toISOString() },
      { onConflict: 'siswa_id,date' }
    );
  if (error) console.error('upsertAttendance:', error);
}


// ─────────────────────────────────────────
// 4. PENILAIAN / RAPOR
// ─────────────────────────────────────────

export async function fetchAssessments(): Promise<Record<string, any>> {
  const { data, error } = await supabase.from('assessments').select('siswa_id, data');
  if (error) { console.error('fetchAssessments:', error); return {}; }
  return Object.fromEntries((data ?? []).map((r: any) => [r.siswa_id, r.data]));
}

export async function upsertAssessment(siswaId: string, data: any): Promise<void> {
  const { error } = await supabase
    .from('assessments')
    .upsert(
      { siswa_id: siswaId, data, updated_at: new Date().toISOString() },
      { onConflict: 'siswa_id' }
    );
  if (error) console.error('upsertAssessment:', error);
}


// ─────────────────────────────────────────
// 5. SPP
// ─────────────────────────────────────────

export async function fetchSppRecords(): Promise<any[]> {
  const { data, error } = await supabase
    .from('spp_records')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) { console.error('fetchSppRecords:', error); return []; }
  return data ?? [];
}

export async function upsertSppRecord(record: {
  id: string;
  siswa_id: string;
  bulan: string;
  nominal: number;
  status?: string;
  jatuh_tempo?: string;
  lunas_at?: string;
  notif_sent?: boolean;
  tahun?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('spp_records')
    .upsert({ ...record, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.error('upsertSppRecord:', error);
}


// ─────────────────────────────────────────
// 6. DOKUMENTASI KEGIATAN
// ─────────────────────────────────────────

export async function fetchDokumentasi(): Promise<any[]> {
  const { data, error } = await supabase
    .from('dokumentasi')
    .select('id, data')
    .order('updated_at', { ascending: false });
  if (error) { console.error('fetchDokumentasi:', error); return []; }
  return (data ?? []).map((r: any) => ({ id: r.id, ...r.data }));
}

export async function upsertDokumentasi(id: string, data: any): Promise<void> {
  const { error } = await supabase
    .from('dokumentasi')
    .upsert({ id, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.error('upsertDokumentasi:', error);
}

export async function deleteDokumentasi(id: string): Promise<void> {
  const { error } = await supabase.from('dokumentasi').delete().eq('id', id);
  if (error) console.error('deleteDokumentasi:', error);
}


// ─────────────────────────────────────────
// 7. NOTIFIKASI (general)
// ─────────────────────────────────────────

export async function fetchNotifications(type?: string): Promise<any[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  if (type) query = query.eq('type', type);
  const { data, error } = await query;
  if (error) { console.error('fetchNotifications:', error); return []; }
  return data ?? [];
}

export async function insertNotification(type: string, data: any): Promise<void> {
  const { error } = await supabase.from('notifications').insert({ type, data, read: false });
  if (error) console.error('insertNotification:', error);
}

export async function markNotificationsRead(type?: string): Promise<void> {
  let query = supabase.from('notifications').update({ read: true }).eq('read', false);
  if (type) query = query.eq('type', type);
  const { error } = await query;
  if (error) console.error('markNotificationsRead:', error);
}

export function subscribeNotifications(
  type: string,
  onChange: () => void
): RealtimeChannel {
  const channel = supabase
    .channel(`notifications_${type}`)
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `type=eq.${type}` },
      onChange
    )
    .subscribe();
  return channel;
}


// ─────────────────────────────────────────
// 8. PROFIL GURU
// ─────────────────────────────────────────

export async function fetchProfileGuru(): Promise<{
  nama: string;
  tanggal_lahir: string;
  photo_url: string;
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('nama, tanggal_lahir, photo_url')
    .eq('id', 'guru')
    .single();
  if (error) { console.error('fetchProfileGuru:', error); return null; }
  return data;
}

export async function upsertProfileGuru(profile: {
  nama?: string;
  tanggal_lahir?: string;
  photo_url?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: 'guru', ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.error('upsertProfileGuru:', error);
}

export async function uploadProfilePhoto(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `guru/profile.${ext}`;
  const { error } = await supabase.storage
    .from('student-photos')
    .upload(path, file, { upsert: true });
  if (error) { console.error('uploadProfilePhoto:', error); return null; }
  const { data } = supabase.storage.from('student-photos').getPublicUrl(path);
  return data?.publicUrl ?? null;
}


// ─────────────────────────────────────────
// 9. PROFIL ORANG TUA
// ─────────────────────────────────────────

export async function fetchProfileOrtu(siswaId: string): Promise<{
  nama: string;
  tanggal_lahir: string;
} | null> {
  const { data, error } = await supabase
    .from('profiles_ortu')
    .select('nama, tanggal_lahir')
    .eq('id', siswaId)
    .single();
  if (error) { console.error('fetchProfileOrtu:', error); return null; }
  return data;
}

export async function upsertProfileOrtu(siswaId: string, profile: {
  nama?: string;
  tanggal_lahir?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('profiles_ortu')
    .upsert({ id: siswaId, ...profile, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) console.error('upsertProfileOrtu:', error);
}


// ─────────────────────────────────────────
// 10. ABSEN GURU (QR scan)
// ─────────────────────────────────────────

export async function fetchAbsenGuru(tanggal: string): Promise<{
  datang: { jam: string; telat: boolean } | null;
  pulang: { jam: string } | null;
}> {
  const { data, error } = await supabase
    .from('absen_guru')
    .select('sesi, jam, telat')
    .eq('tanggal', tanggal);

  if (error) { console.error('fetchAbsenGuru:', error); return { datang: null, pulang: null }; }

  const datang = data?.find((r: any) => r.sesi === 'datang');
  const pulang = data?.find((r: any) => r.sesi === 'pulang');

  return {
    datang: datang ? { jam: datang.jam, telat: datang.telat } : null,
    pulang: pulang ? { jam: pulang.jam } : null,
  };
}

export async function insertAbsenGuru(payload: {
  sesi: 'datang' | 'pulang';
  tanggal: string;
  jam: string;
  nik?: string;
  telat?: boolean;
}): Promise<void> {
  const id = `${payload.sesi}_${payload.tanggal}`;
  const { error } = await supabase
    .from('absen_guru')
    .upsert({ id, ...payload }, { onConflict: 'id' });
  if (error) console.error('insertAbsenGuru:', error);
}


// ─────────────────────────────────────────
// 11. IZIN SISWA
// ─────────────────────────────────────────

export async function fetchIzinRequests(): Promise<any[]> {
  const { data, error } = await supabase
    .from('izin_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchIzinRequests:', error); return []; }
  return data ?? [];
}

export async function fetchIzinByDateAndSiswa(siswaId: string, date: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('izin_requests')
    .select('*')
    .eq('siswa_id', siswaId)
    .eq('date', date)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data;
}

export async function upsertIzinRequest(req: {
  id: number;
  siswa_id: string;
  siswa_name: string;
  kelas?: string;
  type: 'izin' | 'sakit';
  alasan: string;
  date: string;
  status?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('izin_requests')
    .upsert({ ...req, status: req.status ?? 'pending' }, { onConflict: 'id' });
  if (error) console.error('upsertIzinRequest:', error);
}

export async function updateIzinStatus(
  id: number,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('izin_requests')
    .update({ status })
    .eq('id', id);
  if (error) console.error('updateIzinStatus:', error);
}

export function subscribeIzinRequests(onChange: () => void): RealtimeChannel {
  const channel = supabase
    .channel('izin_requests_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'izin_requests' }, onChange)
    .subscribe();
  return channel;
}


// ─────────────────────────────────────────
// 12. KEGIATAN HARIAN GURU
// ─────────────────────────────────────────

export async function fetchKegiatanHarian(tanggal: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('kegiatan_harian')
    .select('items')
    .eq('tanggal', tanggal)
    .single();
  if (error) return [];
  return data?.items ?? [];
}

export async function upsertKegiatanHarian(tanggal: string, items: any[]): Promise<void> {
  const { error } = await supabase
    .from('kegiatan_harian')
    .upsert({ tanggal, items, updated_at: new Date().toISOString() }, { onConflict: 'tanggal' });
  if (error) console.error('upsertKegiatanHarian:', error);
}

export function subscribeKegiatanHarian(
  tanggal: string,
  onChange: (items: any[]) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`kegiatan_${tanggal}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'kegiatan_harian', filter: `tanggal=eq.${tanggal}` },
      async (payload: any) => {
        onChange(payload.new?.items ?? []);
      }
    )
    .subscribe();
  return channel;
}