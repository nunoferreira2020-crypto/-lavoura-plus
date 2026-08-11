export const MILK_ANALYSIS_METRICS = [
  'fat',
  'protein',
  'somatic_cells',
  'ufc'
]

export function getMilkAnalysisRecords(records = []) {
  return records
    .filter(record =>
      MILK_ANALYSIS_METRICS.some(metric =>
        record[metric] !== null &&
        record[metric] !== undefined &&
        record[metric] !== ''
      )
    )
    .sort((first, second) =>
      String(second.record_date || '')
        .localeCompare(
          String(first.record_date || '')
        )
    )
}

export function getMilkAnalysisSummary(records = []) {
  const analyses = getMilkAnalysisRecords(records)

  return Object.fromEntries(
    MILK_ANALYSIS_METRICS.map(metric => {
      const values = analyses
        .map(record => Number(record[metric]))
        .filter(Number.isFinite)

      return [
        metric,
        values.length
          ? values.reduce((total, value) => total + value, 0) / values.length
          : null
      ]
    })
  )
}

export function getMilkMetricTrend(records, metric) {
  const values = getMilkAnalysisRecords(records)
    .map(record => Number(record[metric]))
    .filter(Number.isFinite)

  if (values.length < 2 || values[0] === values[1]) {
    return 'stable'
  }

  return values[0] > values[1]
    ? 'up'
    : 'down'
}

export function buildMilkAnalysisPayload(values, farmId) {
  return {
    farm_id: farmId,
    record_date: values.record_date,
    fat: Number(values.fat),
    protein: Number(values.protein),
    somatic_cells: Math.round(Number(values.somatic_cells)),
    ufc: Math.round(Number(values.ufc)),
    notes: String(values.notes || '').trim() || null
  }
}
