type CsvValue = string | number | null;

type CsvMetric = {
  label: string;
  value: string | number;
  numericValue?: number;
  changePercent?: number | null;
  kind?: "money" | "count" | "percent" | "text";
};

type CsvChart = {
  title: string;
  type: "line" | "bar" | "pie";
  data: Record<string, CsvValue>[];
  xKey?: string;
  series: { key: string; label: string; kind?: "money" | "number" | "percent" }[];
};

type CsvTable = {
  title: string;
  columns: { key: string; label: string; kind?: "money" | "number" | "percent" | "date" }[];
  rows: Record<string, CsvValue>[];
};

export type CsvReportData = {
  reportType: string;
  reportTitle: string;
  dateRange: string;
  hasData: boolean;
  reportPeriod?: {
    dateFrom: string;
    dateTo: string;
    days: number;
    comparisonDateFrom: string;
    comparisonDateTo: string;
    granularity: string;
  };
  metrics: CsvMetric[];
  charts: CsvChart[];
  tables: CsvTable[];
  ai: {
    insight: string;
    recommendation: string;
    insights?: { icon: string; title: string; body: string }[];
    weeklyInsight?: string;
    serviceRecommendation?: string;
  };
  notes: string[];
  sourceData: {
    revenueDefinition: string;
    customerDefinition: string;
    barberAttribution: string;
    paymentMethodDefinition: string;
    currentVatRate: number;
  };
};

export const COMPLETE_REPORT_CSV_COLUMNS = [
  "Report Type",
  "Report Title",
  "Section",
  "Subsection",
  "Item",
  "Description",
  "Category",
  "Date/Period",
  "Series",
  "Row",
  "Value",
  "Unit",
] as const;

type CompleteCsvRow = Record<(typeof COMPLETE_REPORT_CSV_COLUMNS)[number], CsvValue>;

function emptyRow(report: CsvReportData): CompleteCsvRow {
  return {
    "Report Type": report.reportType,
    "Report Title": report.reportTitle,
    Section: "",
    Subsection: "",
    Item: "",
    Description: "",
    Category: "",
    "Date/Period": "",
    Series: "",
    Row: "",
    Value: "",
    Unit: "",
  };
}

function humanizeKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function isDateOrPeriodKey(key: string): boolean {
  return /(date|period|day|week|month|year|hour|time)/i.test(key);
}

function metricUnit(metric: CsvMetric): string {
  if (metric.kind === "money") return "PHP";
  if (metric.kind === "percent") return "%";
  if (metric.kind === "count") return "Count";
  if (metric.kind === "text" || (typeof metric.value === "string" && typeof metric.numericValue !== "number")) return "";
  const label = metric.label.toLowerCase();
  if (/(revenue|sales|amount|subtotal|discount|vat|spend|payment|transaction value)/.test(label)) return "PHP";
  if (/(rate|percentage|share|configured vat)/.test(label)) return "%";
  if (/(transactions|appointments|customers|participants|rewards|visits|services rendered)/.test(label)) return "Count";
  return "";
}

function dataUnit(kind: CsvChart["series"][number]["kind"] | CsvTable["columns"][number]["kind"], label: string): string {
  if (kind === "money") return "PHP";
  if (kind === "percent") return "%";
  if (kind === "date") return "";
  if (/(percent|rate|share)/i.test(label)) return "%";
  if (/(revenue|amount|discount|subtotal|total|spend|payment)/i.test(label)) return "PHP";
  if (/(count|transactions|appointments|customers|services|activity|earned|redeemed|volume)/i.test(label)) return "Count";
  return "";
}

function csvEscape(value: CsvValue): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvLine(values: CsvValue[]): string {
  return values.map(csvEscape).join(",");
}

function roundedPercent(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((((value / total) * 100) + Number.EPSILON) * 10) / 10;
}

function displayPercent(value: CsvValue): string {
  return `${Number(value ?? 0)}%`;
}

function summaryChartKeys(chart: CsvChart, xKey: string): string[] {
  const configuredKeys = chart.series.map((series) => series.key);
  const dataKeys = chart.data.flatMap((record) => Object.keys(record));
  return Array.from(new Set([...configuredKeys, ...dataKeys]))
    .filter((key) => key !== xKey && key !== "startMinutes");
}

function summaryAiType(title: string): string {
  if (/recommend|action/i.test(title)) return "Recommendation";
  if (/note/i.test(title)) return "Business Note";
  return "Insight";
}

