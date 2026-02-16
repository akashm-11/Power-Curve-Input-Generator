/* Web Worker for processing OpenFAST .out files */

// Import processing logic
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

function parseOutFile(fileContent, timeColumn = "Time") {
  const lines = fileContent.split(/\r?\n/);
  let headerIdx = -1;
  let dataStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
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

function processFile(fileContent, fileName, airDensity, rotorArea) {
  const { data } = parseOutFile(fileContent, COLUMNS.time);
  if (!data || !data.length) return null;

  const wind = data.map((r) =>
    Math.sqrt(
      (r[COLUMNS.windX] || 0) ** 2 +
        (r[COLUMNS.windY] || 0) ** 2 +
        (r[COLUMNS.windZ] || 0) ** 2,
    ),
  );

  return {
    WindSpeedGroup: groupKey(fileName),
    FileName: fileName,
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
}

// Handle messages from main thread
self.onmessage = async function (e) {
  const { type, data } = e.data;

  try {
    if (type === "PROCESS_BATCH") {
      const { files, airDensity, rotorArea, batchIndex, totalBatches } = data;
      const results = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // ✅ Just process, no updates
        const result = processFile(
          file.content,
          file.name,
          airDensity,
          rotorArea,
        );
        if (result) {
          results.push(result);
        }
      }

      // ✅ Send only when batch complete
      self.postMessage({
        type: "BATCH_COMPLETE",
        data: {
          results,
          batchIndex,
        },
      });
    } else if (type === "AGGREGATE_RESULTS") {
      const { individualData } = data;

      // Group by WindSpeedGroup
      const groups = {};
      individualData.forEach((r) => {
        groups[r.WindSpeedGroup] ||= [];
        groups[r.WindSpeedGroup].push(r);
      });

      // Create power curve data
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

      self.postMessage({
        type: "AGGREGATION_COMPLETE",
        data: { powerCurveData },
      });
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      data: { message: error.message, stack: error.stack },
    });
  }
};
