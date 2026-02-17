// Web Worker for file parsing (runs on separate thread)
// This offloads heavy computation from main thread

const CHUNK_SIZE = 500 * 1024 * 1024; // 500MB chunks

/**
 * Build header indices for O(1) lookups
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
    else if (h === "RtArea") indices.rtArea = i;
  }
  return indices;
}

/**
 * Fast line parsing - manual whitespace scan
 */
function parseLineOptimized(line, indices, stats) {
  let start = 0;
  let valIdx = 0;
  const values = [];
  const len = line.length;

  for (let i = 0; i <= len; i++) {
    const c = line.charCodeAt(i);
    const isSpace = i === len || c <= 32;

    if (!isSpace && start === i) start = i;
    else if (isSpace && start < i) {
      values[valIdx++] = line.substring(start, i);
      start = i + 1;
    }
  }

  if (values.length < 8) return;

  // Direct accumulation
  if (indices.genPwr !== undefined) {
    const v = parseFloat(values[indices.genPwr]);
    if (!isNaN(v)) stats[0] += v;
  }
  if (indices.torque !== undefined) {
    const v = parseFloat(values[indices.torque]);
    if (!isNaN(v)) stats[1] += v;
  }
  if (indices.rpm !== undefined) {
    const v = parseFloat(values[indices.rpm]);
    if (!isNaN(v)) stats[2] += v;
  }
  if (indices.cp !== undefined) {
    const v = parseFloat(values[indices.cp]);
    if (!isNaN(v)) stats[3] += v;
  }
  if (indices.ct !== undefined) {
    const v = parseFloat(values[indices.ct]);
    if (!isNaN(v)) stats[4] += v;
  }
  if (indices.pitch1 !== undefined) {
    const v = parseFloat(values[indices.pitch1]);
    if (!isNaN(v)) stats[5] += v;
  }
  if (indices.pitch2 !== undefined) {
    const v = parseFloat(values[indices.pitch2]);
    if (!isNaN(v)) stats[6] += v;
  }
  if (indices.pitch3 !== undefined) {
    const v = parseFloat(values[indices.pitch3]);
    if (!isNaN(v)) stats[7] += v;
  }
  if (indices.rtArea !== undefined) {
    const v = parseFloat(values[indices.rtArea]);
    if (!isNaN(v)) stats[8] += v;
  }
  if (indices.windX !== undefined) {
    const v = parseFloat(values[indices.windX]);
    if (!isNaN(v)) stats[11] += v;
  }
  if (indices.windY !== undefined) {
    const v = parseFloat(values[indices.windY]);
    if (!isNaN(v)) stats[12] += v;
  }
  if (indices.windZ !== undefined) {
    const v = parseFloat(values[indices.windZ]);
    if (!isNaN(v)) stats[13] += v;
  }

  stats[14]++;
}

/**
 * Process text chunk
 */
function processChunk(text, stats, onHeader) {
  let headerFound = false;
  let dataStarted = false;
  let headers = null;
  let headerIndices = null;

  let start = 0;
  const len = text.length;

  for (let i = 0; i <= len; i++) {
    const isNewline = i === len || text[i] === "\n";

    if (isNewline && start < i) {
      const line = text
        .substring(start, text[i - 1] === "\r" ? i - 1 : i)
        .trim();

      if (!line) {
        start = i + 1;
        continue;
      }

      if (!headerFound) {
        if (line.includes("Time")) {
          headers = line.split(/\s+/);
          headerIndices = buildHeaderIndices(headers);
          headerFound = true;
          onHeader(headers, headerIndices, false);
          start = i + 1;
          continue;
        }
      }

      if (headerFound && !dataStarted) {
        dataStarted = true;
        start = i + 1;
        continue;
      }

      if (dataStarted) {
        parseLineOptimized(line, headerIndices, stats);
      }

      start = i + 1;
    }
  }

  return { headers, headerIndices, dataStarted };
}

/**
 * Main worker message handler
 */
self.onmessage = async (event) => {
  const { fileData, fileName, airDensity, taskId } = event.data;

  try {
    // Pre-allocate stats array
    const stats = new Float64Array(15);

    // Convert data to string
    const text = new TextDecoder("utf-8").decode(new Uint8Array(fileData));

    // Process the text
    const { headers, headerIndices, dataStarted } = processChunk(
      text,
      stats,
      () => {},
    );

    // Calculate results
    const count = stats[14];
    if (count === 0) throw new Error(`No data in ${fileName}`);

    const divide = (idx) => stats[idx] / count;
    const windX = divide(11);
    const windY = divide(12);
    const windZ = divide(13);

    const totalWind = Math.sqrt(windX * windX + windY * windY + windZ * windZ);
    const rotorAreaValue = divide(8);

    const groupKey = fileName.toLowerCase().includes("_seed")
      ? fileName.toLowerCase().split("_seed")[0]
      : fileName.replace(/\.[^/.]+$/, "");

    const result = {
      WindSpeedGroup: groupKey,
      Density: airDensity,
      _rotorArea: rotorAreaValue,
      "WindSpeed(ms)": totalWind,
      "Power(kW)": divide(0),
      "Torque(kNm)": divide(1),
      "GenSpeed(RPM)": divide(2),
      Cp: divide(3),
      Ct: divide(4),
      Bladepitch1: divide(5),
      Bladepitch2: divide(6),
      Bladepitch3: divide(7),
    };

    self.postMessage({
      taskId,
      success: true,
      result,
      fileName,
    });
  } catch (error) {
    self.postMessage({
      taskId,
      success: false,
      error: error.message,
      fileName,
    });
  }
};
