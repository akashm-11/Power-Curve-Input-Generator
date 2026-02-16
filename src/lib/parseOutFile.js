/* ======= helpers: parseOutFile (UNCHANGED) ======= */
export function parseOutFile(fileContent, timeColumn = "Time") {
  const lines = fileContent.split(/\r?\n/);
  let headerIdx = -1;
  let dataStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(timeColumn)) {
      headerIdx = i;
      dataStartIdx = i + 2; // skip units row
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(`Could not find header with ${timeColumn}`);
  }

  const headers = lines[headerIdx].trim().split(/\s+/);
  const data = [];

  for (let i = dataStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(/\s+/);
    if (values.length !== headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      const v = parseFloat(values[idx]);
      row[h] = Number.isFinite(v) ? v : 0;
    });

    data.push(row);
  }

  return { headers, data };
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

export function processOpenFASTOutFiles(
  files,
  airDensity = 1.225,
  rotorArea = 28630,
) {
  const individualData = [];

  for (const file of files) {
    const { data } = parseOutFile(file.content, COLUMNS.time);
    if (!data || !data.length) continue;

    // SAME wind logic
    const wind = data.map((r) =>
      Math.sqrt(
        (r[COLUMNS.windX] || 0) ** 2 +
          (r[COLUMNS.windY] || 0) ** 2 +
          (r[COLUMNS.windZ] || 0) ** 2,
      ),
    );

    const record = {
      WindSpeedGroup: groupKey(file.name),
      FileName: file.name,
      "Power(kW)": mean(data.map((r) => r[COLUMNS.genPwr] || 0)),
      "Torque(kNm)": mean(data.map((r) => r[COLUMNS.torque] || 0)),
      "GenSpeed(RPM)": mean(data.map((r) => r[COLUMNS.rpm] || 0)),
      Cp: mean(data.map((r) => r[COLUMNS.cp] || 0)),
      Ct: mean(data.map((r) => r[COLUMNS.ct] || 0)),
      Bladepitch1: mean(data.map((r) => r[COLUMNS.bladePitch1] || 0)),
      Bladepitch2: mean(data.map((r) => r[COLUMNS.bladePitch2] || 0)),
      Bladepitch3: mean(data.map((r) => r[COLUMNS.bladePitch3] || 0)),
      "WindSpeed(ms)": Math.round(mean(wind) * 2) / 2,
    };

    individualData.push(record);
  }

  const groups = {};
  individualData.forEach((r) => {
    groups[r.WindSpeedGroup] ||= [];
    groups[r.WindSpeedGroup].push(r);
  });

  const powerCurveData = Object.entries(groups).map(([g, rows]) => ({
    WindSpeedGroup: g,
    "Power(kW)": mean(rows.map((r) => r["Power(kW)"])),
    "Torque(kNm)": mean(rows.map((r) => r["Torque(kNm)"])),
    "GenSpeed(RPM)": mean(rows.map((r) => r["GenSpeed(RPM)"])),
    Cp: mean(rows.map((r) => r.Cp)),
    Ct: mean(rows.map((r) => r.Ct)),
    Bladepitch1: mean(rows.map((r) => r["Bladepitch1"])),
    Bladepitch2: mean(rows.map((r) => r["Bladepitch2"])),
    Bladepitch3: mean(rows.map((r) => r["Bladepitch3"])),
    "WindSpeed(ms)":
      Math.round(mean(rows.map((r) => r["WindSpeed(ms)"])) * 2) / 2,
  }));

  const base = groupKey(files[0]?.name || "openfast");

  return {
    individualData,
    powerCurveData,
    baseName: {
      individual: `final_individual_${airDensity}`,
      powerCurve: `final_powercurve_${airDensity}`,
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
