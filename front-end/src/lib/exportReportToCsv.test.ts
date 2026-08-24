import assert from "node:assert/strict";
import test from "node:test";

import { buildCompleteReportCsvRows, exportReportToCsv, type CsvReportData } from "./exportReportToCsv";

function reportFixture(): CsvReportData {
  return {
    reportType: "summary",
    reportTitle: "Summary Report",
    dateRange: "Aug 1, 2026 - Aug 24, 2026",
    hasData: true,
    reportPeriod: {
      dateFrom: "2026-08-01",
      dateTo: "2026-08-24",
      days: 24,
      comparisonDateFrom: "2026-07-08",
      comparisonDateTo: "2026-07-31",
      granularity: "daily",
    },
    metrics: [{ label: "Total Revenue", value: 25000, numericValue: 25000, changePercent: 12.5 }],
    charts: [{
      title: "Revenue and Transaction Trend",
      type: "line",
      xKey: "period",
      series: [
        { key: "revenue", label: "Revenue", kind: "money" },
        { key: "transactions", label: "Transactions", kind: "number" },
      ],
      data: [
        { period: "2026-08-01", revenue: 1000, transactions: 4 },
        { period: "2026-08-02", revenue: 1500, transactions: 6 },
      ],
    }],
    tables: [{
      title: "Details",
      columns: [{ key: "name", label: "Name" }, { key: "note", label: "Note" }],
      rows: [
        { name: "José, Jr.", note: "He said \"great\".\nBumalik siya." },
        { name: "Ana", note: "Mahabang paliwanag" },
      ],
    }],
    ai: {
      insight: "Revenue rose, despite a slower week.\nReview the daily trend.",
      recommendation: "Keep the \"weekend\" offer.",
      insights: [
        { icon: "trend", title: "Revenue insight", body: "Revenue rose, despite a slower week.\nReview the daily trend." },
        { icon: "people", title: "Customer insight", body: "Mga suki returned." },
      ],
    },
    notes: ["A note, with punctuation."],
    sourceData: {
      revenueDefinition: "Paid sales only.",
      customerDefinition: "Based on first paid sale.",
      barberAttribution: "Attributed to the linked barber.",
      paymentMethodDefinition: "Collected payment amounts.",
      currentVatRate: 12,
    },
  };
}

test("exports every chart series point and every table cell", () => {
  const rows = buildCompleteReportCsvRows(reportFixture(), "August 24, 2026 at 10:00 AM");
  const chartRows = rows.filter((row) => row.Section === "Chart Data");
  const tableRows = rows.filter((row) => row.Section === "Table Data");

  assert.equal(chartRows.length, 4);
  assert.deepEqual(chartRows.map((row) => [row["Date/Period"], row.Series, row.Value]), [
    ["2026-08-01", "Revenue", 1000],
    ["2026-08-01", "Transactions", 4],
    ["2026-08-02", "Revenue", 1500],
    ["2026-08-02", "Transactions", 6],
  ]);
  assert.equal(tableRows.length, 4);
  assert.equal(tableRows.at(-1)?.Value, "Mahabang paliwanag");
});

test("exports a concise, sectioned Summary CSV", () => {
  const csv = exportReportToCsv(reportFixture(), "August 24, 2026 at 10:00 AM");

  assert.ok(csv.startsWith("\uFEFFSUMMARY REPORT\r\nPeriod,\"Aug 1, 2026 - Aug 24, 2026\""));
  assert.ok(csv.includes("METRICS\r\nMetric,Value,Unit\r\nTotal Revenue,25000,PHP"));
  assert.ok(csv.includes("COMPARISONS\r\nMetric,Change\r\nTotal Revenue,+12.5%"));
  assert.ok(csv.includes("CHART DATA\r\nChart,Category,Series,Value,Unit"));
  assert.ok(csv.includes("Revenue and Transaction Trend,2026-08-01,Revenue,1000,PHP"));
  assert.ok(csv.includes("Revenue and Transaction Trend,2026-08-02,Transactions,6,Count"));
  assert.ok(csv.includes("DETAILS\r\nName,Note"));
  assert.ok(csv.includes("CUSTOMER MIX\r\nCustomer Type,Share\r\nNew,0%\r\nReturning,0%"));
  assert.ok(csv.includes("AI ANALYSIS\r\nType,Content"));
  assert.ok(!csv.includes("Report Type,Report Title"));
  assert.ok(!csv.includes("Metric Definitions"));
  assert.ok(!csv.includes("Chart type:"));
  assert.ok(!csv.includes("Paid sales only."));
});

