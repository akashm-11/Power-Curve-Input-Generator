import { processOpenFASTOutFiles } from "@/lib/openfastProcessor.js";
import { convertDataToFormat } from "@/lib/formatConverters.js";

export const runtime = "nodejs";

export async function POST(req) {
  console.log("Content-Length:", req.headers.get("content-length"));

  try {
    const body = await req.json();
    const {
      files,
      airDensity = 1.225,
      rotorArea = 28630,
      formats = ["csv"], // Now accepts array of formats
    } = body;

    if (!Array.isArray(files) || !files.length) {
      return new Response("No files provided", { status: 400 });
    }

    if (!Array.isArray(formats) || !formats.length) {
      return new Response("No formats specified", { status: 400 });
    }

    // Process files once
    const { individualData, powerCurveData, baseName } =
      processOpenFASTOutFiles(files, airDensity, rotorArea);

    // Generate all requested formats
    const results = {};

    for (const format of formats) {
      // Generate individual (seed averages)
      const individualResult = convertDataToFormat(
        individualData,
        format,
        "Seed Averages",
      );

      // Generate power curve
      const powerCurveResult = convertDataToFormat(
        powerCurveData,
        format,
        "Power Curve",
      );

      results[format] = {
        individual: {
          content:
            format === "xlsx"
              ? individualResult.content.toString("base64")
              : individualResult.content,
          filename: `${baseName.individual}.${individualResult.ext}`,
          type: individualResult.type,
          ext: individualResult.ext,
        },
        powerCurve: {
          content:
            format === "xlsx"
              ? powerCurveResult.content.toString("base64")
              : powerCurveResult.content,
          filename: `${baseName.powerCurve}.${powerCurveResult.ext}`,
          type: powerCurveResult.type,
          ext: powerCurveResult.ext,
        },
      };
    }

    // Return JSON with all formats and file types
    return new Response(JSON.stringify(results), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error("Conversion error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Conversion failed" }),
      { status: 500 },
    );
  }
}
