import { parseOutFile } from "./parseOutFile.js";

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
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const groupKey = (name) =>
  name.toLowerCase().includes("_seed")
    ? name.toLowerCase().split("_seed")[0]
    : name.replace(/\.[^/.]+$/, "");

export function processOpenFASTOutFiles(files, airDensity, rotorArea) {
  const individualData = [];

  for (const file of files) {
    const { data } = parseOutFile(file.content, COLUMNS.time);
    if (!data.length) continue;

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
