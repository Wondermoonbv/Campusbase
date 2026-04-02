import { useState, useRef, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet, Copy } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  validate?: (value: string) => string | null;
}

export interface ImportDuplicateCheck {
  keys: string[];
  existingData: Record<string, string>[];
}

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: ImportColumn[];
  onImport: (rows: Record<string, string>[]) => Promise<void> | void;
  templateFilename: string;
  duplicateCheck?: ImportDuplicateCheck;
}

type Step = "upload" | "mapping" | "preview";

function parseFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        resolve(json.filter((row) => row.some((cell) => String(cell).trim())));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function autoMapColumns(headerRow: string[], columns: ImportColumn[]): Record<number, string> {
  const map: Record<number, string> = {};
  const usedKeys = new Set<string>();
  headerRow.forEach((h, idx) => {
    const normalized = h.toLowerCase().trim();
    const match = columns.find(
      (c) => !usedKeys.has(c.key) && (normalized === c.label.toLowerCase() || normalized === c.key.toLowerCase())
    );
    if (match) {
      map[idx] = match.key;
      usedKeys.add(match.key);
    }
  });
  return map;
}

function isDuplicate(row: Record<string, string>, check: ImportDuplicateCheck): boolean {
  return check.existingData.some((existing) =>
    check.keys.every((k) => {
      const a = (row[k] ?? "").toLowerCase().trim();
      const b = (existing[k] ?? "").toLowerCase().trim();
      return a && b && a === b;
    })
  );
}

