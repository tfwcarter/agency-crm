"use client";

import { useMemo, useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { createCallListFromCsvAction } from "@/lib/actions/call-lists";
import { parseCsv, detectColumns, rowsFromMapping, CSV_FIELDS, type CsvField } from "@/lib/csv";
import { Input, Select, Button, Badge } from "@/components/ui/primitives";

type Team = { id: string; name: string | null; email: string }[];

const PREVIEW_ROWS = 6;

export function CsvImportWizard({ team, today }: { team: Team; today: string }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<CsvField, number>>({} as Record<CsvField, number>);
  const [parseError, setParseError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setParseError(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setParseError("That file has a header row but no data rows.");
        setFileName(file.name);
        setHeaders([]);
        setDataRows([]);
        return;
      }
      const hdr = rows[0];
      const data = rows.slice(1);
      setFileName(file.name);
      setHeaders(hdr);
      setDataRows(data);
      setMapping(detectColumns(hdr, data));
    } catch {
      setParseError("Couldn't read that file. Make sure it's a plain .csv export.");
    }
  }

  const rows = useMemo(() => (headers.length ? rowsFromMapping(dataRows, mapping) : []), [dataRows, mapping, headers.length]);

  const stats = useMemo(() => {
    const withPhone = rows.filter((r) => r.phone).length;
    const withLocation = rows.filter((r) => r.address || r.city || r.state).length;
    const names = rows.map((r) => r.businessName.trim().toLowerCase());
    const dupes = names.length - new Set(names).size;
    const skipped = dataRows.length - rows.length;
    return { total: rows.length, withPhone, withLocation, dupes, skipped };
  }, [rows, dataRows.length]);

  const hasName = mapping.businessName >= 0;
  const ready = hasName && rows.length > 0;

  function setField(field: CsvField, value: string) {
    setMapping((prev) => ({ ...prev, [field]: Number(value) }));
  }

  return (
    <div className="space-y-5">
      {/* dropzone */}
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-hover/50 px-4 py-8 text-center transition-colors hover:border-brand">
        <UploadCloud size={26} className="text-brand" />
        <span className="text-sm font-medium text-fg">
          {fileName ? `Selected: ${fileName}` : "Choose a CSV file to scan"}
        </span>
        <span className="text-xs text-fg-subtle">
          We detect the columns automatically — you can double-check them below before importing.
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {parseError && (
        <p className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertTriangle size={14} /> {parseError}
        </p>
      )}

      {headers.length > 0 && (
        <>
          {/* detected-column mapping — the "double check" */}
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <FileSpreadsheet size={13} /> Detected columns
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CSV_FIELDS.map(({ key, label, required }) => {
                const detected = mapping[key] >= 0;
                return (
                  <label key={key} className="block">
                    <span className="mb-1 flex items-center justify-between text-xs font-medium text-fg-muted">
                      <span>
                        {label} {required && <span className="text-danger">*</span>}
                      </span>
                      {detected ? (
                        <span className="flex items-center gap-1 text-[10px] font-normal text-accent">
                          <CheckCircle2 size={11} /> detected
                        </span>
                      ) : required ? (
                        <span className="text-[10px] font-normal text-danger">not found</span>
                      ) : null}
                    </span>
                    <Select value={String(mapping[key] ?? -1)} onChange={(e) => setField(key, e.target.value)}>
                      <option value="-1">— none —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h.trim() || `Column ${i + 1}`}
                        </option>
                      ))}
                    </Select>
                  </label>
                );
              })}
            </div>
          </div>

          {/* validation stats */}
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{stats.total} contacts ready</Badge>
            <Badge tone={stats.withPhone > 0 ? "success" : "default"}>{stats.withPhone} with phone</Badge>
            <Badge tone="default">{stats.withLocation} with location</Badge>
            {stats.dupes > 0 && <Badge tone="warning">{stats.dupes} duplicate name{stats.dupes === 1 ? "" : "s"} (merged)</Badge>}
            {stats.skipped > 0 && <Badge tone="warning">{stats.skipped} row{stats.skipped === 1 ? "" : "s"} skipped (no name)</Badge>}
          </div>

          {!hasName && (
            <p className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertTriangle size={14} /> Pick which column holds the business name to continue.
            </p>
          )}

          {/* preview table */}
          {ready && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                Preview ({Math.min(PREVIEW_ROWS, rows.length)} of {rows.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-hover text-fg-subtle">
                    <tr>
                      {CSV_FIELDS.filter((f) => mapping[f.key] >= 0).map((f) => (
                        <th key={f.key} className="whitespace-nowrap px-2.5 py-2 font-medium">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                      <tr key={i} className="border-t border-border">
                        {CSV_FIELDS.filter((f) => mapping[f.key] >= 0).map((f) => (
                          <td key={f.key} className="max-w-[180px] truncate px-2.5 py-1.5 text-fg-muted">
                            {r[f.key] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* confirm form */}
          <form action={createCallListFromCsvAction} className="space-y-4 border-t border-border pt-4">
            <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-fg-muted">
                  List name <span className="text-danger">*</span>
                </span>
                <Input name="name" placeholder="Imported list" required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-fg-muted">Date</span>
                <Input name="forDate" type="date" defaultValue={today} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-fg-muted">Assign to</span>
                <Select name="assignedToId" defaultValue="">
                  <option value="">Unassigned</option>
                  {team.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!ready}>
                Create call list from {rows.length} contact{rows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
