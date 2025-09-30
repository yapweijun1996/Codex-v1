(function () {
  const CONFIG = {
    ROOT_SELECTOR: '.exp_to_excel_button_content',
    BUTTON_SELECTOR: '.html_to_excel_btn',
    SHEET_NAME: 'PrintForm',
    MIN_COL_WIDTH_PX: 1,
    MIN_ROW_HEIGHT_PX: 1,
    EDGE_TOLERANCE_PX: 1,
    IMAGE_FORMAT: 'image/png',
    DEBUG: true,
    LOG_PREFIX: '[export]'
  };

  const debugLog = (...args) => {
    if (!CONFIG.DEBUG) return;
    console.log(CONFIG.LOG_PREFIX, ...args);
  };

  const warnLog = (...args) => {
    if (!CONFIG.DEBUG) {
      console.warn(...args);
      return;
    }
    console.warn(CONFIG.LOG_PREFIX, ...args);
  };

  const errorLog = (...args) => {
    if (!CONFIG.DEBUG) {
      console.error(...args);
      return;
    }
    console.error(CONFIG.LOG_PREFIX, ...args);
  };

  const pxToPoint = (px) => Math.max(0, Math.round(px * 0.75 * 100) / 100);
  const pxToColumnWidth = (px) => {
    const normalized = Math.max(CONFIG.MIN_COL_WIDTH_PX, px);
    if (normalized <= 12) {
      return Math.round((normalized / 12) * 100) / 100;
    }
    return Math.round(((normalized - 5) / 7) * 100) / 100;
  };

  const sanitizeSheetName = (name) => (name || 'Sheet1').replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'Sheet1';

  const getFilenameBase = () => {
    const title = document.title || 'page';
    return title.replace(/[\\\/?%*:|"<>]/g, '-').trim() || 'page';
  };

  const parseRgb = (value) => {
    if (!value) return null;
    if (value.startsWith('#')) {
      const hex = value.slice(1);
      if (hex.length === 3) {
        const r = hex[0];
        const g = hex[1];
        const b = hex[2];
        return {
          r: parseInt(r + r, 16),
          g: parseInt(g + g, 16),
          b: parseInt(b + b, 16),
          a: 1
        };
      }
      if (hex.length === 6) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          a: 1
        };
      }
      return null;
    }
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;
    const parts = match[1].split(',').map((v) => v.trim());
    if (parts.length < 3) return null;
    const [r, g, b] = parts;
    const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    return {
      r: Math.max(0, Math.min(255, parseInt(r, 10))),
      g: Math.max(0, Math.min(255, parseInt(g, 10))),
      b: Math.max(0, Math.min(255, parseInt(b, 10))),
      a: isNaN(a) ? 1 : Math.max(0, Math.min(1, a))
    };
  };

  const colorToARGB = (value) => {
    const rgb = parseRgb(value);
    if (!rgb || rgb.a === 0) return null;
    const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
    const alphaValue = Math.max(0, Math.min(255, Math.round(rgb.a * 255)));
    const alphaHex = toHex(alphaValue);
    return `${alphaHex}${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  };

  const widthToBorderStyle = (widthPx, cssStyle) => {
    if (!widthPx || widthPx <= 0.5) return null;
    const normalizedStyle = (cssStyle || '').toLowerCase();
    if (!normalizedStyle || normalizedStyle === 'none' || normalizedStyle === 'hidden') return null;

    const styleByWidth = () => {
      if (widthPx < 1.5) return 'thin';
      if (widthPx < 2.5) return 'medium';
      return 'thick';
    };

    switch (normalizedStyle) {
      case 'solid':
        return styleByWidth();
      case 'dashed':
        return widthPx < 2 ? 'dashed' : 'mediumDashed';
      case 'dotted':
        return widthPx < 2 ? 'dotted' : 'mediumDashDotDot';
      case 'double':
        return 'double';
      case 'dash-dot':
      case 'dashdot':
      case 'dot-dash':
        return widthPx < 2 ? 'dashDot' : 'mediumDashDot';
      case 'dash-dot-dot':
      case 'dashdotdot':
      case 'dot-dot-dash':
        return widthPx < 2 ? 'dashDotDot' : 'mediumDashDotDot';
      default:
        return styleByWidth();
    }
  };

  const normalizeEdges = (edges) => {
    const sorted = Array.from(edges).sort((a, b) => a - b);
    const result = [];
    for (const value of sorted) {
      const v = Math.max(0, Math.round(value));
      if (!result.length) {
        result.push(v);
        continue;
      }
      const diff = v - result[result.length - 1];
      if (diff >= CONFIG.EDGE_TOLERANCE_PX) {
        result.push(v);
      } else if (diff < 0) {
        result.push(result[result.length - 1]);
      }
    }
    return result;
  };

  const getCellText = (cell) => {
    const text = cell.innerText || '';
    const normalized = text
      .replace(/\u00A0/g, ' ')
      .replace(/[\r\t]+/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n');

    const hasInlineFloat = Array.from(cell.querySelectorAll('*')).some((child) => {
      if (!child || !child.style) return false;
      const floatValue = (child.style.cssFloat || child.style.float || '').toLowerCase();
      return floatValue && floatValue !== 'none';
    });

    if (hasInlineFloat) {
      return normalized.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    return normalized;
  };

  const extractBorders = (cs) => {
    const sides = ['top', 'right', 'bottom', 'left'];
    const border = {};
    for (const side of sides) {
      const width = parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0;
      const type = cs.getPropertyValue(`border-${side}-style`) || '';
      const excelStyle = widthToBorderStyle(width, type);
      if (!excelStyle) continue;
      const color = colorToARGB(cs.getPropertyValue(`border-${side}-color`));
      border[side] = {
        style: excelStyle,
        color: color ? { argb: color } : undefined
      };
    }
    return Object.keys(border).length ? border : null;
  };

  const extractFont = (cs) => {
    const families = (cs.fontFamily || '').split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const name = families[0] || undefined;
    const sizePx = parseFloat(cs.fontSize) || 0;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const font = {
      name,
      size: sizePx ? Math.round(pxToPoint(sizePx) * 100) / 100 : undefined,
      bold: weight >= 600,
      italic: cs.fontStyle === 'italic'
    };
    const color = colorToARGB(cs.color);
    if (color) font.color = { argb: color };
    return font;
  };

  const extractAlignment = (cell, cs, textValue) => {
    const normalize = (value) => {
      if (!value) return undefined;
      const normalized = String(value).trim().toLowerCase();
      return normalized || undefined;
    };

    const horizontalMap = {
      start: 'left',
      left: 'left',
      end: 'right',
      right: 'right',
      center: 'center',
      justify: 'justify'
    };
    const verticalMap = {
      top: 'top',
      middle: 'middle',
      center: 'middle',
      bottom: 'bottom',
      baseline: 'bottom'
    };

    const cssHorizontal = normalize(cs.textAlign);
    const cssVertical = normalize(cs.verticalAlign);
    const attrHorizontal = normalize(cell.getAttribute('align') || cell.align);
    const attrVertical = normalize(cell.getAttribute('valign') || cell.vAlign);

    const horizontal = horizontalMap[cssHorizontal] || horizontalMap[attrHorizontal] || undefined;
    const vertical = verticalMap[cssVertical] || verticalMap[attrVertical] || undefined;
    const wrapText = cs.whiteSpace !== 'nowrap' || (textValue && textValue.includes('\n'));
    return {
      horizontal,
      vertical,
      wrapText
    };
  };

  const buildLayoutModel = (root) => {
    const rootRect = root.getBoundingClientRect();
    const allCells = Array.from(root.querySelectorAll('td, th'));
    const colEdgeSet = new Set([0, Math.round(rootRect.width)]);
    const rowEdgeSet = new Set([0, Math.round(rootRect.height)]);

    for (const cell of allCells) {
      const rect = cell.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) continue;
      const left = Math.round(rect.left - rootRect.left);
      const right = Math.round(rect.right - rootRect.left);
      const top = Math.round(rect.top - rootRect.top);
      const bottom = Math.round(rect.bottom - rootRect.top);
      colEdgeSet.add(left);
      colEdgeSet.add(right);
      rowEdgeSet.add(top);
      rowEdgeSet.add(bottom);
    }

    const columnEdges = normalizeEdges(colEdgeSet);
    const rowEdges = normalizeEdges(rowEdgeSet);

    const leafCells = allCells.filter((cell) => !cell.querySelector('table'));
    const cells = [];
    const images = [];

    for (const cell of leafCells) {
      const rect = cell.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!width || !height) continue;
      const left = Math.round(rect.left - rootRect.left);
      const right = Math.round(rect.right - rootRect.left);
      const top = Math.round(rect.top - rootRect.top);
      const bottom = Math.round(rect.bottom - rootRect.top);

      const colStartIndex = columnEdges.findIndex((edge) => Math.abs(edge - left) <= CONFIG.EDGE_TOLERANCE_PX);
      const colEndIndex = columnEdges.findIndex((edge) => Math.abs(edge - right) <= CONFIG.EDGE_TOLERANCE_PX);
      const rowStartIndex = rowEdges.findIndex((edge) => Math.abs(edge - top) <= CONFIG.EDGE_TOLERANCE_PX);
      const rowEndIndex = rowEdges.findIndex((edge) => Math.abs(edge - bottom) <= CONFIG.EDGE_TOLERANCE_PX);

      if (colStartIndex === -1 || colEndIndex === -1 || rowStartIndex === -1 || rowEndIndex === -1) {
        console.warn('Skipping cell due to unmatched edges', cell);
        continue;
      }

      const textValue = getCellText(cell);
      const cs = window.getComputedStyle(cell);
      const font = extractFont(cs);
      const alignment = extractAlignment(cell, cs, textValue);
      const borders = extractBorders(cs);
      const fillColor = colorToARGB(cs.backgroundColor);

      const cellModel = {
        element: cell,
        value: textValue || '',
        colStart: colStartIndex,
        colEnd: Math.max(colStartIndex + 1, colEndIndex),
        rowStart: rowStartIndex,
        rowEnd: Math.max(rowStartIndex + 1, rowEndIndex),
        bounds: {
          left,
          top,
          width,
          height
        },
        styles: {
          font,
          alignment,
          border: borders,
          fill: fillColor ? { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } } : null
        },
        images: [],
        sheetPosition: null
      };

      const imgList = Array.from(cell.querySelectorAll('img'));
      for (const img of imgList) {
        const imgRect = img.getBoundingClientRect();
        const imgWidth = Math.round(imgRect.width) || Math.round(img.width) || Math.round(img.naturalWidth) || 0;
        const imgHeight = Math.round(imgRect.height) || Math.round(img.height) || Math.round(img.naturalHeight) || 0;
        if (!imgWidth || !imgHeight) continue;
        const job = {
          element: img,
          width: imgWidth,
          height: imgHeight,
          parentCell: cellModel,
          left: Math.round(imgRect.left - rootRect.left),
          top: Math.round(imgRect.top - rootRect.top),
          offsetWithinCell: {
            left: Math.round(imgRect.left - rect.left),
            top: Math.round(imgRect.top - rect.top)
          }
        };
        cellModel.images.push(job);
        images.push(job);
      }

      cells.push(cellModel);
    }

    const columnWidthsPx = [];
    for (let i = 0; i < columnEdges.length - 1; i++) {
      const w = columnEdges[i + 1] - columnEdges[i];
      columnWidthsPx.push(w > 0 ? w : CONFIG.MIN_COL_WIDTH_PX);
    }

    const rowHeightsPx = [];
    for (let i = 0; i < rowEdges.length - 1; i++) {
      const h = rowEdges[i + 1] - rowEdges[i];
      rowHeightsPx.push(h > 0 ? h : CONFIG.MIN_ROW_HEIGHT_PX);
    }

    return {
      columnEdges,
      rowEdges,
      columnWidthsPx,
      rowHeightsPx,
      cells,
      images
    };
  };

  const ensureImageLoaded = (img) => {
    if (img.complete) {
      if (img.naturalWidth && img.naturalHeight) return Promise.resolve();
      return Promise.reject(new Error('Image failed to load (already complete with zero size)'));
    }
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
      };
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', onError, { once: true });
    });
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read blob as base64'));
    reader.onload = () => {
      const result = reader.result || '';
      const [, base64] = String(result).split(',');
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Empty base64 result'));
      }
    };
    reader.readAsDataURL(blob);
  });

  const fetchImageAsBase64 = async (src) => {
    if (!src) return null;
    let url;
    try {
      url = new URL(src, window.location.href);
    } catch (err) {
      warnLog('Invalid image URL, skip fetch fallback', src, err);
      return null;
    }

    if (url.protocol === 'file:') {
      warnLog('Skipping fetch fallback for file:// URL (browser security restriction):', url.href);
      return null;
    }

    try {
      const response = await fetch(url.href, { mode: 'cors' });
      if (!response.ok) return null;
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      const extension = (blob.type && blob.type.split('/')[1]) || 'png';
      debugLog('Fetched image via fallback', url.href, `(${extension})`);
      return { base64, extension };
    } catch (err) {
      warnLog('Fallback fetch-to-base64 failed', src, err);
      return null;
    }
  };

  const convertImageJob = async (job) => {
    const { element, width, height } = job;
    try {
      await ensureImageLoaded(element);
    } catch (err) {
      warnLog('Image failed to load', element.src, err);
      return { ...job, error: err };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const err = new Error('Canvas 2D context unavailable');
      errorLog(err.message, element.src);
      return { ...job, error: err };
    }

    try {
      ctx.drawImage(element, 0, 0, width, height);
      const dataUrl = canvas.toDataURL(CONFIG.IMAGE_FORMAT);
      const base64 = dataUrl.split(',')[1];
      if (!base64) throw new Error('Empty base64 from canvas');
      debugLog('Canvas conversion success', element.src, `${width}x${height}`);
      return {
        ...job,
        base64,
        extension: CONFIG.IMAGE_FORMAT === 'image/png' ? 'png' : 'jpeg'
      };
    } catch (err) {
      warnLog('Canvas toDataURL failed, trying fetch fallback', element.src, err);
      const fallback = await fetchImageAsBase64(element.src);
      if (fallback) {
        debugLog('Fallback fetch succeeded for image', element.src);
        return { ...job, base64: fallback.base64, extension: fallback.extension };
      }
      errorLog('Image conversion failed after fallback', element.src, err);
      return { ...job, error: err };
    }
  };

  const applyColumnWidths = (worksheet, columnWidthsPx) => {
    worksheet.columns = columnWidthsPx.map((px) => ({ width: pxToColumnWidth(px) }));
  };

  const applyRowHeights = (worksheet, rowHeightsPx) => {
    rowHeightsPx.forEach((px, idx) => {
      const row = worksheet.getRow(idx + 1);
      row.height = pxToPoint(px);
      row.alignment = row.alignment || { vertical: 'top' };
    });
  };

  const writeCellsToSheet = (worksheet, model) => {
    const occupancy = new Set();
    const sortedCells = model.cells.slice().sort((a, b) => {
      if (a.rowStart !== b.rowStart) return a.rowStart - b.rowStart;
      return a.colStart - b.colStart;
    });

    for (const cell of sortedCells) {
      const rowStart = cell.rowStart + 1;
      const rowEnd = cell.rowEnd;
      const colStart = cell.colStart + 1;
      const colEnd = cell.colEnd;

      const key = `${rowStart},${colStart}`;
      if (occupancy.has(key)) continue;

      const targetCell = worksheet.getCell(rowStart, colStart);
      targetCell.value = cell.value;
      if (cell.styles.font) targetCell.font = cell.styles.font;
      if (cell.styles.alignment) targetCell.alignment = cell.styles.alignment;
      if (cell.styles.border) targetCell.border = cell.styles.border;
      if (cell.styles.fill) targetCell.fill = cell.styles.fill;

      const mergeRowEnd = Math.max(rowStart, rowEnd);
      const mergeColEnd = Math.max(colStart, colEnd);
      if (mergeRowEnd > rowStart || mergeColEnd > colStart) {
        worksheet.mergeCells(rowStart, colStart, mergeRowEnd, mergeColEnd);
      }

      for (let r = rowStart; r <= mergeRowEnd; r++) {
        for (let c = colStart; c <= mergeColEnd; c++) {
          occupancy.add(`${r},${c}`);
        }
      }

      cell.sheetPosition = {
        rowStart,
        rowEnd: mergeRowEnd,
        colStart,
        colEnd: mergeColEnd
      };
    }
  };

  const PIXEL_TO_EMU = 9525;

  const locateIndexAndOffset = (edges, px, preferNextEdge = false) => {
    const value = Math.max(0, px);
    const tolerance = CONFIG.EDGE_TOLERANCE_PX;
    for (let i = 0; i < edges.length - 1; i++) {
      const start = edges[i];
      const end = edges[i + 1];
      if (value >= start && value < end - tolerance) {
        return { index: i, offset: value - start };
      }
      const closeToEnd = Math.abs(value - end) <= tolerance;
      if (closeToEnd) {
        if (preferNextEdge && i + 1 < edges.length - 1) {
          return { index: i + 1, offset: 0 };
        }
        return { index: i, offset: end - start };
      }
    }
    const lastIndex = Math.max(0, edges.length - 2);
    return {
      index: lastIndex,
      offset: value - edges[lastIndex]
    };
  };

  const clampOffset = (offsetPx, maxPx) => {
    if (!isFinite(offsetPx) || offsetPx < 0) return 0;
    if (isFinite(maxPx) && maxPx > 0) {
      return Math.round(Math.max(0, Math.min(offsetPx, maxPx)));
    }
    return Math.round(offsetPx);
  };

  const placeImages = (worksheet, workbook, resolvedJobs, layoutModel) => {
    if (!resolvedJobs.length) return;

    for (const job of resolvedJobs) {
      if (!job.base64) continue;
      const imgId = workbook.addImage({
        base64: job.base64,
        extension: job.extension
      });
      const { index: colIndex, offset: colOffsetPxRaw } = locateIndexAndOffset(layoutModel.columnEdges, job.left);
      const { index: rowIndex, offset: rowOffsetPxRaw } = locateIndexAndOffset(layoutModel.rowEdges, job.top);
      const { index: brColIndex, offset: brColOffsetPxRaw } = locateIndexAndOffset(layoutModel.columnEdges, job.left + job.width, true);
      const { index: brRowIndex, offset: brRowOffsetPxRaw } = locateIndexAndOffset(layoutModel.rowEdges, job.top + job.height, true);

      const startColWidthPx = layoutModel.columnWidthsPx[colIndex] || 0;
      const startRowHeightPx = layoutModel.rowHeightsPx[rowIndex] || 0;
      const endColWidthPx = layoutModel.columnWidthsPx[brColIndex] || 0;
      const endRowHeightPx = layoutModel.rowHeightsPx[brRowIndex] || 0;

      const colOffsetPx = clampOffset(colOffsetPxRaw, startColWidthPx);
      const rowOffsetPx = clampOffset(rowOffsetPxRaw, startRowHeightPx);
      const brColOffsetPx = clampOffset(brColOffsetPxRaw, endColWidthPx);
      const brRowOffsetPx = clampOffset(brRowOffsetPxRaw, endRowHeightPx);

      const tl = {
        col: colIndex,
        row: rowIndex,
        colOff: Math.round(colOffsetPx * PIXEL_TO_EMU),
        rowOff: Math.round(rowOffsetPx * PIXEL_TO_EMU)
      };
      worksheet.addImage(imgId, {
        tl,
        ext: {
          width: job.width,
          height: job.height
        },
        editAs: 'oneCell'
      });
      debugLog('Placed image anchor', job.element?.src || '(unknown src)', tl, {
        width: job.width,
        height: job.height
      });
    }
  };

  const triggerDownload = (buffer, filename) => {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPrintFormToXlsx = async () => {
    if (typeof ExcelJS === 'undefined') {
      alert('ExcelJS is not loaded. Please ensure vendor/exceljs.min.js is included.');
      return;
    }

    const root = document.querySelector(CONFIG.ROOT_SELECTOR);
    if (!root) {
      alert('Export container not found.');
      return;
    }

    debugLog('Building layout model...');
    const layoutModel = buildLayoutModel(root);
    debugLog('Layout ready', `cells=${layoutModel.cells.length}`, `images=${layoutModel.images.length}`);
    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet(sanitizeSheetName(CONFIG.SHEET_NAME), {
      properties: { defaultRowHeight: pxToPoint(CONFIG.MIN_ROW_HEIGHT_PX) }
    });

    debugLog('Applying column widths and row heights');
    applyColumnWidths(worksheet, layoutModel.columnWidthsPx);
    applyRowHeights(worksheet, layoutModel.rowHeightsPx);
    debugLog('Writing cell content');
    writeCellsToSheet(worksheet, layoutModel);

    let imageResults = [];
    if (layoutModel.images.length) {
      debugLog('Converting images...');
      imageResults = await Promise.all(layoutModel.images.map(convertImageJob));
    }

    const successfulImages = imageResults.filter((item) => item && item.base64);
    const failedImages = imageResults.filter((item) => item && !item.base64);

    if (successfulImages.length) {
      placeImages(worksheet, workbook, successfulImages, layoutModel);
      debugLog('Embedded images', successfulImages.length);
    }

    if (failedImages.length) {
      warnLog('Images could not be embedded', failedImages.map((f) => f.element?.src || '(unknown src)'));
    }

    let buffer;
    try {
      debugLog('Writing workbook buffer');
      buffer = await workbook.xlsx.writeBuffer();
      debugLog('Workbook buffer size', buffer && (buffer.byteLength || buffer.length || 0));
    } catch (err) {
      errorLog('writeBuffer failed', err);
      throw err;
    }
    const ts = (() => {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
    })();
    const filename = `${getFilenameBase()}_${ts}.xlsx`;
    debugLog('Triggering download', filename);
    triggerDownload(buffer, filename);
  };

  const hookButton = () => {
    const button = document.querySelector(CONFIG.BUTTON_SELECTOR);
    if (!button) return;
    button.addEventListener('click', async (evt) => {
      evt.preventDefault();
      if (button.dataset.busy === '1') return;
      button.dataset.busy = '1';
      button.disabled = true;
      try {
        debugLog('Button clicked, starting export');
        await exportPrintFormToXlsx();
        debugLog('Export completed');
      } catch (err) {
        errorLog('Export failed', err);
        alert('Export failed. See console for details.');
      } finally {
        button.disabled = false;
        delete button.dataset.busy;
      }
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    hookButton();
  });

  window.exportPrintFormToXlsx = exportPrintFormToXlsx;
})();
