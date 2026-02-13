import { NextResponse } from 'next/server';

// Column mappings matching the Python script
const COLUMNS = {
  time: 'Time',
  genPwr: 'GenPwr',
  torque: 'GenTq',
  rpm: 'GenSpeed',
  cp: 'RtAeroCp',
  ct: 'RtAeroCt',
  thrustForce: 'YawBrFxp',
  bladePitch1: 'BldPitch1',
  bladePitch2: 'BldPitch2',
  bladePitch3: 'BldPitch3',
  windX: 'WindHubVelX',
  windY: 'WindHubVelY',
  windZ: 'WindHubVelZ',
};

function parseOutFile(fileContent) {
  const lines = fileContent.split('\n');
  let headerIdx = -1;
  let dataStartIdx = -1;
  
  // Find header line containing "Time"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(COLUMNS.time)) {
      headerIdx = i;
      dataStartIdx = i + 2; // Skip header and units row
      break;
    }
  }
  
  if (headerIdx === -1) {
    throw new Error('Could not find header row with Time column');
  }
  
  // Parse header
  const headers = lines[headerIdx].trim().split(/\s+/);
  
  // Parse data rows
  const data = [];
  for (let i = dataStartIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(/\s+/);
    if (values.length !== headers.length) continue;
    
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = parseFloat(values[idx]);
    });
    data.push(row);
  }
  
  return { headers, data };
}

function calculateMean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function getGroupKey(fileName) {
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('_seed')) {
    return lowerName.split('_seed')[0];
  }
  return fileName.replace(/\.[^/.]+$/, ''); // Remove extension
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files');
    const airDensity = parseFloat(formData.get('airDensity')) || 1.225;
    const rotorArea = parseFloat(formData.get('rotorArea')) || 26830;
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }
    
    const allFileResults = [];
    
    for (const file of files) {
      try {
        const content = await file.text();
        const { headers, data } = parseOutFile(content);
        
        if (data.length === 0) {
          console.warn(`File ${file.name} is empty, skipping`);
          continue;
        }
        
        // Calculate resultant wind speed for each row
        const windSpeeds = data.map(row => 
          Math.sqrt(
            Math.pow(row[COLUMNS.windX] || 0, 2) +
            Math.pow(row[COLUMNS.windY] || 0, 2) +
            Math.pow(row[COLUMNS.windZ] || 0, 2)
          )
        );
        
        const meanWindSpeed = calculateMean(windSpeeds);
        
        if (meanWindSpeed === 0) {
          console.warn(`Mean wind speed for ${file.name} is 0, skipping`);
          continue;
        }
        
        // Extract column data
        const cpValues = data.map(row => row[COLUMNS.cp] || 0);
        const ctValues = data.map(row => row[COLUMNS.ct] || 0);
        const powerValues = data.map(row => row[COLUMNS.genPwr] || 0);
        const torqueValues = data.map(row => row[COLUMNS.torque] || 0);
        const rpmValues = data.map(row => row[COLUMNS.rpm] || 0);
        const bladePitch1Values = data.map(row => row[COLUMNS.bladePitch1] || 0);
        const bladePitch2Values = data.map(row => row[COLUMNS.bladePitch2] || 0);
        const bladePitch3Values = data.map(row => row[COLUMNS.bladePitch3] || 0);
        
        // Calculate averages
        const fileResult = {
          windSpeedGroup: getGroupKey(file.name),
          fileName: file.name,
          power: calculateMean(powerValues),
          torque: calculateMean(torqueValues),
          genSpeed: calculateMean(rpmValues),
          cp: calculateMean(cpValues),
          ct: calculateMean(ctValues),
          windSpeed: meanWindSpeed,
          bladePitch1: calculateMean(bladePitch1Values),
          bladePitch2: calculateMean(bladePitch2Values),
          bladePitch3: calculateMean(bladePitch3Values),
        };
        
        allFileResults.push(fileResult);
        
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        continue;
      }
    }
    
    if (allFileResults.length === 0) {
      return NextResponse.json(
        { error: 'No files were successfully processed' },
        { status: 400 }
      );
    }
    
    // Group by wind speed group and calculate averages
    const groups = {};
    allFileResults.forEach(result => {
      if (!groups[result.windSpeedGroup]) {
        groups[result.windSpeedGroup] = [];
      }
      groups[result.windSpeedGroup].push(result);
    });
    
    const powerCurve = Object.entries(groups).map(([group, results]) => {
      const avgPower = calculateMean(results.map(r => r.power));
      const avgTorque = calculateMean(results.map(r => r.torque));
      const avgGenSpeed = calculateMean(results.map(r => r.genSpeed));
      const avgCp = calculateMean(results.map(r => r.cp));
      const avgCt = calculateMean(results.map(r => r.ct));
      const avgWindSpeed = calculateMean(results.map(r => r.windSpeed));
      const avgBladePitch1 = calculateMean(results.map(r => r.bladePitch1));
      const avgBladePitch2 = calculateMean(results.map(r => r.bladePitch2));
      const avgBladePitch3 = calculateMean(results.map(r => r.bladePitch3));
      
      // Round wind speed to nearest 0.5
      const roundedWindSpeed = Math.round(avgWindSpeed * 2) / 2;
      
      return {
        group,
        windSpeed: roundedWindSpeed,
        power: avgPower,
        torque: avgTorque,
        genSpeed: avgGenSpeed,
        cp: avgCp,
        ct: avgCt,
        bladePitch1: avgBladePitch1,
        bladePitch2: avgBladePitch2,
        bladePitch3: avgBladePitch3,
      };
    });
    
    // Sort by wind speed
    powerCurve.sort((a, b) => a.windSpeed - b.windSpeed);
    
    // Generate CSV for individual seeds
    const individualSeedsCSV = generateIndividualSeedsCSV(allFileResults);
    
    // Generate CSV for power curve
    const powerCurveCSV = generatePowerCurveCSV(powerCurve);
    
    return NextResponse.json({
      success: true,
      filesProcessed: allFileResults.length,
      powerCurve,
      individualSeedsCSV,
      powerCurveCSV,
    });
    
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}

