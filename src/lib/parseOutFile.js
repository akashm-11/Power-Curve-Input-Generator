/* ======= helpers: parseOutFile (OPTIMIZED) ======= */
export function parseOutFile(fileContent, timeColumn = "Time") {
  const lines = fileContent.split(/\r?\n/);
  let headerIdx = -1;
  let dataStartIdx = -1;

  // Search for header in first 1000 lines (optimization for large files)
  const searchLimit = Math.min(1000, lines.length);
  for (let i = 0; i < searchLimit; i++) {
    if (lines[i].includes(timeColumn)) {
      headerIdx = i;
      dataStartIdx = i + 2;
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(`Could not find header with ${timeColumn}`);
  }

  const headers = lines[headerIdx].trim().split(/\s+/);
  const data = [];

  // Pre-calculate for aggregates
  const stats = {};
  for (let j = 0; j < headers.length; j++) {
    stats[headers[j]] = { sum: 0, count: 0 };
  }

  for (let i = dataStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(/\s+/);
    if (values.length !== headers.length) continue;

    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const v = parseFloat(values[j]);
      const val = Number.isFinite(v) ? v : 0;
      row[headers[j]] = val;
      stats[headers[j]].sum += val;
      stats[headers[j]].count++;
    }

    data.push(row);
  }

  return { headers, data, stats };
}

/* ======= helpers: processOpenFASTOutFiles (MATCHES YOUR FIRST FILE) ======= */
const COLUMNS = {
  time: "Time",
  genPwr: "GenPwr",
  torque: "GenTq",
  rpm: "GenSpeed",
  cp: "RtAeroCp",
  ct: "RtAeroCt",
  bladePitch1: "BldPitch1",
  bladePitch2: "BldPitch2",
  bladePitch3: "BldPitch3",
  windX: "WindHubVelX",
  windY: "WindHubVelY",
  windZ: "WindHubVelZ",
};

const mean = (arr) =>
  arr && arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const groupKey = (name) =>
  name.toLowerCase().includes("_seed")
    ? name.toLowerCase().split("_seed")[0]
    : name.replace(/\.[^/.]+$/, "");

export function processOpenFASTOutFiles(files, airDensity = 1.225) {
  const individualData = [];

  for (const file of files) {
    const parsed = parseOutFile(file.content, COLUMNS.time);
    const { data, stats } = parsed;
    if (!data || !data.length) continue;

    // Single-pass wind speed aggregation
    let windSum = 0;
    for (let i = 0; i < data.length; i++) {
      const r = data[i];
      windSum += Math.sqrt(
        (r[COLUMNS.windX] || 0) ** 2 +
          (r[COLUMNS.windY] || 0) ** 2 +
          (r[COLUMNS.windZ] || 0) ** 2,
      );
    }

    const mean = (sum, count) => (count ? sum / count : 0);

    const record = {
      WindSpeedGroup: groupKey(file.name),
      FileName: file.name,
      "Power(kW)": mean(stats[COLUMNS.genPwr].sum, stats[COLUMNS.genPwr].count),
      "Torque(kNm)": mean(
        stats[COLUMNS.torque].sum,
        stats[COLUMNS.torque].count,
      ),
      "GenSpeed(RPM)": mean(stats[COLUMNS.rpm].sum, stats[COLUMNS.rpm].count),
      Cp: mean(stats[COLUMNS.cp].sum, stats[COLUMNS.cp].count),
      Ct: mean(stats[COLUMNS.ct].sum, stats[COLUMNS.ct].count),
      Bladepitch1: mean(
        stats[COLUMNS.bladePitch1].sum,
        stats[COLUMNS.bladePitch1].count,
      ),
      Bladepitch2: mean(
        stats[COLUMNS.bladePitch2].sum,
        stats[COLUMNS.bladePitch2].count,
      ),
      Bladepitch3: mean(
        stats[COLUMNS.bladePitch3].sum,
        stats[COLUMNS.bladePitch3].count,
      ),
      "WindSpeed(ms)": Math.round(mean(windSum, data.length) * 2) / 2,
    };

    individualData.push(record);
  }

  const groups = {};
  for (let i = 0; i < individualData.length; i++) {
    const r = individualData[i];
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
    const count = rows.length;

    for (let i = 0; i < count; i++) {
      const r = rows[i];
      powerSum += r["Power(kW)"];
      torqueSum += r["Torque(kNm)"];
      speedSum += r["GenSpeed(RPM)"];
      cpSum += r.Cp;
      ctSum += r.Ct;
      pitch1Sum += r["Bladepitch1"];
      pitch2Sum += r["Bladepitch2"];
      pitch3Sum += r["Bladepitch3"];
      windSum += r["WindSpeed(ms)"];
    }

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

  const base = groupKey(files[0]?.name || "openfast");

  return {
    individualData,
    powerCurveData,
    baseName: {
      individual: `final_individual_${Date.now()}`,
      powerCurve: `final_powercurve_${Date.now()}`,
    },
  };
}

// Format convert to CSV
export function toCSV(data) {
  if (!data || !data.length) return "";

  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      return typeof val === "number" ? val.toFixed(6) : String(val ?? "");
    }),
  );

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

// Format convert to .fw.txt
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

/* ======= helpers: XLSX creation in browser (UNCHANGED) ======= */
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

/* ======= helper: ZIP (UNCHANGED) ======= */
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
