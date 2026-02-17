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

/**
 * Optimized line parser - stream-like processing without creating huge array
 */
function parseOutFileOptimized(fileContent, timeColumn = "Time") {
  const lines = fileContent.split(/\r?\n/);
  let headerIdx = -1;
  let dataStartIdx = -1;

  // Binary search for header (more efficient for large files)
  let low = 0,
    high = Math.min(1000, lines.length); // Check first 1000 lines max
  for (let i = low; i < high; i++) {
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

  // Pre-allocate arrays for statistics
  const stats = {};
  for (const h of headers) {
    stats[h] = { sum: 0, count: 0 };
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

function processFile(fileContent, fileName, airDensity, rotorArea) {
  const parsed = parseOutFileOptimized(fileContent, COLUMNS.time);
  const { data, stats } = parsed;

  if (!data || !data.length) return null;

  // Calculate wind speed and aggregate in single pass
  let windSum = 0;
  let windCount = 0;

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const windSpeed = Math.sqrt(
      (r[COLUMNS.windX] || 0) ** 2 +
        (r[COLUMNS.windY] || 0) ** 2 +
        (r[COLUMNS.windZ] || 0) ** 2,
    );
    windSum += windSpeed;
    windCount++;
  }

  const mean = (sum, count) => (count ? sum / count : 0);

  return {
    WindSpeedGroup: groupKey(fileName),
    FileName: fileName,
    "Power(kW)": mean(stats[COLUMNS.genPwr].sum, stats[COLUMNS.genPwr].count),
    "Torque(kNm)": mean(stats[COLUMNS.torque].sum, stats[COLUMNS.torque].count),
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
    "WindSpeed(ms)": Math.round(mean(windSum, windCount) * 2) / 2,
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
      for (let i = 0; i < individualData.length; i++) {
        const r = individualData[i];
        if (!groups[r.WindSpeedGroup]) {
          groups[r.WindSpeedGroup] = [];
        }
        groups[r.WindSpeedGroup].push(r);
      }

      // Create power curve data with optimized aggregation
      const powerCurveData = [];
      for (const [g, rows] of Object.entries(groups)) {
        // Single pass aggregation
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

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
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