function generateIndividualSeedsCSV(results) {
  const headers = [
    'WindSpeedGroup',
    'FileName',
    'Power(kW)',
    'Torque(kNm)',
    'GenSpeed(RPM)',
    'Cp',
    'Ct',
    'Bladepitch1',
    'Bladepitch2',
    'Bladepitch3',
    'WindSpeed(ms)'
  ];
  
  let csv = headers.join(',') + '\n';
  
  results.forEach(result => {
    const row = [
      result.windSpeedGroup,
      result.fileName,
      result.power.toFixed(6),
      result.torque.toFixed(6),
      result.genSpeed.toFixed(6),
      result.cp.toFixed(6),
      result.ct.toFixed(6),
      result.bladePitch1.toFixed(6),
      result.bladePitch2.toFixed(6),
      result.bladePitch3.toFixed(6),
      result.windSpeed.toFixed(6),
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

function generatePowerCurveCSV(powerCurve) {
  const headers = [
    'WindSpeedGroup',
    'Power(kW)',
    'Torque(kNm)',
    'GenSpeed(RPM)',
    'Cp',
    'Ct',
    'Bladepitch1',
    'Bladepitch2',
    'Bladepitch3',
    'WindSpeed(ms)'
  ];
  
  let csv = headers.join(',') + '\n';
  
  powerCurve.forEach(result => {
    const row = [
      result.group,
      result.power.toFixed(6),
      result.torque.toFixed(6),
      result.genSpeed.toFixed(6),
      result.cp.toFixed(6),
      result.ct.toFixed(6),
      result.bladePitch1.toFixed(6),
      result.bladePitch2.toFixed(6),
      result.bladePitch3.toFixed(6),
      result.windSpeed.toFixed(6),
    ];
    csv += row.join(',') + '\n';
  });
  
  return csv;
}