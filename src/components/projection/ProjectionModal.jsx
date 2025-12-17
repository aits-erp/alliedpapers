"use client";
import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

const MONTHS = ["January","February","March","April","May","June","July",
"August","September","October","November","December"];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

const ZONES = ["East", "West", "South", "Bang"];
const LINERS = ["Plain", "Inprint", "PET", "Yellow printed"];
const GROUPS = ["Thermal", "Paper", "Film", "Film PET", "Sheet", "Spl", "PET+paper"];

const emptyRow = {
  zone: "", productCode: "", productName: "", qty: "",
  liner: "", group: "", remark: ""
};

export default function ProjectionModal({ open, onClose, onSaved }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(MONTHS[today.getMonth()]);
  const [rows, setRows] = useState([emptyRow]);

  if (!open) return null;

  const updateRow = (i, e) => {
    const copy = [...rows];
    copy[i][e.target.name] =
      e.target.name === "productCode"
        ? e.target.value.toUpperCase()
        : e.target.value;
    setRows(copy);
  };

  const save = async () => {
    const token = localStorage.getItem("token");
    await fetch("/api/projection", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ year, month, rows }),
    });
    onSaved();
    onClose();
    setRows([emptyRow]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[95%] max-w-6xl shadow-xl p-6 animate-scale">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-xl font-semibold">📊 Add Projection</h2>
          <button onClick={onClose}><X /></button>
        </div>

        {/* YEAR & MONTH */}
        <div className="flex gap-4 mt-4">
          <select value={year} onChange={e => setYear(e.target.value)} className="input">
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(e.target.value)} className="input">
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        {/* TABLE */}
        <div className="mt-4 space-y-2 max-h-[55vh] overflow-auto">
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-9 gap-2 items-center bg-gray-50 p-2 rounded-xl">
              <select name="zone" onChange={e => updateRow(i, e)} className="input">
                <option>Zone</option>
                {ZONES.map(z => <option key={z}>{z}</option>)}
              </select>

              <input name="productCode" placeholder="ITEM" className="input"
                onChange={e => updateRow(i, e)} />
              <input name="productName" placeholder="Product" className="input"
                onChange={e => updateRow(i, e)} />
              <input type="number" name="qty" placeholder="Qty" className="input"
                onChange={e => updateRow(i, e)} />

              <select name="liner" onChange={e => updateRow(i, e)} className="input">
                <option>Liner</option>
                {LINERS.map(l => <option key={l}>{l}</option>)}
              </select>

              <select name="group" onChange={e => updateRow(i, e)} className="input">
                <option>Group</option>
                {GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>

              <input name="remark" placeholder="Remark" className="input"
                onChange={e => updateRow(i, e)} />

              <button onClick={() => setRows(rows.filter((_, x) => x !== i))}
                className="text-red-500">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div className="flex justify-between mt-4">
          <button onClick={() => setRows([...rows, emptyRow])}
            className="flex items-center gap-2 text-blue-600">
            <Plus size={18} /> Add Row
          </button>

          <button onClick={save}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl">
            Save Projection
          </button>
        </div>
      </div>
    </div>
  );
}
