import { ProcessedData } from '../types';

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
  rowCount?: number;
}

export class ExportService {
  /**
   * Convert processed data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects
    const allKeys = new Set<string>();
    data.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys).sort();
    
    // Create CSV header
    const csvHeader = headers.map(header => `"${header}"`).join(',');
    
    // Create CSV rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) {
          return '""';
        }
        if (Array.isArray(value)) {
          return `"${value.join('; ')}"`;
        }
        if (typeof value === 'object') {
          return `"${JSON.stringify(value)}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });

    return [csvHeader, ...csvRows].join('\n');
  }

  /**
   * Export processed data to CSV file
   */
  async exportToCSV(processedData: ProcessedData, outputDir: string): Promise<ExportResult> {
    try {
      console.log('Starting CSV export...');
      
      if (!processedData.flattenedRows || processedData.flattenedRows.length === 0) {
        throw new Error('No data to export');
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ars_data_${processedData.metadata.pk}_${timestamp}.csv`;
      const filePath = `${outputDir}/${filename}`;

      // Convert data to CSV
      const csvContent = this.convertToCSV(processedData.flattenedRows);
      
      // Save to file using Electron's file system
      if (window.electronAPI) {
        const result = await window.electronAPI.saveCSVFile(filePath, csvContent);
        return {
          success: result.success,
          filePath: result.filePath,
          error: result.error,
          rowCount: processedData.flattenedRows.length
        };
      } else {
        throw new Error('Electron API not available');
      }

    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export processed data to JSON file
   */
  async exportToJSON(processedData: ProcessedData, outputDir: string): Promise<ExportResult> {
    try {
      console.log('Starting JSON export...');
      
      if (!processedData.flattenedRows || processedData.flattenedRows.length === 0) {
        throw new Error('No data to export');
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `ars_data_${processedData.metadata.pk}_${timestamp}.json`;
      const filePath = `${outputDir}/${filename}`;

      // Prepare JSON content
      const jsonContent = {
        metadata: processedData.metadata,
        data: processedData.flattenedRows,
        exportInfo: {
          exportedAt: new Date().toISOString(),
          rowCount: processedData.flattenedRows.length,
          format: 'json'
        }
      };
      
      // Save to file using Electron's file system
      if (window.electronAPI) {
        const result = await window.electronAPI.saveJSONFile(filePath, jsonContent);
        return {
          success: result.success,
          filePath: result.filePath,
          error: result.error,
          rowCount: processedData.flattenedRows.length
        };
      } else {
        throw new Error('Electron API not available');
      }

    } catch (error) {
      console.error('Error exporting to JSON:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
} 