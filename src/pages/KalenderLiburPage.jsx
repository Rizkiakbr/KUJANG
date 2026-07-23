import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Plus, Trash2, Calendar, Info } from 'lucide-react';
import { getHolidays, addHoliday, removeHoliday } from '../services/holidayService';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import Topbar from '../components/layout/Topbar';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];

/**
 * KalenderLiburPage — Halaman manajemen hari libur nasional
 * Role: kepala-seksi, pelaksana
 * Route: /kalender-libur
 */
export default function KalenderLiburPage() {
  const { userData } = useAuthStore();
  const qc = useQueryClient();

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [newDate, setNewDate]   = useState('');
  const [newName, setNewName]   = useState('');
  const [addError, setAddError] = useState('');

  // ── Query: load holidays ──
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', selectedYear],
    queryFn:  () => getHolidays(selectedYear),
    staleTime: 1000 * 60 * 5,
  });

  // ── Mutation: tambah libur ──
  const addMut = useMutation({
    mutationFn: ({ date, name }) =>
      addHoliday(selectedYear, { date, name }, userData?.uid || 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays', selectedYear] });
      setNewDate('');
      setNewName('');
      setAddError('');
    },
    onError: (err) => setAddError(err.message),
  });

  // ── Mutation: hapus libur ──
  const removeMut = useMutation({
    mutationFn: (date) =>
      removeHoliday(selectedYear, date, userData?.uid || 'unknown'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays', selectedYear] });
    },
  });

  const handleAdd = () => {
    setAddError('');
    if (!newDate) { setAddError('Tanggal wajib diisi'); return; }
    if (!newName.trim()) { setAddError('Nama hari libur wajib diisi'); return; }

    // Validasi tahun sesuai selectedYear
    const inputYear = parseInt(newDate.split('-')[0], 10);
    if (inputYear !== selectedYear) {
      setAddError(`Tanggal harus berada di tahun ${selectedYear}`);
      return;
    }

    // Cegah duplikasi
    if (holidays.some(h => h.date === newDate)) {
      setAddError('Tanggal tersebut sudah ada dalam daftar libur');
      return;
    }

    addMut.mutate({ date: newDate, name: newName.trim() });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={20} className="text-teal-600" />
            <h1 className="text-xl font-bold text-navy">Kalender Libur Nasional</h1>
          </div>
          <p className="text-sm text-gray-500">
            Kelola daftar hari libur nasional yang digunakan untuk kalkulasi jatuh tempo kasus.
          </p>
        </div>

        {/* ── Info Banner ── */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
          <Info size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <p>
            Perubahan kalender libur akan mempengaruhi kalkulasi jatuh tempo{' '}
            <strong>kasus baru</strong> yang diinput setelah perubahan ini.
            Data jatuh tempo kasus lama yang sudah tersimpan di Firestore{' '}
            <strong>tidak otomatis berubah</strong>.
          </p>
        </div>

        {/* ── Pilih Tahun ── */}
        <div className="flex items-center gap-3 mb-5">
          <label className="text-sm font-semibold text-gray-600 shrink-0">Tahun:</label>
          <select
            id="select-tahun"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="form-input w-32"
          >
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400">
            {isLoading ? 'Memuat...' : `${holidays.length} hari libur`}
          </span>
        </div>

        {/* ── Form Tambah ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Plus size={14} />
            Tambah Hari Libur
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="input-tanggal-libur"
              type="date"
              value={newDate}
              min={`${selectedYear}-01-01`}
              max={`${selectedYear}-12-31`}
              onChange={e => setNewDate(e.target.value)}
              className="form-input sm:w-44"
              placeholder="Tanggal"
            />
            <input
              id="input-nama-libur"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Nama hari libur, cth: Hari Kemerdekaan RI"
              className="form-input flex-1"
            />
            <button
              id="btn-tambah-libur"
              onClick={handleAdd}
              disabled={addMut.isPending}
              className="btn-primary px-4 py-2 text-sm flex items-center gap-1 shrink-0"
            >
              {addMut.isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Tambah
            </button>
          </div>
          {addError && (
            <p className="form-error mt-2">{addError}</p>
          )}
        </div>

        {/* ── Tabel Daftar Libur ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Memuat data...</div>
          ) : holidays.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Belum ada data libur untuk tahun {selectedYear}.
              <br />
              <span className="text-xs">Tambahkan melalui form di atas.</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 w-10">No</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500 w-40">Tanggal</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-500">Nama Hari Libur</th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-gray-500 w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h, idx) => (
                  <tr
                    key={h.date}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-2.5 px-4 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-gray-700">
                      {format(parseISO(h.date), 'dd MMM yyyy', { locale: idLocale })}
                    </td>
                    <td className="py-2.5 px-4 text-gray-800">{h.name}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        id={`btn-hapus-${h.date}`}
                        onClick={() => removeMut.mutate(h.date)}
                        disabled={removeMut.isPending}
                        title="Hapus hari libur ini"
                        className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer note ── */}
        <p className="text-xs text-gray-400 mt-4 text-center">
          Data disimpan di Firestore collection <code className="bg-gray-100 px-1 rounded">holidayCalendar/{selectedYear}</code>
        </p>
      </main>
    </div>
  );
}