test("preserves Summary chart series, displayed shares, and native table rows", () => {
  const fixture = reportFixture();
  fixture.metrics.push(
    { label: "New Customers", value: 1, numericValue: 1 },
    { label: "Returning Customers", value: 3, numericValue: 3 },
  );
  fixture.charts = [
    ...fixture.charts,
    {
      title: "Service Revenue Distribution",
      type: "pie",
      xKey: "name",
      series: [{ key: "revenue", label: "Revenue", kind: "money" }],
      data: [{ name: "Signature Haircut", count: 2, revenue: 350 }],
    },
    {
      title: "Peak Appointment Hours",
      type: "bar",
      xKey: "timeBucket",
      series: [{ key: "appointments", label: "Appointments", kind: "number" }],
      data: [{ startMinutes: 600, timeBucket: "10 AM–12 PM", appointments: 2, share: 100 }],
    },
  ];
  fixture.tables = [{
    title: "Source Breakdown",
    columns: [
      { key: "source", label: "Source" },
      { key: "revenue", label: "Revenue", kind: "money" },
      { key: "transactions", label: "Transactions", kind: "number" },
      { key: "revenueShare", label: "Revenue Share", kind: "percent" },
    ],
    rows: [{ source: "Booking", revenue: 350, transactions: 1, revenueShare: 100 }],
  }];

  const csv = exportReportToCsv(fixture, "August 24, 2026 at 10:00 AM");

  assert.ok(csv.includes("Service Revenue Distribution,Signature Haircut,Revenue,350,PHP"));
  assert.ok(csv.includes("Service Revenue Distribution,Signature Haircut,Count,2,Count"));
  assert.ok(csv.includes("Service Revenue Distribution,Signature Haircut,Share,100,%"));
  assert.ok(csv.includes("Peak Appointment Hours,10 AM–12 PM,Appointments,2,Count"));
  assert.ok(csv.includes("Peak Appointment Hours,10 AM–12 PM,Share,100,%"));
  assert.ok(!csv.includes("Start Minutes"));
  assert.ok(csv.includes("SOURCE BREAKDOWN\r\nSource,Revenue,Transactions,Revenue Share\r\nBooking,350,1,100%"));
  assert.ok(csv.includes("CUSTOMER MIX\r\nCustomer Type,Share\r\nNew,25%\r\nReturning,75%"));
});

test("escapes commas, quotes, multiline text, and Unicode while retaining the Excel BOM", () => {
  const csv = exportReportToCsv(reportFixture(), "August 24, 2026 at 10:00 AM");

  assert.ok(csv.startsWith("\uFEFFSUMMARY REPORT"));
  assert.ok(csv.includes('"José, Jr."'));
  assert.ok(csv.includes('"He said ""great"".\nBumalik siya."'));
  assert.ok(csv.includes('"Revenue rose, despite a slower week.\nReview the daily trend."'));
  assert.ok(csv.includes('"Keep the ""weekend"" offer."'));
});

test("deduplicates repeated AI bodies and represents empty chart and table sections", () => {
  const fixture = reportFixture();
  fixture.charts = [{ title: "Empty Chart", type: "bar", data: [], series: [{ key: "count", label: "Count" }] }];
  fixture.tables = [{ title: "Empty Table", columns: [{ key: "value", label: "Value" }], rows: [] }];
  const rows = buildCompleteReportCsvRows(fixture, "August 24, 2026 at 10:00 AM");

  assert.equal(rows.filter((row) => row.Section === "AI Analysis" && row.Value === fixture.ai.insight).length, 1);
  assert.equal(rows.find((row) => row.Subsection === "Empty Chart")?.Item, "No data available for the selected period.");
  assert.equal(rows.find((row) => row.Subsection === "Empty Table")?.Item, "No data available for the selected period.");
});

