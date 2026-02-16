// Good balance of speed vs memory
const BATCH_SIZE = 20; // ✅ 20 files per batch
const CHUNK_SIZE = 10 * 1024 * 1024; // ✅ 10MB chunks

/**
 * Read file in chunks to avoid memory issues
 */
export async function readFileInChunks(file) {
  const chunks = [];
  const chunkSize = CHUNK_SIZE;
  let offset = 0;

  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const text = await slice.text();
    chunks.push(text);
    offset += chunkSize;
  }

  return chunks.join("");
}

/**
 * Process files in batches using Web Worker
 */
export class FileProcessor {
  constructor() {
    this.worker = null;
    this.processing = false;
  }

  initWorker() {
    if (!this.worker) {
      this.worker = new Worker("/workers/fileProcessor.worker.js");
    }
    return this.worker;
  }

  async processBatches(files, airDensity, rotorArea, onProgress) {
    return new Promise((resolve, reject) => {
      const worker = this.initWorker();
      const batches = [];
      const allResults = [];
      let completedBatches = 0;

      // Split files into batches
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        batches.push(files.slice(i, i + BATCH_SIZE));
      }

      const totalBatches = batches.length;

      worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === "BATCH_COMPLETE") {
          allResults.push(...data.results);
          completedBatches++;

          // Update progress
          const overallProgress = (completedBatches / totalBatches) * 90;
          onProgress({
            type: "progress",
            progress: overallProgress,
            message: `Processing batch ${completedBatches}/${totalBatches}`,
          });

          if (completedBatches === totalBatches) {
            // Aggregate results
            worker.postMessage({
              type: "AGGREGATE_RESULTS",
              data: { individualData: allResults },
            });

            onProgress({
              type: "progress",
              progress: 95,
              message: "Generating outputs...",
            });
          }
        } else if (type === "AGGREGATION_COMPLETE") {
          onProgress({
            type: "progress",
            progress: 100,
            message: "Complete!",
          });

          resolve({
            individualData: allResults,
            powerCurveData: data.powerCurveData,
          });
        } else if (type === "ERROR") {
          reject(new Error(data.message));
        }
      };

      worker.onerror = (error) => {
        reject(error);
      };

      // Start processing batches sequentially
      this.processBatchSequentially(batches, airDensity, rotorArea, worker);
    });
  }

  async processBatchSequentially(batches, airDensity, rotorArea, worker) {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      // ✅ Read files one by one in the batch
      const filesWithContent = [];
      for (const file of batch) {
        try {
          const content = await file.text();
          filesWithContent.push({
            name: file.name,
            content: content,
          });
        } catch (error) {
          console.error(`Error reading ${file.name}:`, error);
        }
      }

      // Send batch to worker
      worker.postMessage({
        type: "PROCESS_BATCH",
        data: {
          files: filesWithContent,
          airDensity,
          rotorArea,
          batchIndex: i,
          totalBatches: batches.length,
        },
      });

      // ✅ Small delay to prevent memory spike
      //   await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  async readFileSafely(file) {
    try {
      // For small files, read directly
      if (file.size < CHUNK_SIZE) {
        return await file.text();
      }
      // For large files, use chunked reading
      return await readFileInChunks(file);
    } catch (error) {
      console.error(`Error reading file ${file.name}:`, error);
      throw error;
    }
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

/**
 * Debounced progress update to reduce DOM thrashing
 */
export function createDebouncedProgress(callback, delay = 100) {
  let timeoutId = null;
  let lastUpdate = 0;

  return (data) => {
    const now = Date.now();

    // Always update if it's been more than delay ms
    if (now - lastUpdate >= 1000) {
      lastUpdate = now;
      callback(data);
      return;
    }

    // Otherwise debounce
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      lastUpdate = Date.now();
      callback(data);
    }, delay);
  };
}

/**
 * Format helpers (same as before but optimized)
 */
export function toCSV(data) {
  if (!data || !data.length) return "";

  const headers = Object.keys(data[0]);
  const lines = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      return typeof val === "number" ? val.toFixed(6) : String(val ?? "");
    });
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

export function toFWTXT(data) {
  if (!data || !data.length) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      return typeof val === "number" ? val.toFixed(6) : String(val ?? "");
    }),
  );

  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => (r[i] || "").length));
    return Math.max(maxLen, 15);
  });

  const formatRow = (cells) =>
    cells.map((c, i) => c.padEnd(colWidths[i])).join(" | ");

  const separator = colWidths.map((w) => "=".repeat(w)).join("=|=");

  return [formatRow(headers), separator, ...rows.map(formatRow)].join("\n");
}

export async function toXLSXBlob(data, sheetName = "Sheet1") {
  const XLSX = (await import("xlsx")).default || (await import("xlsx"));

  if (!data || !data.length) return new Blob([]);

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const v = row[h];
      return typeof v === "number" ? Number(v.toFixed(6)) : v;
    }),
  );

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function createZipPackage(resultsByFormat) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const fmt of Object.keys(resultsByFormat)) {
    const r = resultsByFormat[fmt];
    zip.file(r.individual.filename, r.individual.blob);
    zip.file(r.powerCurve.filename, r.powerCurve.blob);
  }

  return await zip.generateAsync({ type: "blob" });
}

/**
 * Memory-efficient virtual list generator
 */
export function getVisibleRange(
  scrollTop,
  itemHeight,
  containerHeight,
  totalItems,
) {
  const start = Math.floor(scrollTop / itemHeight);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(start + visibleCount + 5, totalItems); // +5 for buffer

  return {
    start: Math.max(0, start - 5), // -5 for buffer
    end,
    offsetY: start * itemHeight,
  };
}
