// Ultra-aggressive optimization for massive datasets (100GB+ / 2640+ files)
const BATCH_SIZE = 50;
const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks - faster I/O
const MAX_CONCURRENT = Math.min(navigator.hardwareConcurrency || 4, 16); // 16 concurrent (aggressive)

// Pre-computed column mappings to avoid repeated object lookups
const COLUMN_MAP = {
  GenPwr: "GenPwr",
  GenTq: "GenTq",
  GenSpeed: "GenSpeed",
  RtAeroCp: "RtAeroCp",
  RtAeroCt: "RtAeroCt",
  BldPitch1: "BldPitch1",
  BldPitch2: "BldPitch2",
  BldPitch3: "BldPitch3",
  WindHubVelX: "WindHubVelX",
  WindHubVelY: "WindHubVelY",
  WindHubVelZ: "WindHubVelZ",
};

/**
 * Lightning-fast streaming file processor
 * Optimized for 2640+ files and 100GB+ datasets
 */
export async function streamProcessFile(file, airDensity, rotorArea) {
  return parseFileStreamingFast(file, file.name);
}

/**
 * Hyper-optimized parser - minimal allocations, maximum speed
 */
async function parseFileStreamingFast(file, fileName) {
  let headerFound = false;
  let headers = null;
  let headerIndices = null;
  let dataStarted = false;

  // Pre-allocate stats object - single allocation
  const stats = new Float64Array(15); // 15 values: 11 columns + wind components + count

  let lineBuffer = "";
  let chunkBuffer = "";

  // Aggressive streaming with minimal GC pressure
  for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const slice = file.slice(offset, end);

    // Read chunk
    const chunkText = await slice.text();
    chunkBuffer = lineBuffer + chunkText;

    // Split and process
    const idx = chunkBuffer.lastIndexOf("\n");
    if (idx === -1) {
      lineBuffer = chunkBuffer;
      continue;
    }

    const toProcess = chunkBuffer.substring(0, idx);
    lineBuffer = chunkBuffer.substring(idx + 1);

    // Process lines with minimal parsing overhead
    processLinesOptimized(
      toProcess,
      stats,
      (headers_result, indices_result, started) => {
        if (!headerFound) {
          headers = headers_result;
          headerIndices = indices_result;
          headerFound = true;
        }
        dataStarted = started;
      },
    );
  }

  // Process remaining buffer
  if (lineBuffer.trim() && dataStarted) {
    processLineOptimized(lineBuffer, headers, headerIndices, stats);
  }

  // Calculate results from stats array
  const count = stats[14];
  if (count === 0) throw new Error(`No data in ${fileName}`);

  const divide = (idx) => stats[idx] / count;
  const windX = divide(11);
  const windY = divide(12);
  const windZ = 0; // Assuming Z is 0 or included in wind calculation

  const totalWind = Math.sqrt(windX * windX + windY * windY + windZ * windZ);

  const groupKey = fileName.toLowerCase().includes("_seed")
    ? fileName.toLowerCase().split("_seed")[0]
    : fileName.replace(/\.[^/.]+$/, "");

  return {
    WindSpeedGroup: groupKey,
    FileName: fileName,
    "Power(kW)": divide(0),
    "Torque(kNm)": divide(1),
    "GenSpeed(RPM)": divide(2),
    Cp: divide(3),
    Ct: divide(4),
    Bladepitch1: divide(5),
    Bladepitch2: divide(6),
    Bladepitch3: divide(7),
    "WindSpeed(ms)": Math.round(totalWind * 2) / 2,
  };
}

/**
 * Process multiple lines with minimal overhead
 */
function processLinesOptimized(text, stats, onHeader) {
  let lines = text.split("\n");
  let headerFound = false;
  let dataStarted = false;
  let headers = null;
  let headerIndices = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (!headerFound) {
      if (line.includes("Time")) {
        headers = line.split(/\s+/);
        headerIndices = buildHeaderIndices(headers);
        headerFound = true;
        onHeader(headers, headerIndices, false);
        continue;
      }
    }

    if (headerFound && !dataStarted) {
      dataStarted = true;
      continue;
    }

    if (dataStarted) {
      processLineOptimized(line, headers, headerIndices, stats);
    }
  }

  onHeader(headers, headerIndices, dataStarted);
}

/**
 * Pre-build header indices for O(1) lookups
 */
function buildHeaderIndices(headers) {
  const indices = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h === "GenPwr") indices.genPwr = i;
    else if (h === "GenTq") indices.torque = i;
    else if (h === "GenSpeed") indices.rpm = i;
    else if (h === "RtAeroCp") indices.cp = i;
    else if (h === "RtAeroCt") indices.ct = i;
    else if (h === "BldPitch1") indices.pitch1 = i;
    else if (h === "BldPitch2") indices.pitch2 = i;
    else if (h === "BldPitch3") indices.pitch3 = i;
    else if (h === "WindHubVelX") indices.windX = i;
    else if (h === "WindHubVelY") indices.windY = i;
    else if (h === "WindHubVelZ") indices.windZ = i;
  }
  return indices;
}

/**
 * Ultra-fast line processing - no intermediate objects
 */
