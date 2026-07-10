import { useState } from 'react';

/**
 * CurrencyField — input nominal rupiah dengan format otomatis
 * @param {{ name, label, placeholder, hint, readOnly, value, onChange, register?, setValue? }} props
 */
export default function CurrencyField({ name, label, placeholder, hint, readOnly = false, defaultValue, setValue }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (defaultValue == null) return '';
    return parseInt(defaultValue).toLocaleString('id-ID');
  });

  const handleChange = (e) => {
    if (readOnly) return;
    // Hapus semua non-digit
    const raw = e.target.value.replace(/\D/g, '');
    // Format dengan titik ribuan untuk display
    const formatted = raw ? parseInt(raw).toLocaleString('id-ID') : '';
    setDisplayValue(formatted);
    // Set ke form sebagai number
    if (setValue) {
      setValue(name, raw ? parseInt(raw) : null);
    }
  };

  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm pointer-events-none">
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`form-input pl-9 ${readOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
        />
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
