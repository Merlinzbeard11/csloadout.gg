/**
 * Outlier Detection Utility (IQR Method)
 * Feature 04: Multi-Marketplace Price Aggregation
 * BDD Reference: features/04-price-aggregation.feature
 *
 * IQR (Interquartile Range) Method Implementation:
 *   - More robust than Z-score for skewed distributions
 *   - Resistant to extreme outliers
 *   - Used to detect and filter price anomalies from marketplace data
 *
 * Gotcha #7 from Feature 04 spec:
 *   "Z-Score Outlier Detection Fails With Extreme Outliers"
 *   Solution: Use IQR method which uses median-based quartiles
 *
 * Mathematical Background:
 *   Q1 = 25th percentile (first quartile)
 *   Q3 = 75th percentile (third quartile)
 *   IQR = Q3 - Q1 (interquartile range)
 *   Lower Bound = Q1 - 1.5 * IQR
 *   Upper Bound = Q3 + 1.5 * IQR
 *   Outliers = values < lower bound OR > upper bound
 */

/**
 * Result of IQR calculation
 */
export interface IQRResult {
  q1: number; // First quartile (25th percentile)
  q3: number; // Third quartile (75th percentile)
  iqr: number; // Interquartile range (Q3 - Q1)
  lowerBound: number; // Q1 - 1.5 * IQR
  upperBound: number; // Q3 + 1.5 * IQR
  median: number; // 50th percentile (for reference)
}

/**
 * Result of outlier detection
 */
export interface OutlierDetectionResult<T = number> {
  outliers: T[]; // Values flagged as outliers
  normalValues: T[]; // Values within normal range
  stats: IQRResult; // Statistical details
}

/**
 * Configuration for outlier detection
 */
export interface OutlierDetectionConfig {
  /**
   * IQR multiplier for bounds calculation
   * Standard: 1.5 (moderate)
   * Strict: 3.0 (fewer outliers, more lenient)
   * @default 1.5
   */
  multiplier?: number;

  /**
   * Minimum dataset size for IQR calculation
   * @default 4
   */
  minDatasetSize?: number;
}

/**
 * Calculate percentile value from sorted array
 * Uses linear interpolation between adjacent values
 * Method: Interpolation between closest ranks (Method used in Excel PERCENTILE.INC)
 *
 * @param sortedData - Array sorted in ascending order
 * @param percentile - Percentile to calculate (0-100)
 * @returns Interpolated percentile value
 */
function calculatePercentile(sortedData: number[], percentile: number): number {
  if (sortedData.length === 0) {
    throw new Error('Cannot calculate percentile of empty array');
  }

  if (sortedData.length === 1) {
    return sortedData[0];
  }

  // Calculate position using method: rank = percentile/100 * (n + 1)
  // This is the "inclusive" method (Excel PERCENTILE.INC, R quantile type 7)
  // Convert to 0-based index: position = rank - 1
  const p = percentile / 100;
  const rank = p * (sortedData.length + 1);  // 1-based rank
  const position = rank - 1;  // Convert to 0-based position

  // Clamp to valid array bounds
  if (position <= 0) return sortedData[0];
  if (position >= sortedData.length - 1) return sortedData[sortedData.length - 1];

  // Linear interpolation between adjacent values
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);

  if (lowerIndex === upperIndex) {
    return sortedData[lowerIndex];
  }

  const lowerValue = sortedData[lowerIndex];
  const upperValue = sortedData[upperIndex];
  const fraction = position - lowerIndex;

  return lowerValue + fraction * (upperValue - lowerValue);
}

/**
 * Calculate IQR statistics from dataset
 *
 * @param data - Array of numeric values
 * @param config - Optional configuration
 * @returns IQR statistics including quartiles and bounds
 */