test("uses concise section-specific CSVs for all seven remaining report types", () => {
  const reportTitles: Record<string, string> = {
    sales: "Sales Report",
    appointments: "Appointment Performance Report",
    services: "Service Performance Report",
    barbers: "Barber Performance Report",
    customers: "Customer Analytics Report",
    loyalty: "Loyalty Program Report",
    discounts: "Discount Analytics Report",
  };

  for (const [reportType, reportTitle] of Object.entries(reportTitles)) {
    const fixture = reportFixture();
    fixture.reportType = reportType;
    fixture.reportTitle = reportTitle;
    const metric = reportType === "appointments"
      ? { label: "Total Appointments", value: 10, numericValue: 10, changePercent: -4.5, kind: "count" as const }
      : { label: "Total Revenue", value: 25000, numericValue: 25000, changePercent: -4.5, kind: "money" as const };
    fixture.metrics = [metric];
    fixture.charts = [{
      title: `${reportTitle} Trend`,
      type: "line",
      xKey: "period",
      series: [
        { key: "amount", label: "Amount", kind: "money" },
        { key: "count", label: "Count", kind: "number" },
      ],
      data: [
        { period: "Week 1", amount: 1000, count: 4 },
        { period: "Week 2", amount: 1500, count: 6 },
      ],
    }];

    const csv = exportReportToCsv(fixture, "August 24, 2026 at 10:00 AM");

    assert.ok(csv.startsWith(`\uFEFF${reportTitle.toUpperCase()}\r\nPeriod,`), reportType);
    assert.ok(csv.includes(`METRICS\r\nMetric,Value,Unit\r\n${metric.label},${metric.value},${metric.kind === "money" ? "PHP" : "Count"}`), reportType);
    assert.ok(csv.includes(`COMPARISONS\r\nMetric,Change\r\n${metric.label},-4.5%`), reportType);
    assert.ok(csv.includes(`${reportTitle} Trend,Week 1,Amount,1000,PHP`), reportType);
    assert.ok(csv.includes(`${reportTitle} Trend,Week 2,Count,6,Count`), reportType);
    assert.ok(csv.includes("DETAILS\r\nName,Note"), reportType);
    assert.ok(csv.includes("AI ANALYSIS\r\nType,Content"), reportType);
    assert.ok(!csv.includes("Report Type,Report Title"), reportType);
    assert.ok(!csv.includes("Metric Definitions"), reportType);
    assert.ok(!csv.includes("Chart type:"), reportType);
    assert.ok(!csv.includes("Paid sales only."), reportType);
    assert.ok(!csv.includes("Date From"), reportType);
    assert.equal(csv.split(fixture.ai.insight).length - 1, 1, `${reportType} AI insight should be deduplicated`);
  }
});

test("exports the complete Sales breakdown, source summary, payment table, and charts", () => {
  const sales = reportFixture();
  sales.reportType = "sales";
  sales.reportTitle = "Sales Report";
  sales.charts = [
    { title: "Revenue over time", type: "line", xKey: "period", series: [{ key: "revenue", label: "Revenue", kind: "money" }], data: [{ period: "Week 1", revenue: 350 }] },
    { title: "Transactions over time", type: "bar", xKey: "period", series: [{ key: "transactions", label: "Transactions", kind: "number" }], data: [{ period: "Week 1", transactions: 1 }] },
    { title: "Walk-in vs Booking revenue", type: "bar", xKey: "source", series: [{ key: "revenue", label: "Revenue", kind: "money" }], data: [{ source: "Booking", revenue: 350 }, { source: "Walk-in", revenue: 0 }] },
    { title: "Walk-in vs Booking transaction count", type: "bar", xKey: "source", series: [{ key: "transactions", label: "Transactions", kind: "number" }], data: [{ source: "Booking", transactions: 1 }, { source: "Walk-in", transactions: 0 }] },
    { title: "Payments by Method", type: "bar", xKey: "method", series: [{ key: "amount", label: "Amount Collected", kind: "money" }], data: [{ method: "GCash", amount: 350, count: 1, share: 100 }] },
  ];
  sales.tables = [
    { title: "Payment Method Summary", columns: [{ key: "method", label: "Method" }, { key: "amount", label: "Amount Collected", kind: "money" }, { key: "count", label: "Payment Count", kind: "number" }, { key: "share", label: "Share of Collections", kind: "percent" }], rows: [{ method: "GCash", amount: 350, count: 1, share: 100 }] },
    { title: "Sales Breakdown", columns: [{ key: "date", label: "Date", kind: "date" }, { key: "transactionCode", label: "Transaction Code" }, { key: "customer", label: "Customer" }, { key: "source", label: "Source" }, { key: "paymentMethods", label: "Payment Method(s)" }, { key: "total", label: "Total", kind: "money" }, { key: "saleStatus", label: "Sale Status" }], rows: [{ date: "2026-08-24", transactionCode: "TX-1", customer: "José, Jr.", source: "BOOKING", paymentMethods: "GCash", total: 350, saleStatus: "PAID" }] },
  ];

  const csv = exportReportToCsv(sales, "August 24, 2026 at 10:00 AM");

  assert.ok(csv.includes("SALES BY SOURCE\r\nSource,Revenue,Transactions,Revenue Share\r\nBooking,350,1,100%\r\nWalk-in,0,0,0%"));
  assert.ok(csv.includes("Sales by Source,Booking,Revenue,350,PHP"));
  assert.ok(csv.includes("Sales by Source,Booking,Transactions,1,Count"));
  assert.ok(!csv.includes("Walk-in vs Booking revenue,Booking"));
  assert.ok(csv.includes("PAYMENT METHOD SUMMARY\r\nMethod,Amount Collected,Payment Count,Share of Collections\r\nGCash,350,1,100%"));
  assert.ok(csv.includes("SALES BREAKDOWN\r\nDate,Transaction Code,Customer,Source,Payment Method(s),Total,Sale Status"));
  assert.ok(csv.includes('2026-08-24,TX-1,"José, Jr.",BOOKING,GCash,350,PAID'));
  assert.ok(csv.includes("Revenue over time,Week 1,Revenue,350,PHP"));
  assert.ok(csv.includes("Payments by Method,GCash,Amount Collected,350,PHP"));
});