function processLineOptimized(line, headers, indices, stats) {
  const values = line.split(/\s+/);
  if (values.length !== headers.length) return;

  // Direct accumulation - no object creation
  if (indices.genPwr !== undefined)
    stats[0] += parseFloat(values[indices.genPwr]) || 0;
  if (indices.torque !== undefined)
    stats[1] += parseFloat(values[indices.torque]) || 0;
  if (indices.rpm !== undefined)
    stats[2] += parseFloat(values[indices.rpm]) || 0;
  if (indices.cp !== undefined) stats[3] += parseFloat(values[indices.cp]) || 0;
  if (indices.ct !== undefined) stats[4] += parseFloat(values[indices.ct]) || 0;
  if (indices.pitch1 !== undefined)
    stats[5] += parseFloat(values[indices.pitch1]) || 0;
  if (indices.pitch2 !== undefined)
    stats[6] += parseFloat(values[indices.pitch2]) || 0;
  if (indices.pitch3 !== undefined)
    stats[7] += parseFloat(values[indices.pitch3]) || 0;
  if (indices.windX !== undefined)
    stats[11] += parseFloat(values[indices.windX]) || 0;
  if (indices.windY !== undefined)
    stats[12] += parseFloat(values[indices.windY]) || 0;
  if (indices.windZ !== undefined)
    stats[13] += parseFloat(values[indices.windZ]) || 0;

  stats[14]++; // Increment count
}

/**
 * Stream-based file processor without Web Workers - avoids cloning issues
 */
export class FileProcessor {
  constructor() {
    this.processing = false;
  }

  async processBatches(files, airDensity, rotorArea, onProgress) {
    const individualData = [];
    const totalFiles = files.length;
    let processedCount = 0;

    // Process files with controlled concurrency (MAX_CONCURRENT at a time)
    for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
      const batch = files.slice(i, i + MAX_CONCURRENT);
      const promises = batch.map(async (file) => {
        try {
          const result = await streamProcessFile(file, airDensity, rotorArea);
          processedCount++;

          // Update progress
          onProgress({
            type: "progress",
            progress: Math.round((processedCount / totalFiles) * 90),
            message: `Processing file ${processedCount}/${totalFiles}: ${file.name}`,
            currentFile: file.name,
            filesProcessed: processedCount,
          });

          return result;
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
          processedCount++;
          return null;
        }
      });

      const results = await Promise.all(promises);
      individualData.push(...results.filter(Boolean));
    }

    onProgress({
      type: "progress",
      progress: 95,
      message: "Aggregating power curve data...",
    });

    // Aggregate to power curve
    const groups = {};
    for (const r of individualData) {
      if (!groups[r.WindSpeedGroup]) {
        groups[r.WindSpeedGroup] = [];
      }
      groups[r.WindSpeedGroup].push(r);
    }

    const powerCurveData = [];
    for (const [g, rows] of Object.entries(groups)) {
      let powerSum = 0,
        torqueSum = 0,
        speedSum = 0,
        cpSum = 0,
        ctSum = 0;
      let pitch1Sum = 0,
        pitch2Sum = 0,
        pitch3Sum = 0,
        windSum = 0;

      for (const r of rows) {
        powerSum += r["Power(kW)"];
        torqueSum += r["Torque(kNm)"];
        speedSum += r["GenSpeed(RPM)"];
        cpSum += r.Cp;
        ctSum += r.Ct;
        pitch1Sum += r.Bladepitch1;
        pitch2Sum += r.Bladepitch2;
        pitch3Sum += r.Bladepitch3;
        windSum += r["WindSpeed(ms)"];
      }

      const count = rows.length;
      powerCurveData.push({
        WindSpeedGroup: g,
        "Power(kW)": powerSum / count,
        "Torque(kNm)": torqueSum / count,
        "GenSpeed(RPM)": speedSum / count,
        Cp: cpSum / count,
        Ct: ctSum / count,
        Bladepitch1: pitch1Sum / count,
        Bladepitch2: pitch2Sum / count,
        Bladepitch3: pitch3Sum / count,
        "WindSpeed(ms)": Math.round((windSum / count) * 2) / 2,
      });
    }

    return { individualData, powerCurveData };
  }

  terminate() {
    // No workers to clean up
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
 * Format helpers (optimized for large datasets)
 */
export function toCSV(data) {
  if (!data || !data.length) return "";

  const headers = Object.keys(data[0]);
  const lines = [];
  lines.push(headers.join(","));

  // Stream-like processing to reduce memory
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const values = new Array(headers.length);
    for (let j = 0; j < headers.length; j++) {
      const val = row[headers[j]];
      values[j] = typeof val === "number" ? val.toFixed(6) : String(val ?? "");
    }
    lines.push(values.join(","));
  }

  return lines.join("\n");
}

export function toFWTXT(data) {
  if (!data || !data.length) return "";

  const headers = Object.keys(data[0]);

  // Calculate column widths with single pass
  const colWidths = new Array(headers.length);
  for (let j = 0; j < headers.length; j++) {
    colWidths[j] = Math.max(headers[j].length, 15);
  }

  // Update widths based on data (single pass)
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < headers.length; j++) {
      const val = data[i][headers[j]];
      const strVal =
        typeof val === "number" ? val.toFixed(6) : String(val ?? "");
      colWidths[j] = Math.max(colWidths[j], strVal.length);
    }
  }

  const lines = [];

  // Format header
  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(" | ");

  const separator = colWidths.map((w) => "=".repeat(w)).join("=|=");

  lines.push(headerLine);
  lines.push(separator);

  // Format rows
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const cells = new Array(headers.length);
    for (let j = 0; j < headers.length; j++) {
      const val = row[headers[j]];
      const strVal =
        typeof val === "number" ? val.toFixed(6) : String(val ?? "");
      cells[j] = strVal.padEnd(colWidths[j]);
    }
    lines.push(cells.join(" | "));
  }

  return lines.join("\n");
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
