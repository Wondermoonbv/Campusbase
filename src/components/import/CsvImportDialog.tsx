import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export interface CsvColumn {
  key: string;
  label: string;
  required?: boolean;
  validate?: (value: string) => string | null; // returns error message or null
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: CsvColumn[];
  onImport: (rows: Record<string, string>[]) => void;
  templateFilename: string;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { current += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ";" || ch === ",") { cells.push(current.trim()); current = ""; }
        else { current += ch; }
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

export function CsvImportDialog({ open, onOpenChange, title, columns, onImport, templateFilename }: CsvImportDialogProps) {
  const [step, setStep] = useState<"upload" | "preview">("upload");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setRows([]);
    setErrors({});
  }, []);

  const handleClose = useCallback((v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  }, [onOpenChange, reset]);

  const downloadTemplate = () => {
    const header = columns.map((c) => c.label).join(";");
    const example = columns.map((c) => c.required ? `voorbeeld_${c.key}` : "").join(";");
    const csv = header + "\n" + example;
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = templateFilename;
    a.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) { toast.error("CSV bevat geen data."); return; }

      const headerRow = parsed[0].map((h) => h.toLowerCase().trim());
      // Map header labels to column keys
      const colMap: Record<number, string> = {};
      columns.forEach((col) => {
        const idx = headerRow.findIndex((h) => h === col.label.toLowerCase() || h === col.key.toLowerCase());
        if (idx >= 0) colMap[idx] = col.key;
      });

      const dataRows = parsed.slice(1).map((cells) => {
        const row: Record<string, string> = {};
        Object.entries(colMap).forEach(([idx, key]) => {
          row[key] = cells[parseInt(idx)] ?? "";
        });
        // Fill missing keys
        columns.forEach((col) => {
          if (!(col.key in row)) row[col.key] = "";
        });
        return row;
      });

      // Validate
      const errs: Record<number, Record<string, string>> = {};
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
      });

      setRows(dataRows);
      setErrors(errs);
      setStep("preview");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const validCount = rows.length - Object.keys(errors).length;
  const hasErrors = Object.keys(errors).length > 0;

  const handleConfirm = () => {
    const validRows = rows.filter((_, i) => !errors[i]);
    onImport(validRows);
    toast.success(`${validRows.length} ${validRows.length === 1 ? "record" : "records"} succesvol geïmporteerd.`);
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Upload een CSV-bestand met puntkomma (;) of komma (,) als scheidingsteken.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-1" /> Template downloaden
              </Button>
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> CSV uploaden
              </Button>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </div>
        )}

        {step === "preview" && (
          <>
            <div className="flex items-center gap-3 mb-2">
              {hasErrors ? (
                <div className="flex items-center gap-1.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {Object.keys(errors).length} rij(en) met fouten — deze worden overgeslagen bij import
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Alle {rows.length} rijen zijn geldig
                </div>
              )}
            </div>
            <div className="overflow-auto flex-1 border border-border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col.key}>
                        {col.label}{col.required ? " *" : ""}
                      </TableHead>
                    ))}
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const rowErr = errors[i];
                    return (
                      <TableRow key={i} className={rowErr ? "bg-destructive/5" : ""}>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                        {columns.map((col) => (
                          <TableCell key={col.key} className="text-sm">
                            <span>{row[col.key] || "—"}</span>
                            {rowErr?.[col.key] && (
                              <p className="text-[11px] text-destructive mt-0.5">{rowErr[col.key]}</p>
                            )}
                          </TableCell>
                        ))}
                        <TableCell>
                          {rowErr ? (
                            <span className="text-xs text-destructive font-medium">Fout</span>
                          ) : (
                            <span className="text-xs text-success font-medium">OK</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={reset}>Opnieuw uploaden</Button>
              <Button onClick={handleConfirm} disabled={validCount === 0}>
                {validCount} record{validCount !== 1 ? "s" : ""} importeren
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
