# Power Curve Input Generator

A high-performance web application for processing wind turbine simulation data and generating power curve inputs. Built with Next.js and optimized for handling large datasets (100GB+) without UI lag.

## Features

- **Parallel Processing**: Web Worker-based architecture processes thousands of files simultaneously
- **Large Dataset Support**: Handles 100GB+ data with 2640+ files efficiently
- **Multiple Output Formats**: CSV, XLSX, and FW.TXT formats
- **Real-time Progress**: Responsive UI with live progress tracking
- **Seed Averages & Power Curves**: Generates both individual seed statistics and aggregated power curves
- **Zero UI Lag**: All heavy computation runs on background threads

## Quick Start

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Run the development server**:

   ```bash
   npm run dev
   ```

3. **Open** [http://localhost:3000](http://localhost:3000)

## Usage

1. **Upload Files**: Select multiple `.out` files from wind turbine simulations
2. **Configure Parameters**: Set air density and other simulation parameters
3. **Choose Formats**: Select output formats (CSV, XLSX, FW.TXT)
4. **Process**: Click process to start parallel file processing
5. **Download**: Get a ZIP file containing seed averages and power curve data

## Technical Details

- **Frontend**: Next.js 16 with React
- **Processing**: Web Workers for parallel computation
- **File Parsing**: Optimized text processing with manual parsing (no regex)
- **Memory Management**: Zero-copy ArrayBuffer transfers
- **Performance**: 3-5x faster than traditional single-threaded processing

## Requirements

- Modern web browser with Web Worker support
- Node.js 18+ for development
- Sufficient RAM for large datasets (recommend 16GB+)

## Output Files

Each processing run generates:

- **Seed Averages**: Individual file statistics averaged by wind speed groups
- **Power Curves**: Aggregated performance curves across all processed data
- **ZIP Package**: All results in selected formats with timestamped filenames