export function calculateIQR(
  data: number[],
  config: OutlierDetectionConfig = {}
): IQRResult {
  const { multiplier = 1.5, minDatasetSize = 4 } = config;

  // Validate input
  if (data.length === 0) {
    throw new Error('Cannot calculate IQR for empty dataset');
  }

  if (data.length < minDatasetSize) {
    throw new Error(
      `Dataset too small for IQR calculation (${data.length} < ${minDatasetSize})`
    );
  }

  // Sort data ascending
  const sorted = [...data].sort((a, b) => a - b);

  // Calculate quartiles
  const q1 = calculatePercentile(sorted, 25);
  const q3 = calculatePercentile(sorted, 75);
  const median = calculatePercentile(sorted, 50);

  // Calculate IQR
  const iqr = q3 - q1;

  // Calculate bounds
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  return {
    q1: parseFloat(q1.toFixed(2)),
    q3: parseFloat(q3.toFixed(2)),
    iqr: parseFloat(iqr.toFixed(2)),
    lowerBound: parseFloat(lowerBound.toFixed(2)),
    upperBound: parseFloat(upperBound.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
  };
}

/**
 * Detect outliers in numeric dataset using IQR method
 *
 * @param data - Array of numeric values
 * @param config - Optional configuration
 * @returns Outliers and normal values with statistics
 */
export function detectOutliers(
  data: number[],
  config: OutlierDetectionConfig = {}
): OutlierDetectionResult<number> {
  // Handle edge cases
  if (data.length === 0) {
    return {
      outliers: [],
      normalValues: [],
      stats: {
        q1: 0,
        q3: 0,
        iqr: 0,
        lowerBound: 0,
        upperBound: 0,
        median: 0,
      },
    };
  }

  const minSize = config.minDatasetSize ?? 4;
  if (data.length < minSize) {
    // Too small for IQR, treat all as normal
    return {
      outliers: [],
      normalValues: [...data],
      stats: {
        q1: Math.min(...data),
        q3: Math.max(...data),
        iqr: 0,
        lowerBound: Math.min(...data),
        upperBound: Math.max(...data),
        median: data[0],
      },
    };
  }

  // Calculate IQR statistics
  const stats = calculateIQR(data, config);

  // Classify values
  const outliers = data.filter(
    (value) => value < stats.lowerBound || value > stats.upperBound
  );

  const normalValues = data.filter(
    (value) => value >= stats.lowerBound && value <= stats.upperBound
  );

  return {
    outliers,
    normalValues,
    stats,
  };
}

/**
 * Detect outliers in objects by extracting numeric value
 * Useful for PriceData objects from price aggregation
 *
 * @param data - Array of objects
 * @param extractValue - Function to extract numeric value from object
 * @param config - Optional configuration
 * @returns Outlier objects and normal objects with statistics
 */
export function detectOutliersInObjects<T>(
  data: T[],
  extractValue: (item: T) => number,
  config: OutlierDetectionConfig = {}
): OutlierDetectionResult<T> {
  // Extract numeric values
  const values = data.map(extractValue);

  // Detect outliers in numeric values
  const numericResult = detectOutliers(values, config);

  // Map back to original objects
  const outlierSet = new Set(numericResult.outliers);
  const normalSet = new Set(numericResult.normalValues);

  const outliers: T[] = [];
  const normalValues: T[] = [];

  for (const item of data) {
    const value = extractValue(item);
    if (outlierSet.has(value)) {
      outliers.push(item);
      outlierSet.delete(value); // Prevent duplicates
    } else if (normalSet.has(value)) {
      normalValues.push(item);
      normalSet.delete(value); // Prevent duplicates
    }
  }

  return {
    outliers,
    normalValues,
    stats: numericResult.stats,
  };
}

/**
 * Filter outliers from numeric dataset
 * Convenience function that returns only normal values
 *
 * @param data - Array of numeric values
 * @param config - Optional configuration
 * @returns Array of normal values (outliers removed)
 */
export function filterOutliers(
  data: number[],
  config: OutlierDetectionConfig = {}
): number[] {
  const result = detectOutliers(data, config);
  return result.normalValues;
}

/**
 * Filter outliers from objects
 * Convenience function that returns only normal objects
 *
 * @param data - Array of objects
 * @param extractValue - Function to extract numeric value from object
 * @param config - Optional configuration
 * @returns Array of normal objects (outliers removed)
 */
export function filterOutliersInObjects<T>(
  data: T[],
  extractValue: (item: T) => number,
  config: OutlierDetectionConfig = {}
): T[] {
  const result = detectOutliersInObjects(data, extractValue, config);
  return result.normalValues;
}

/**
 * Log outliers for investigation
 * In production, this would integrate with structured logging
 *
 * @param outliers - Array of outlier values
 * @param context - Context information for logging
 */
export function logOutliers(
  outliers: number[],
  context: {
    itemId?: string;
    itemName?: string;
    platform?: string;
  } = {}
): void {
  if (outliers.length === 0) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    count: outliers.length,
    outliers: outliers,
    context: context,
    reason: 'Price exceeds IQR bounds',
  };

  // In production: structured logging to centralized system
  console.warn('[Outlier Detection]', JSON.stringify(logEntry, null, 2));
}