test("exports report-specific displayed shares and calculations", () => {
  const appointments = reportFixture();
  appointments.reportType = "appointments";
  appointments.reportTitle = "Appointment Performance Report";
  appointments.charts = [{ title: "Appointment Status Distribution", type: "pie", xKey: "status", series: [{ key: "count", label: "Appointments", kind: "number" }], data: [{ status: "COMPLETED", count: 3 }, { status: "CANCELLED", count: 1 }] }];
  let csv = exportReportToCsv(appointments, "Generated");
  assert.ok(csv.includes("Appointment Status Distribution,COMPLETED,Share,75,%"));

  const services = reportFixture();
  services.reportType = "services";
  services.reportTitle = "Service Performance Report";
  services.charts = [{ title: "Service Revenue Distribution", type: "pie", xKey: "service", series: [{ key: "revenue", label: "Revenue", kind: "money" }], data: [{ service: "Haircut", revenue: 300 }, { service: "Shave", revenue: 100 }] }];
  csv = exportReportToCsv(services, "Generated");
  assert.ok(csv.includes("Service Revenue Distribution,Haircut,Share,75,%"));

  const customers = reportFixture();
  customers.reportType = "customers";
  customers.reportTitle = "Customer Analytics Report";
  customers.metrics = [{ label: "Total Unique Customers", value: 10, numericValue: 10 }, { label: "Customers with Multiple Visits", value: 4, numericValue: 4 }];
  csv = exportReportToCsv(customers, "Generated");
  assert.ok(csv.includes("CUSTOMER RETENTION\r\nVisit Frequency,Customers,Share\r\nMultiple Visits,4,40%\r\nSingle Visit,6,60%"));

  const loyalty = reportFixture();
  loyalty.reportType = "loyalty";
  loyalty.reportTitle = "Loyalty Program Report";
  loyalty.metrics = [{ label: "50% Rewards Earned/Redeemed", value: "7/3" }, { label: "Free Rewards Earned/Redeemed", value: "2/1" }];
  csv = exportReportToCsv(loyalty, "Generated");
  assert.ok(csv.includes("Rewards by Type,50% Reward,Earned,7,Count"));
  assert.ok(csv.includes("REWARDS BY TYPE\r\nReward,Earned,Redeemed\r\n50% Reward,7,3\r\nFree Reward,2,1"));

  const discounts = reportFixture();
  discounts.reportType = "discounts";
  discounts.reportTitle = "Discount Analytics Report";
  discounts.metrics = [{ label: "Revenue Before Discounts", value: 500, numericValue: 500 }, { label: "Revenue After Discounts", value: 450, numericValue: 450 }];
  discounts.charts = [{ title: "Discount distribution", type: "bar", xKey: "discountType", series: [{ key: "totalDiscountAmount", label: "Discount Amount", kind: "money" }], data: [{ discountType: "PWD", usageCount: 3, totalDiscountAmount: 30 }, { discountType: "Senior", usageCount: 1, totalDiscountAmount: 20 }] }];
  discounts.tables = [{ title: "Discount Type Summary", columns: [{ key: "discountType", label: "Discount Type" }, { key: "usageCount", label: "Usage Count", kind: "number" }, { key: "totalDiscountAmount", label: "Total Discount Amount", kind: "money" }], rows: discounts.charts[0].data }];
  csv = exportReportToCsv(discounts, "Generated");
  assert.ok(csv.includes("Discount distribution,PWD,Usage Share,75,%"));
  assert.ok(csv.includes("Revenue Impact of Discounts,Before Discounts,Revenue,500,PHP"));
  assert.ok(csv.includes("DISCOUNT TYPE SUMMARY\r\nDiscount Type,Usage Count,Total Discount Amount,Usage Share\r\nPWD,3,30,75%"));
});

test("does not truncate large non-Summary tables and preserves CSV escaping", () => {
  const sales = reportFixture();
  sales.reportType = "sales";
  sales.reportTitle = "Sales Report";
  sales.tables[0].rows = Array.from({ length: 250 }, (_, index) => ({
    name: `Customer ${index + 1}`,
    note: index === 249 ? "He said \"great\".\nBumalik siya." : `Row ${index + 1}`,
  }));

  const csv = exportReportToCsv(sales, "August 24, 2026 at 10:00 AM");

  assert.ok(csv.includes('Customer 250,"He said ""great"".\nBumalik siya."'));
  assert.equal(csv.split("Customer ").length - 1, 250);
});