export function ImportDialog({ open, onOpenChange, title, columns, onImport, templateFilename, duplicateCheck }: ImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [headerRow, setHeaderRow] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState<Record<number, string>>({});
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setHeaderRow([]);
    setRawRows([]);
    setColMap({});
    setRows([]);
    setErrors({});
    setDuplicates(new Set());
    setIsImporting(false);
  }, []);

  const handleClose = useCallback((v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  }, [onOpenChange, reset]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label), columns.map((c) => c.required ? `voorbeeld_${c.key}` : "")]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, templateFilename.replace(/\.csv$/, ".xlsx"));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseFile(file);
      if (parsed.length < 2) { toast.error("Bestand bevat geen data."); return; }
      const header = parsed[0].map((c) => String(c).trim());
      const dataRows = parsed.slice(1).map((r) => r.map((c) => String(c).trim()));
      setHeaderRow(header);
      setRawRows(dataRows);
      const autoMap = autoMapColumns(header, columns);
      setColMap(autoMap);
      setStep("mapping");
    } catch {
      toast.error("Kon bestand niet lezen.");
    }
    e.target.value = "";
  };

  const updateMapping = (fileColIdx: number, dbKey: string) => {
    setColMap((prev) => {
      const next = { ...prev };
      // Remove any existing mapping to this dbKey
      if (dbKey !== "_skip") {
        Object.keys(next).forEach((k) => {
          if (next[Number(k)] === dbKey) delete next[Number(k)];
        });
      }
      if (dbKey === "_skip") {
        delete next[fileColIdx];
      } else {
        next[fileColIdx] = dbKey;
      }
      return next;
    });
  };

  const mappedKeys = useMemo(() => new Set(Object.values(colMap)), [colMap]);
  const missingRequired = useMemo(
    () => columns.filter((c) => c.required && !mappedKeys.has(c.key)),
    [columns, mappedKeys]
  );

  const processMapping = () => {
    const dataRows = rawRows.map((cells) => {
      const row: Record<string, string> = {};
      Object.entries(colMap).forEach(([idx, key]) => {
        row[key] = cells[parseInt(idx)] ?? "";
      });
      columns.forEach((col) => {
        if (!(col.key in row)) row[col.key] = "";
      });
      return row;
    });

    const errs: Record<number, Record<string, string>> = {};
    const dupes = new Set<number>();
    dataRows.forEach((row, i) => {
      const rowErrors: Record<string, string> = {};
      columns.forEach((col) => {
        if (col.required && !row[col.key]) {
          rowErrors[col.key] = "Verplicht";
        } else if (col.validate && row[col.key]) {
          const err = col.validate(row[col.key]);
          if (err) rowErrors[col.key] = err;
        }
      });
      if (Object.keys(rowErrors).length > 0) errs[i] = rowErrors;
      if (duplicateCheck && isDuplicate(row, duplicateCheck)) dupes.add(i);
    });

    setRows(dataRows);
    setErrors(errs);
    setDuplicates(dupes);
    setStep("preview");
  };

  const validCount = rows.filter((_, i) => !errors[i] && !duplicates.has(i)).length;
  const errorCount = Object.keys(errors).length;
  const dupeCount = duplicates.size;

  const handleConfirm = async () => {
    const validRows = rows.filter((_, i) => !errors[i] && !duplicates.has(i));
    if (validRows.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(validRows);
      const parts: string[] = [`${validRows.length} geïmporteerd`];
      if (dupeCount > 0) parts.push(`${dupeCount} duplicaten overgeslagen`);
      if (errorCount > 0) parts.push(`${errorCount} fouten`);
      toast.success(parts.join(", "));
      handleClose(false);
    } catch {
      toast.error("Fout bij importeren.");
    }
    setIsImporting(false);
  };

  const previewRows = rows.slice(0, 50);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Upload een Excel (.xlsx) of CSV bestand. Kolommen worden automatisch gemapt.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1" /> Template downloaden
              </Button>
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Bestand uploaden
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === "mapping" && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Controleer de kolom-mapping. {headerRow.length} kolommen gevonden, {rawRows.length} rijen data.
            </p>
            <div className="overflow-auto flex-1 border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kolom in bestand</TableHead>
                    <TableHead>Voorbeeld</TableHead>
                    <TableHead>Database veld</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headerRow.map((h, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium text-sm">{h}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {rawRows[0]?.[idx] ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Select value={colMap[idx] ?? "_skip"} onValueChange={(v) => updateMapping(idx, v)}>
                          <SelectTrigger className="w-[180px] h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_skip">— Overslaan —</SelectItem>
                            {columns.map((c) => (
                              <SelectItem key={c.key} value={c.key} disabled={mappedKeys.has(c.key) && colMap[idx] !== c.key}>
                                {c.label}{c.required ? " *" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {missingRequired.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-destructive mt-2">
                <AlertCircle className="h-4 w-4" />
                Verplichte velden niet gemapt: {missingRequired.map((c) => c.label).join(", ")}
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={reset}>Terug</Button>
              <Button onClick={processMapping} disabled={missingRequired.length > 0}>
                Doorgaan naar preview
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "preview" && (
          <>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {errorCount === 0 && dupeCount === 0 ? (
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Alle {rows.length} rijen zijn geldig
                </div>
              ) : (
                <>
                  {errorCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {errorCount} rij(en) met fouten
                    </div>
                  )}
                  {dupeCount > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-orange-600">
                      <Copy className="h-4 w-4" />
                      {dupeCount} duplica(a)t(en)
                    </div>
                  )}
                </>
              )}
              <span className="text-sm text-muted-foreground ml-auto">{validCount} te importeren</span>
            </div>
            <div className="overflow-auto flex-1 border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {columns.filter((c) => mappedKeys.has(c.key)).map((col) => (
                      <TableHead key={col.key}>{col.label}{col.required ? " *" : ""}</TableHead>
                    ))}
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => {
                    const rowErr = errors[i];
                    const isDupe = duplicates.has(i);
                    return (
                      <TableRow key={i} className={rowErr ? "bg-destructive/5" : isDupe ? "bg-orange-500/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                        {columns.filter((c) => mappedKeys.has(c.key)).map((col) => (
                          <TableCell key={col.key} className="text-sm">
                            <span>{row[col.key] || "—"}</span>
                            {rowErr?.[col.key] && <p className="text-[11px] text-destructive mt-0.5">{rowErr[col.key]}</p>}
                          </TableCell>
                        ))}
                        <TableCell>
                          {rowErr ? (
                            <span className="text-xs text-destructive font-medium">Fout</span>
                          ) : isDupe ? (
                            <span className="text-xs text-orange-600 font-medium">Duplicaat</span>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">OK</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {rows.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Toont eerste 50 van {rows.length} rijen
                </p>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setStep("mapping")}>Terug naar mapping</Button>
              <Button onClick={handleConfirm} disabled={validCount === 0 || isImporting}>
                {isImporting ? "Bezig..." : `${validCount} record${validCount !== 1 ? "s" : ""} importeren`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
