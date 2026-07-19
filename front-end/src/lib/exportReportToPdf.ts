export type ExportReportToPdfOptions = {
  filename: string;
  marginMm?: number;
};

const PDF_SECTION_SELECTOR = "[data-pdf-section]";

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, 250);
      });
    });
  });
}

async function waitForStableExportLayout(root: HTMLElement): Promise<void> {
  if (document.fonts) {
    await document.fonts.ready;
  }

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );

  await waitForPaint();
}

function copyCanvasPixels(source: HTMLElement, clone: HTMLElement): void {
  const sourceCanvases = source.querySelectorAll("canvas");
  const clonedCanvases = clone.querySelectorAll("canvas");

  sourceCanvases.forEach((sourceCanvas, index) => {
    const clonedCanvas = clonedCanvases[index];
    const context = clonedCanvas?.getContext("2d");

    if (!clonedCanvas || !context) return;

    clonedCanvas.width = sourceCanvas.width;
    clonedCanvas.height = sourceCanvas.height;
    context.drawImage(sourceCanvas, 0, 0);
  });
}

function createExportClone(reportElement: HTMLElement): HTMLDivElement {
  const exportRoot = document.createElement("div");
  exportRoot.className = "pdf-export-root";

  const clonedReport = reportElement.cloneNode(true) as HTMLElement;
  clonedReport.removeAttribute("id");
  copyCanvasPixels(reportElement, clonedReport);
  exportRoot.appendChild(clonedReport);
  document.body.appendChild(exportRoot);

  return exportRoot;
}

function getPdfSections(exportRoot: HTMLElement): HTMLElement[] {
  const sections = Array.from(
    exportRoot.querySelectorAll<HTMLElement>(PDF_SECTION_SELECTOR),
  );

  return sections.length ? sections : [exportRoot];
}

function addCanvasToPdfPages({
  canvas,
  pdf,
  contentWidthMm,
  marginX,
  marginTop,
  marginBottom,
  cursorY,
}: {
  canvas: HTMLCanvasElement;
  pdf: InstanceType<typeof import("jspdf").default>;
  contentWidthMm: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  cursorY: number;
}): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usablePageHeight = pageHeight - marginTop - marginBottom;
  const pxPerMm = canvas.width / contentWidthMm;
  const canvasHeightMm = canvas.height / pxPerMm;
  const sectionGapMm = 4;

  if (canvasHeightMm <= usablePageHeight) {
    const remainingHeight = pageHeight - marginBottom - cursorY;
    const nextCursorY =
      cursorY > marginTop && canvasHeightMm > remainingHeight
        ? marginTop
        : cursorY;

    if (nextCursorY === marginTop && cursorY > marginTop) {
      pdf.addPage();
    }

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      marginX,
      nextCursorY,
      contentWidthMm,
      canvasHeightMm,
      undefined,
      "FAST",
    );

    return nextCursorY + canvasHeightMm + sectionGapMm;
  }

  const pageCanvas = document.createElement("canvas");
  const pageContext = pageCanvas.getContext("2d");

  if (!pageContext) {
    throw new Error("The browser could not prepare the PDF canvas.");
  }

  pageCanvas.width = canvas.width;
  const pageHeightPx = Math.floor(usablePageHeight * pxPerMm);
  let renderedHeightPx = 0;
  let nextCursorY = cursorY;

  while (renderedHeightPx < canvas.height) {
    if (nextCursorY > marginTop) {
      pdf.addPage();
      nextCursorY = marginTop;
    }

    const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
    pageCanvas.height = sliceHeightPx;
    pageContext.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(
      canvas,
      0,
      renderedHeightPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      pageCanvas.width,
      sliceHeightPx,
    );

    const sliceHeightMm = sliceHeightPx / pxPerMm;
    pdf.addImage(
      pageCanvas.toDataURL("image/png"),
      "PNG",
      marginX,
      nextCursorY,
      contentWidthMm,
      sliceHeightMm,
      undefined,
      "FAST",
    );

    renderedHeightPx += sliceHeightPx;
    nextCursorY = marginTop + sliceHeightMm + sectionGapMm;

    if (renderedHeightPx < canvas.height) {
      pdf.addPage();
      nextCursorY = marginTop;
    }
  }

  return nextCursorY;
}

export async function exportReportToPdf(
  reportElement: HTMLElement,
  options: ExportReportToPdfOptions,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("PDF export is only available in the browser.");
  }

  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const pdf = new JsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const marginMm = options.marginMm ?? 12;
  const contentWidthMm = pdf.internal.pageSize.getWidth() - marginMm * 2;
  let exportRoot: HTMLDivElement | null = null;

  document.body.classList.add("exporting-report");

  try {
    exportRoot = createExportClone(reportElement);
    await waitForStableExportLayout(exportRoot);

    const sections = getPdfSections(exportRoot);
    let cursorY = marginMm;

    for (const section of sections) {
      const canvas = await html2canvas(section, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: section.scrollWidth,
        windowHeight: section.scrollHeight,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("A report section could not be rendered for export.");
      }

      cursorY = addCanvasToPdfPages({
        canvas,
        pdf,
        contentWidthMm,
        marginX: marginMm,
        marginTop: marginMm,
        marginBottom: marginMm,
        cursorY,
      });
    }

    pdf.save(options.filename);
  } finally {
    exportRoot?.remove();
    document.body.classList.remove("exporting-report");
  }
}