function summaryAiRows(report: CsvReportData): CsvValue[][] {
  const rows: CsvValue[][] = [];
  const exportedContent = new Set<string>();
  const add = (type: string, content?: string) => {
    const trimmed = content?.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLocaleLowerCase().replace(/\s+/g, " ");
    if (exportedContent.has(normalized)) return;
    exportedContent.add(normalized);
    rows.push([type, trimmed]);
  };

  add("Insight", report.ai.insight);
  add("Recommendation", report.ai.recommendation);
  report.ai.insights?.forEach((item) => add(summaryAiType(item.title), item.body));
  add("Insight", report.ai.weeklyInsight);
  add("Recommendation", report.ai.serviceRecommendation);
  return rows;
}

function exportSummaryReportToCsv(report: CsvReportData, generatedAt: string): string {
  const lines: string[] = [];
  const addRow = (...values: CsvValue[]) => lines.push(csvLine(values));
  const addBlankRow = () => lines.push("");

  addRow(report.reportTitle.toUpperCase());
  addRow("Period", report.dateRange);
  if (generatedAt.trim()) addRow("Generated", generatedAt);

  addBlankRow();
  addRow("METRICS");
  addRow("Metric", "Value", "Unit");
  report.metrics.forEach((metric) => {
    addRow(metric.label, typeof metric.numericValue === "number" ? metric.numericValue : metric.value, metricUnit(metric));
  });

  const comparisons = report.metrics.filter(
    (metric) => metric.changePercent !== null && metric.changePercent !== undefined,
  );
  if (comparisons.length) {
    addBlankRow();
    addRow("COMPARISONS");
    addRow("Metric", "Change");
    comparisons.forEach((metric) => {
      const change = metric.changePercent ?? 0;
      addRow(metric.label, `${change > 0 ? "+" : ""}${change}%`);
    });
  }

  addBlankRow();
  addRow("CHART DATA");
  addRow("Chart", "Category", "Series", "Value", "Unit");
  report.charts.forEach((chart) => {
    if (!chart.data.length) {
      addRow(chart.title, "No data available for the selected period.", "", "", "");
      return;
    }

    const xKey = chart.xKey ?? "category";
    const seriesByKey = new Map(chart.series.map((series) => [series.key, series]));
    const keys = summaryChartKeys(chart, xKey);
    const alreadyHasShare = keys.some((key) => /(percent|rate|share)/i.test(key));
    const primarySeries = chart.series[0];
    const primaryTotal = primarySeries
      ? chart.data.reduce((total, record) => total + Number(record[primarySeries.key] ?? 0), 0)
      : 0;

    chart.data.forEach((record) => {
      const category = record[xKey] ?? "";
      keys.forEach((key) => {
        const series = seriesByKey.get(key);
        const label = series?.label ?? humanizeKey(key);
        addRow(chart.title, category, label, record[key] ?? "", dataUnit(series?.kind, label));
      });
      if (chart.type === "pie" && primarySeries && !alreadyHasShare) {
        addRow(
          chart.title,
          category,
          "Share",
          roundedPercent(Number(record[primarySeries.key] ?? 0), primaryTotal),
          "%",
        );
      }
    });
  });

  report.tables.forEach((table) => {
    addBlankRow();
    addRow(table.title.toUpperCase());
    addRow(...table.columns.map((column) => column.label));
    if (!table.rows.length) {
      addRow("No data available for the selected period.");
      return;
    }
    table.rows.forEach((record) => {
      addRow(...table.columns.map((column) => {
        const value = record[column.key] ?? "";
        return column.kind === "percent" ? displayPercent(value) : value;
      }));
    });
  });

  const metricNumber = (label: string): number => {
    const metric = report.metrics.find((candidate) => candidate.label === label);
    return Number(metric?.numericValue ?? metric?.value ?? 0);
  };
  const newCustomers = metricNumber("New Customers");
  const returningCustomers = metricNumber("Returning Customers");
  const customerTotal = newCustomers + returningCustomers;
  addBlankRow();
  addRow("CUSTOMER MIX");
  addRow("Customer Type", "Share");
  addRow("New", displayPercent(roundedPercent(newCustomers, customerTotal)));
  addRow("Returning", displayPercent(roundedPercent(returningCustomers, customerTotal)));

  const aiRows = summaryAiRows(report);
  if (aiRows.length) {
    addBlankRow();
    addRow("AI ANALYSIS");
    addRow("Type", "Content");
    aiRows.forEach((row) => addRow(...row));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

const CONCISE_REPORT_TYPES = new Set([
  "sales",
  "appointments",
  "services",
  "barbers",
  "customers",
  "loyalty",
  "discounts",
]);

function conciseMetricUnit(reportType: string, metric: CsvMetric): string {
  if (reportType === "appointments" && !/(rate)/i.test(metric.label)) return "Count";
  if (reportType === "discounts") {
    if (/(percentage|rate)/i.test(metric.label)) return "%";
    if (/transactions/i.test(metric.label) && !/average discount/i.test(metric.label)) return "Count";
  }
  return metricUnit(metric);
}

function conciseAiRows(report: CsvReportData): CsvValue[][] {
  const rows: CsvValue[][] = [];
  const exportedContent = new Set<string>();
  const add = (type: string, content?: string) => {
    const trimmed = content?.trim();
    if (!trimmed) return;
    const normalized = trimmed.toLocaleLowerCase().replace(/\s+/g, " ");
    if (exportedContent.has(normalized)) return;
    exportedContent.add(normalized);
    rows.push([type, trimmed]);
  };

  add("Insight", report.ai.insight);
  add("Recommendation", report.ai.recommendation);
  report.ai.insights?.forEach((item) => add(summaryAiType(item.title), item.body));
  add("Insight", report.ai.weeklyInsight);
  add("Recommendation", report.ai.serviceRecommendation);
  return rows;
}

function reportMetricNumber(report: CsvReportData, label: string): number {
  const metric = report.metrics.find((candidate) => candidate.label === label);
  return Number(metric?.numericValue ?? metric?.value ?? 0);
}

function conciseMetrics(report: CsvReportData): CsvMetric[] {
  if (report.reportType !== "sales") return report.metrics;
  const tableOrDuplicateMetrics = new Set([
    "Booking Revenue",
    "Walk-in Revenue",
    "Booking Transaction Count",
    "Walk-in Transaction Count",
    "Net Revenue after discounts",
    "VAT-inclusive total",
    "Cash Payments",
    "GCash Payments",
    "PayMongo / Online Payments",
  ]);
  return report.metrics.filter((metric) => !tableOrDuplicateMetrics.has(metric.label));
}

function exportConciseReportToCsv(report: CsvReportData, generatedAt: string): string {
  const lines: string[] = [];
  const addRow = (...values: CsvValue[]) => lines.push(csvLine(values));
  const addBlankRow = () => lines.push("");

  addRow(report.reportTitle.toUpperCase());
  addRow("Period", report.dateRange);
  if (generatedAt.trim()) addRow("Generated", generatedAt);

  addBlankRow();
  addRow("METRICS");
  addRow("Metric", "Value", "Unit");
  conciseMetrics(report).forEach((metric) => {
    const value = typeof metric.numericValue === "number" ? metric.numericValue : metric.value;
    addRow(metric.label, value, conciseMetricUnit(report.reportType, metric));
  });

  const comparisons = report.metrics.filter(
    (metric) => metric.changePercent !== null && metric.changePercent !== undefined,
  );
  if (comparisons.length) {
    addBlankRow();
    addRow("COMPARISONS");
    addRow("Metric", "Change");
    comparisons.forEach((metric) => {
      const change = metric.changePercent ?? 0;
      addRow(metric.label, `${change > 0 ? "+" : ""}${change}%`);
    });
  }

  addBlankRow();
  addRow("CHART DATA");
  addRow("Chart", "Category", "Series", "Value", "Unit");
  const salesRevenueChart = report.reportType === "sales"
    ? report.charts.find((chart) => chart.title === "Walk-in vs Booking revenue")
    : undefined;
  const salesTransactionChart = report.reportType === "sales"
    ? report.charts.find((chart) => chart.title === "Walk-in vs Booking transaction count")
    : undefined;
  const chartsToExport = report.charts.filter((chart) => {
    if (report.reportType === "sales" && (chart === salesRevenueChart || chart === salesTransactionChart)) return false;
    if (report.reportType === "loyalty" && chart.title === "Reward Type Distribution") return false;
    return true;
  });
  chartsToExport.forEach((chart) => {
    if (!chart.data.length) {
      addRow(chart.title, "No data available for the selected period.", "", "", "");
      return;
    }

    const xKey = chart.xKey ?? "category";
    chart.data.forEach((record) => {
      const category = record[xKey] ?? "";
      chart.series.forEach((series) => {
        addRow(chart.title, category, series.label, record[series.key] ?? "", dataUnit(series.kind, series.label));
      });
    });

    if (chart.type === "pie" && chart.series[0]) {
      const primarySeries = chart.series[0];
      const total = chart.data.reduce((sum, record) => sum + Number(record[primarySeries.key] ?? 0), 0);
      chart.data.forEach((record) => {
        addRow(chart.title, record[xKey] ?? "", "Share", roundedPercent(Number(record[primarySeries.key] ?? 0), total), "%");
      });
    }

    if (report.reportType === "discounts" && chart.title === "Discount distribution") {
      const totalUsage = chart.data.reduce((sum, record) => sum + Number(record.usageCount ?? 0), 0);
      chart.data.forEach((record) => {
        addRow(chart.title, record[xKey] ?? "", "Usage Count", record.usageCount ?? 0, "Count");
        addRow(chart.title, record[xKey] ?? "", "Usage Share", roundedPercent(Number(record.usageCount ?? 0), totalUsage), "%");
      });
    }
  });

  if (report.reportType === "sales") {
    const revenueBySource = new Map(salesRevenueChart?.data.map((row) => [String(row.source ?? ""), Number(row.revenue ?? 0)]) ?? []);
    const transactionsBySource = new Map(salesTransactionChart?.data.map((row) => [String(row.source ?? ""), Number(row.transactions ?? 0)]) ?? []);
    const sources = Array.from(new Set([...revenueBySource.keys(), ...transactionsBySource.keys()]));
    sources.forEach((source) => {
      addRow("Sales by Source", source, "Revenue", revenueBySource.get(source) ?? 0, "PHP");
      addRow("Sales by Source", source, "Transactions", transactionsBySource.get(source) ?? 0, "Count");
    });
  }

  if (report.reportType === "loyalty") {
    const rewardPairs = [
      ["50% Reward", "50% Rewards Earned/Redeemed"],
      ["Free Reward", "Free Rewards Earned/Redeemed"],
    ] as const;
    rewardPairs.forEach(([category, metricLabel]) => {
      const metric = report.metrics.find((candidate) => candidate.label === metricLabel);
      const [earned, redeemed] = String(metric?.value ?? "0/0").split("/").map((value) => Number(value) || 0);
      addRow("Rewards by Type", category, "Earned", earned, "Count");
      addRow("Rewards by Type", category, "Redeemed", redeemed, "Count");
    });
  }

  if (report.reportType === "discounts") {
    addRow("Revenue Impact of Discounts", "Before Discounts", "Revenue", reportMetricNumber(report, "Revenue Before Discounts"), "PHP");
    addRow("Revenue Impact of Discounts", "After Discounts", "Revenue", reportMetricNumber(report, "Revenue After Discounts"), "PHP");
  }

  if (report.reportType === "sales") {
    const revenueBySource = new Map(salesRevenueChart?.data.map((row) => [String(row.source ?? ""), Number(row.revenue ?? 0)]) ?? []);
    const transactionsBySource = new Map(salesTransactionChart?.data.map((row) => [String(row.source ?? ""), Number(row.transactions ?? 0)]) ?? []);
    const sources = Array.from(new Set([...revenueBySource.keys(), ...transactionsBySource.keys()]));
    const totalRevenue = Array.from(revenueBySource.values()).reduce((sum, value) => sum + value, 0);
    addBlankRow();
    addRow("SALES BY SOURCE");
    addRow("Source", "Revenue", "Transactions", "Revenue Share");
    sources.forEach((source) => {
      const revenue = revenueBySource.get(source) ?? 0;
      addRow(source, revenue, transactionsBySource.get(source) ?? 0, displayPercent(roundedPercent(revenue, totalRevenue)));
    });
  }

  if (report.reportType === "customers") {
    const total = reportMetricNumber(report, "Total Unique Customers");
    const multipleVisits = reportMetricNumber(report, "Customers with Multiple Visits");
    const singleVisits = Math.max(0, total - multipleVisits);
    addBlankRow();
    addRow("CUSTOMER RETENTION");
    addRow("Visit Frequency", "Customers", "Share");
    addRow("Multiple Visits", multipleVisits, displayPercent(roundedPercent(multipleVisits, total)));
    addRow("Single Visit", singleVisits, displayPercent(roundedPercent(singleVisits, total)));
  }

  if (report.reportType === "loyalty") {
    const rewardPairs = [
      ["50% Reward", "50% Rewards Earned/Redeemed"],
      ["Free Reward", "Free Rewards Earned/Redeemed"],
    ] as const;
    addBlankRow();
    addRow("REWARDS BY TYPE");
    addRow("Reward", "Earned", "Redeemed");
    rewardPairs.forEach(([reward, metricLabel]) => {
      const metric = report.metrics.find((candidate) => candidate.label === metricLabel);
      const [earned, redeemed] = String(metric?.value ?? "0/0").split("/").map((value) => Number(value) || 0);
      addRow(reward, earned, redeemed);
    });
  }

  report.tables.forEach((table) => {
    addBlankRow();
    addRow(table.title.toUpperCase());
    const addUsageShare = report.reportType === "discounts" && table.title === "Discount Type Summary";
    const columns = addUsageShare
      ? table.columns.filter((column) => column.key !== "revenue")
      : table.columns;
    addRow(...columns.map((column) => column.label), ...(addUsageShare ? ["Usage Share"] : []));
    if (!table.rows.length) {
      addRow("No data available for the selected period.");
      return;
    }
    const totalUsage = addUsageShare
      ? table.rows.reduce((sum, row) => sum + Number(row.usageCount ?? 0), 0)
      : 0;
    table.rows.forEach((record) => {
      const values = columns.map((column) => {
        const value = record[column.key] ?? "";
        return column.kind === "percent" ? displayPercent(value) : value;
      });
      if (addUsageShare) {
        values.push(displayPercent(roundedPercent(Number(record.usageCount ?? 0), totalUsage)));
      }
      addRow(...values);
    });
  });

  const aiRows = conciseAiRows(report);
  if (aiRows.length) {
    addBlankRow();
    addRow("AI ANALYSIS");
    addRow("Type", "Content");
    aiRows.forEach((row) => addRow(...row));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

function addMetadata(rows: CompleteCsvRow[], report: CsvReportData, generatedAt: string): void {
  const metadata: [string, CsvValue, string?][] = [
    ["Application", "EstiloMo"],
    ["Report Heading", "Reports and Analytics"],
    ["Report Type", report.reportType],
    ["Report Title", report.reportTitle],
    ["Selected Period", report.dateRange],
    ["Generated", generatedAt],
    ["Data Available", report.hasData ? "Yes" : "No"],
  ];
  if (report.reportPeriod) {
    metadata.push(
      ["Date From", report.reportPeriod.dateFrom],
      ["Date To", report.reportPeriod.dateTo],
      ["Number of Days", report.reportPeriod.days, "Days"],
      ["Comparison Date From", report.reportPeriod.comparisonDateFrom],
      ["Comparison Date To", report.reportPeriod.comparisonDateTo],
      ["Chart Granularity", report.reportPeriod.granularity],
    );
  }
  for (const [item, value, unit = ""] of metadata) {
    rows.push({ ...emptyRow(report), Section: "Report Information", Item: item, Value: value, Unit: unit });
  }
}

function addMetrics(rows: CompleteCsvRow[], report: CsvReportData): void {
  for (const metric of report.metrics) {
    const hasNumericValue = typeof metric.numericValue === "number";
    rows.push({
      ...emptyRow(report),
      Section: "Metrics",
      Item: metric.label,
      Description: hasNumericValue && typeof metric.value === "string" ? metric.value : "",
      Value: hasNumericValue ? metric.numericValue! : metric.value,
      Unit: metricUnit(metric),
    });
    if (metric.changePercent !== null && metric.changePercent !== undefined) {
      rows.push({
        ...emptyRow(report),
        Section: "Metric Comparisons",
        Subsection: metric.label,
        Item: "Change from comparison period",
        Value: metric.changePercent,
        Unit: "%",
      });
    }
  }
}

function addCharts(rows: CompleteCsvRow[], report: CsvReportData): void {
  for (const chart of report.charts) {
    if (!chart.data.length) {
      rows.push({
        ...emptyRow(report),
        Section: "Chart Data",
        Subsection: chart.title,
        Item: "No data available for the selected period.",
      });
      continue;
    }

    const xKey = chart.xKey ?? "category";
    const seriesByKey = new Map(chart.series.map((series) => [series.key, series]));
    const dataKeys = Array.from(new Set(chart.data.flatMap((record) => Object.keys(record))))
      .filter((key) => key !== xKey);

    chart.data.forEach((record, rowIndex) => {
      const xValue = record[xKey] ?? "";
      for (const key of dataKeys) {
        const series = seriesByKey.get(key);
        const label = series?.label ?? humanizeKey(key);
        rows.push({
          ...emptyRow(report),
          Section: "Chart Data",
          Subsection: chart.title,
          Item: humanizeKey(xKey),
          Description: `Chart type: ${chart.type}`,
          Category: isDateOrPeriodKey(xKey) ? "" : xValue,
          "Date/Period": isDateOrPeriodKey(xKey) ? xValue : "",
          Series: label,
          Row: rowIndex + 1,
          Value: record[key] ?? "",
          Unit: dataUnit(series?.kind, label),
        });
      }

      if (chart.type === "pie") {
        const primarySeries = chart.series[0];
        const alreadyHasShare = dataKeys.some((key) => /(percent|rate|share)/i.test(key));
        if (primarySeries && !alreadyHasShare) {
          const total = chart.data.reduce((sum, item) => sum + Number(item[primarySeries.key] ?? 0), 0);
          const share = total ? (Number(record[primarySeries.key] ?? 0) / total) * 100 : 0;
          rows.push({
            ...emptyRow(report),
            Section: "Chart Data",
            Subsection: chart.title,
            Item: humanizeKey(xKey),
            Description: `Calculated from the ${primarySeries.label.toLowerCase()} values represented by the chart.`,
            Category: isDateOrPeriodKey(xKey) ? "" : xValue,
            "Date/Period": isDateOrPeriodKey(xKey) ? xValue : "",
            Series: "Share",
            Row: rowIndex + 1,
            Value: Math.round((share + Number.EPSILON) * 10) / 10,
            Unit: "%",
          });
        }
      }
    });
  }
}

function addTables(rows: CompleteCsvRow[], report: CsvReportData): void {
  for (const table of report.tables) {
    if (!table.rows.length) {
      rows.push({
        ...emptyRow(report),
        Section: "Table Data",
        Subsection: table.title,
        Item: "No data available for the selected period.",
      });
      continue;
    }
    table.rows.forEach((record, rowIndex) => {
      for (const column of table.columns) {
        const value = record[column.key] ?? "";
        rows.push({
          ...emptyRow(report),
          Section: "Table Data",
          Subsection: table.title,
          Item: column.label,
          "Date/Period": column.kind === "date" || isDateOrPeriodKey(column.key) ? value : "",
          Series: column.label,
          Row: rowIndex + 1,
          Value: value,
          Unit: dataUnit(column.kind, column.label),
        });
      }
    });
  }
}

function addDisplayedCalculations(rows: CompleteCsvRow[], report: CsvReportData): void {
  const add = (subsection: string, item: string, value: CsvValue, unit: string, category = "") => {
    rows.push({
      ...emptyRow(report),
      Section: "Displayed Calculations",
      Subsection: subsection,
      Item: item,
      Category: category,
      Value: value,
      Unit: unit,
    });
  };
  const metricNumber = (label: string): number => {
    const metric = report.metrics.find((candidate) => candidate.label === label);
    return Number(metric?.numericValue ?? metric?.value ?? 0);
  };
  const roundedShare = (value: number, total: number): number => total
    ? Math.round((((value / total) * 100) + Number.EPSILON) * 10) / 10
    : 0;

  if (report.reportType === "summary") {
    const newCustomers = metricNumber("New Customers");
    const returningCustomers = metricNumber("Returning Customers");
    const total = newCustomers + returningCustomers;
    add("Customer Mix", "Share of customer mix", roundedShare(newCustomers, total), "%", "New");
    add("Customer Mix", "Share of customer mix", roundedShare(returningCustomers, total), "%", "Returning");
  }

  if (report.reportType === "sales") {
    const chart = report.charts.find((candidate) => candidate.title === "Walk-in vs Booking revenue");
    const total = chart?.data.reduce((sum, record) => sum + Number(record.revenue ?? 0), 0) ?? 0;
    chart?.data.forEach((record) => {
      add("Sales by Source", "Share of revenue", roundedShare(Number(record.revenue ?? 0), total), "%", String(record.source ?? ""));
    });
  }

  if (report.reportType === "customers") {
    const total = metricNumber("Total Unique Customers");
    const multipleVisits = metricNumber("Customers with Multiple Visits");
    const singleVisits = Math.max(0, total - multipleVisits);
    add("Customer Retention", "Single Visit", singleVisits, "Count");
    add("Customer Retention", "Share", roundedShare(multipleVisits, total), "%", "Multiple Visits");
    add("Customer Retention", "Share", roundedShare(singleVisits, total), "%", "Single Visit");
  }

  if (report.reportType === "loyalty") {
    const rewardPairs: [string, string][] = [
      ["50% Reward", "50% Rewards Earned/Redeemed"],
      ["Free Reward", "Free Rewards Earned/Redeemed"],
    ];
    for (const [category, metricLabel] of rewardPairs) {
      const metric = report.metrics.find((candidate) => candidate.label === metricLabel);
      const [earned, redeemed] = String(metric?.value ?? "0/0").split("/").map((value) => Number(value) || 0);
      add("Rewards by Type", "Earned", earned, "Count", category);
      add("Rewards by Type", "Redeemed", redeemed, "Count", category);
    }
  }

  if (report.reportType === "discounts") {
    const table = report.tables.find((candidate) => candidate.title === "Discount Type Summary");
    const totalUsage = table?.rows.reduce((sum, record) => sum + Number(record.usageCount ?? 0), 0) ?? 0;
    table?.rows.forEach((record) => {
      add(
        "Discount Type Summary",
        "Share of discount usage",
        roundedShare(Number(record.usageCount ?? 0), totalUsage),
        "%",
        String(record.discountType ?? ""),
      );
    });
  }
}

function addAiText(rows: CompleteCsvRow[], report: CsvReportData): void {
  const insight = report.ai.insight || "No AI insight is available.";
  const recommendation = report.ai.recommendation || "No AI recommendation is available.";
  const exportedBodies = new Set<string>();
  const addText = (subsection: string, item: string, value: string, description = "") => {
    const normalized = value.trim();
    if (!normalized || exportedBodies.has(normalized)) return;
    exportedBodies.add(normalized);
    rows.push({ ...emptyRow(report), Section: "AI Analysis", Subsection: subsection, Item: item, Description: description, Value: value });
  };

  addText("Insight", "AI Insight", insight);
  addText("Recommendation", "AI Recommendation", recommendation);
  report.ai.insights?.forEach((item) => addText("Generated Insights", item.title, item.body, item.icon));
  if (report.ai.weeklyInsight) addText("Generated Insights", "Weekly Insight", report.ai.weeklyInsight);
  if (report.ai.serviceRecommendation) addText("Generated Recommendations", "Service Recommendation", report.ai.serviceRecommendation);
}

function addDefinitionsAndNotes(rows: CompleteCsvRow[], report: CsvReportData): void {
  const definitions: [string, string][] = [
    ["Revenue Definition", report.sourceData.revenueDefinition],
    ["Customer Definition", report.sourceData.customerDefinition],
    ["Barber Attribution", report.sourceData.barberAttribution],
    ["Payment Method Definition", report.sourceData.paymentMethodDefinition],
  ];
  for (const [item, value] of definitions) {
    if (value) rows.push({ ...emptyRow(report), Section: "Metric Definitions", Item: item, Value: value });
  }
  report.notes.forEach((note, index) => {
    rows.push({ ...emptyRow(report), Section: "Metric Definitions", Subsection: "Notes", Item: `Note ${index + 1}`, Value: note });
  });
}

export function buildCompleteReportCsvRows(report: CsvReportData, generatedAt: string): CompleteCsvRow[] {
  const rows: CompleteCsvRow[] = [];
  addMetadata(rows, report, generatedAt);
  addMetrics(rows, report);
  addCharts(rows, report);
  addTables(rows, report);
  addDisplayedCalculations(rows, report);
  addAiText(rows, report);
  addDefinitionsAndNotes(rows, report);
  return rows;
}

export function exportReportToCsv(report: CsvReportData, generatedAt: string): string {
  if (report.reportType === "summary") {
    return exportSummaryReportToCsv(report, generatedAt);
  }

  if (CONCISE_REPORT_TYPES.has(report.reportType)) {
    return exportConciseReportToCsv(report, generatedAt);
  }

  const rows = buildCompleteReportCsvRows(report, generatedAt);
  const lines = [COMPLETE_REPORT_CSV_COLUMNS.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(COMPLETE_REPORT_CSV_COLUMNS.map((column) => csvEscape(row[column])).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}
