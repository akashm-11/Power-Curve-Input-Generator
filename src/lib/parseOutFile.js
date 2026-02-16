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
