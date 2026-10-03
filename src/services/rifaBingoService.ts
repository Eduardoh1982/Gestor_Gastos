import QRCode from 'qrcode';
import { RifaBingoItem, Student, CourseConfig } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getEffectiveLogo } from '../assets/logo';

function tryAddLogo(
  doc: jsPDF,
  logoData: string | undefined | null,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  if (!logoData || typeof logoData !== 'string' || !logoData.trim()) return false;
  try {
    doc.addImage(logoData, 'JPEG', x, y, w, h);
    return true;
  } catch {
    try {
      doc.addImage(logoData, 'PNG', x, y, w, h);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Genera un código hash corto único para autenticidad (evita duplicaciones y fraudes)
 */
export function generateAuthenticityCode(
  item: RifaBingoItem,
  studentId: string,
  folio: string
): string {
  const str = `${item.id}-${studentId}-${folio}-${item.codigoRegistroBase}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(4, '0').slice(-4);
  const prefix = item.codigoRegistroBase ? item.codigoRegistroBase.replace(/\s+/g, '').toUpperCase() : 'AUTH';
  return `REG-${prefix}-${folio}-${hex}`;
}

/**
 * Genera el texto oficial codificado en el código QR de autenticidad.
 * ¡IMPORTANTE!: No incluye el RUT del alumno para proteger su privacidad, solo nombre y apellido.
 */
export function buildQrVerificationText(params: {
  item: RifaBingoItem;
  student: Student;
  folio: string;
  config: CourseConfig;
  authCode: string;
}): string {
  const { item, student, folio, config, authCode } = params;
  const banco = config.datosBancarios;

  return [
    `COMPROBANTE OFICIAL DE AUTENTICIDAD`,
    `----------------------------------`,
    `Evento: ${item.titulo}`,
    `Tipo: ${item.tipo === 'rifa' ? 'Rifa Oficial' : 'Bingo Oficial'}`,
    `Institución: ${config.institucion} - ${config.nombreCurso}`,
    `Folio N°: ${folio}`,
    `Alumno(a) Responsable: ${student.nombres} ${student.apellidos}`,
    `N° de Registro Único: ${authCode}`,
    `Fecha del Sorteo: ${item.fechaSorteo}${item.horaSorteo ? ` a las ${item.horaSorteo}` : ''}`,
    `Lugar: ${item.lugarSorteo}`,
    `Valor por Número: $${item.valorNumero.toLocaleString('es-CL')} CLP`,
    `----------------------------------`,
    `DATOS DE TRANSFERENCIA OFICIAL:`,
    `Banco: ${banco.banco}`,
    `Tipo: ${banco.tipoCuenta}`,
    `N° Cuenta: ${banco.numeroCuenta}`,
    `Titular: ${banco.titularNombre}`,
    `RUT Cuenta: ${banco.titularRut}`,
    `Email: ${banco.emailConfirmacion || 'tesoreria.curso@gmail.com'}`,
  ].join('\n');
}

/**
 * Genera el QR como Data URL base64
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 180,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generando QR code:', err);
    return '';
  }
}

/**
 * Genera una matriz válida de Bingo 5x5 con el formato tradicional B-I-N-G-O
 * B: 1-15, I: 16-30, N: 31-45 (centro LIBRE), G: 46-60, O: 61-75
 */
export function generateBingoCardMatrix(seedStr: string): (number | 'LIBRE')[][] {
  // Generador pseudo-aleatorio basado en seed para que el mismo cartón conserve siempre sus números
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed << 5) - seed + seedStr.charCodeAt(i);
    seed |= 0;
  }
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const getColNumbers = (min: number, max: number, count: number): number[] => {
    const pool: number[] = [];
    for (let n = min; n <= max; n++) pool.push(n);
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen = pool.slice(0, count);
    return chosen.sort((a, b) => a - b);
  };

  const colB = getColNumbers(1, 15, 5);
  const colI = getColNumbers(16, 30, 5);
  const colN = getColNumbers(31, 45, 4); // 4 números + centro LIBRE
  const colG = getColNumbers(46, 60, 5);
  const colO = getColNumbers(61, 75, 5);

  const matrix: (number | 'LIBRE')[][] = [];
  for (let row = 0; row < 5; row++) {
    const rowValues: (number | 'LIBRE')[] = [
      colB[row],
      colI[row],
      row === 2 ? 'LIBRE' : row < 2 ? colN[row] : colN[row - 1],
      colG[row],
      colO[row],
    ];
    matrix.push(rowValues);
  }

  return matrix;
}

/**
 * Genera PDF descargable en tamaño Carta para Rifa o Bingo
 */
export async function downloadRifaBingoPdf(params: {
  item: RifaBingoItem;
  students: Student[];
  config: CourseConfig;
  qrMap: Record<string, string>;
}): Promise<void> {
  const { item, students, config, qrMap } = params;
  const isRifa = item.tipo === 'rifa';
  const logoData = getEffectiveLogo(config.logoUrl);

  // Letter: 215.9 x 279.4 mm (portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = 215.9;
  const pageHeight = 279.4;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;

  for (let idx = 0; idx < students.length; idx++) {
    const student = students[idx];
    const folio =
      item.foliosPorAlumno?.[student.id] ||
      String(idx + 1).padStart(3, '0');
    const authCode = generateAuthenticityCode(item, student.id, folio);
    const qrDataUrl = qrMap[`${student.id}_${folio}`];

    if (idx > 0) {
      doc.addPage('letter', 'portrait');
    }

    if (isRifa) {
      // ===== HOJA DE RIFA TAMAÑO CARTA COMPLETA (1 ALUMNO POR HOJA) =====
      // Marco perimetral elegante
      doc.setDrawColor(220, 38, 38); // Rojo festivo
      doc.setLineWidth(0.8);
      doc.roundedRect(margin, margin, contentWidth, pageHeight - margin * 2, 3, 3);

      // Encabezado superior
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin + 1, margin + 1, contentWidth - 2, 26, 2, 2, 'F');

      // Logo de la institución si está disponible
      const hasLogo = tryAddLogo(doc, logoData, margin + 4, margin + 3.5, 20, 20);
      const textX = hasLogo ? margin + 27 : margin + 5;
      const maxTitleW = pageWidth - margin - 48 - textX;

      // Título e Institución
      doc.setTextColor(153, 27, 27);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      const titleLines = doc.splitTextToSize(item.titulo.toUpperCase(), maxTitleW);
      doc.text(titleLines[0], textX, margin + 8);
      if (titleLines.length > 1) {
        doc.setFontSize(10);
        doc.text(titleLines[1], textX, margin + 12.5);
      }

      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(`${config.institucion} — ${config.nombreCurso} · Período ${item.year}`, textX, margin + 17);
      doc.text(`Sorteo: ${item.fechaSorteo}${item.horaSorteo ? ` a las ${item.horaSorteo}` : ''} | Lugar: ${item.lugarSorteo}`, textX, margin + 22);

      // Folio en esquina superior derecha
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(pageWidth - margin - 45, margin + 4, 40, 18, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('FOLIO N°', pageWidth - margin - 25, margin + 9, { align: 'center' });
      doc.setFontSize(13);
      doc.text(`#${folio}`, pageWidth - margin - 25, margin + 17, { align: 'center' });

      // Barra de identificación del alumno (SOLO NOMBRE Y APELLIDO, SIN RUT)
      doc.setFillColor(241, 245, 249);
      doc.rect(margin + 1, margin + 28, contentWidth - 2, 10, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Alumno(a) Responsable: ${student.nombres} ${student.apellidos}`, margin + 5, margin + 34);

      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Valor por número: $${item.valorNumero.toLocaleString('es-CL')} CLP | N° Registro: ${authCode}`, pageWidth - margin - 5, margin + 34, { align: 'right' });

      // COLUMNA IZQUIERDA: Premios y Datos Bancarios (ancho 85mm)
      const leftColWidth = 82;
      const rightColX = margin + leftColWidth + 4;
      const rightColWidth = contentWidth - leftColWidth - 4;

      // Caja de Premios
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin + 2, margin + 40, leftColWidth, 70, 2, 2, 'FD');

      doc.setFillColor(220, 38, 38);
      doc.rect(margin + 2, margin + 40, leftColWidth, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('🏆 LISTA DE PREMIOS OFICIALES', margin + 5, margin + 45);

      doc.setTextColor(30, 41, 59);
      let premioY = margin + 52;
      item.premios.forEach((premio, pIdx) => {
        if (premioY < margin + 105) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(`${premio.nombre}`, margin + 4, premioY);
          if (premio.descripcion) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(`${premio.descripcion}`, margin + 4, premioY + 3.5);
            premioY += 8.5;
          } else {
            premioY += 6.5;
          }
          doc.setTextColor(30, 41, 59);
        }
      });

      // Caja de Datos Bancarios para Transferencia
      const bancoY = margin + 113;
      doc.setDrawColor(186, 230, 253);
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(margin + 2, bancoY, leftColWidth, 54, 2, 2, 'FD');

      doc.setFillColor(2, 132, 199);
      doc.rect(margin + 2, bancoY, leftColWidth, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('🏦 DATOS PARA TRANSFERENCIA BANCARIA', margin + 5, bancoY + 4.5);

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const b = config.datosBancarios;
      doc.text(`Banco: ${b.banco}`, margin + 4, bancoY + 11);
      doc.text(`Tipo de Cuenta: ${b.tipoCuenta}`, margin + 4, bancoY + 16);
      doc.text(`N° de Cuenta: ${b.numeroCuenta}`, margin + 4, bancoY + 21);
      doc.text(`Titular: ${b.titularNombre}`, margin + 4, bancoY + 26);
      doc.text(`RUT Titular Cuenta: ${b.titularRut}`, margin + 4, bancoY + 31);
      doc.text(`Email Comprobante:`, margin + 4, bancoY + 36);
      doc.setFont('helvetica', 'bold');
      doc.text(`${b.emailConfirmacion || 'tesoreria.curso@gmail.com'}`, margin + 4, bancoY + 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`* Indicar en el mensaje: Folio #${folio} y Nombre Comprador.`, margin + 4, bancoY + 46);

      // Sello de Autenticidad y Código QR
      const qrY = margin + 170;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin + 2, qrY, leftColWidth, 42, 2, 2, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('VERIFICACIÓN Y AUTENTICIDAD', margin + 4, qrY + 6);

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', margin + 4, qrY + 8, 30, 30);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Escanea el QR para verificar`, margin + 36, qrY + 13);
      doc.text(`la autenticidad de esta rifa.`, margin + 36, qrY + 17);
      doc.text(`N° Registro Único:`, margin + 36, qrY + 23);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(`${authCode}`, margin + 36, qrY + 28);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`Sin datos privados de RUT alumno`, margin + 36, qrY + 34);

      // COLUMNA DERECHA: Talonario con Grilla de Números para vender
      const tableRows: any[] = [];
      const numCount = item.cantidadNumerosPorAlumno || 10;
      for (let n = 1; n <= numCount; n++) {
        tableRows.push([
          `N° ${String(n).padStart(2, '0')}`,
          '',
          '',
          '',
          `$${item.valorNumero.toLocaleString('es-CL')}`,
        ]);
      }

      autoTable(doc, {
        startY: margin + 40,
        margin: { left: rightColX, right: margin + 2 },
        head: [['N°', 'Nombre del Comprador', 'Teléfono Contacto', 'Pagado / Firma', 'Valor']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: [220, 38, 38],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 42 },
          2: { cellWidth: 26 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
        },
        styles: {
          fontSize: 7,
          cellPadding: 3.2,
          minCellHeight: 8.5,
          textColor: [30, 41, 59],
          lineColor: [203, 213, 225],
          lineWidth: 0.2,
        },
      });

      // Pie inferior de la hoja (Talón Desprendible de Control para el apoderado)
      const talonY = pageHeight - margin - 38;
      doc.setLineDashPattern([2, 2], 0);
      doc.setDrawColor(148, 163, 184);
      doc.line(margin + 2, talonY, pageWidth - margin - 2, talonY);
      doc.setLineDashPattern([], 0); // Reset

      doc.setFillColor(254, 252, 232);
      doc.setDrawColor(254, 240, 138);
      doc.roundedRect(margin + 2, talonY + 2, contentWidth - 4, 32, 2, 2, 'FD');

      doc.setTextColor(133, 77, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`TALÓN DE CONTROL Y RENDICIÓN — FOLIO #${folio}`, margin + 5, talonY + 7);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Alumno: ${student.nombres} ${student.apellidos}`, margin + 5, talonY + 13);
      doc.text(`Total a recaudar: ${numCount} números × $${item.valorNumero.toLocaleString('es-CL')} = $${(numCount * item.valorNumero).toLocaleString('es-CL')} CLP`, margin + 5, talonY + 18);
      doc.text(`Instrucciones: Entregar este talonario completo junto al dinero o comprobante de transferencia a la Tesorería.`, margin + 5, talonY + 23);

      doc.text(`Firma Entrega Apoderado: ___________________`, pageWidth - margin - 75, talonY + 18);
      doc.text(`Firma Recibido Tesorería: ___________________`, pageWidth - margin - 75, talonY + 26);
    } else {
      // ===== FORMATO DE BINGO EN 1/4 DE HOJA CARTA =====
      // 4 cartones por hoja Carta (distribuidos en grilla 2x2)
      const halfW = (contentWidth - 4) / 2;
      const halfH = (pageHeight - margin * 2 - 4) / 2;

      for (let cIdx = 0; cIdx < 4; cIdx++) {
        const col = cIdx % 2;
        const row = Math.floor(cIdx / 2);
        const cardX = margin + col * (halfW + 4);
        const cardY = margin + row * (halfH + 4);

        // Borde exterior punteado de recorte
        doc.setLineDashPattern([2, 2], 0);
        doc.setDrawColor(148, 163, 184);
        doc.rect(cardX, cardY, halfW, halfH);
        doc.setLineDashPattern([], 0);

        // Header del cartón de bingo
        doc.setFillColor(79, 70, 229); // Indigo
        doc.roundedRect(cardX + 1, cardY + 1, halfW - 2, 17, 2, 2, 'F');

        // Logo mini en el cartón de bingo si está disponible
        const hasCardLogo = tryAddLogo(doc, logoData, cardX + 3, cardY + 2.5, 12, 12);
        const cardTextX = hasCardLogo ? cardX + 17 : cardX + 3;
        const cardTextW = halfW - (hasCardLogo ? 20 : 6);

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        const cardTitleLines = doc.splitTextToSize(item.titulo.toUpperCase(), cardTextW);
        doc.text(cardTitleLines[0], cardTextX, cardY + 5.5);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`${config.institucion} · ${item.fechaSorteo}`, cardTextX, cardY + 9.5);
        doc.text(`Cartón ${cIdx + 1} de 4 · Folio #${folio}`, cardTextX, cardY + 13.5);

        // Alumno Responsable (SIN RUT)
        doc.setFillColor(238, 242, 255);
        doc.rect(cardX + 1, cardY + 18, halfW - 2, 6, 'F');
        doc.setTextColor(49, 46, 129);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(`Alumno: ${student.nombres} ${student.apellidos}`, cardX + 3, cardY + 22.5);

        // Matriz de Bingo 5x5
        const matrix = generateBingoCardMatrix(`${item.id}-${student.id}-${folio}-${cIdx}`);
        const matrixStartY = cardY + 26;
        const matrixTableRows = matrix.map((r) =>
          r.map((v) => (v === 'LIBRE' ? '★\nLIBRE' : String(v)))
        );

        autoTable(doc, {
          startY: matrixStartY,
          margin: { left: cardX + 5, right: pageWidth - (cardX + halfW - 5) },
          head: [['B', 'I', 'N', 'G', 'O']],
          body: matrixTableRows,
          theme: 'grid',
          headStyles: {
            fillColor: [67, 56, 202],
            textColor: [255, 255, 255],
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 1.5,
          },
          styles: {
            fontSize: 8.5,
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            cellPadding: 2,
            minCellHeight: 8,
            textColor: [15, 23, 42],
            lineColor: [199, 210, 254],
            lineWidth: 0.3,
          },
          columnStyles: {
            0: { cellWidth: (halfW - 10) / 5 },
            1: { cellWidth: (halfW - 10) / 5 },
            2: { cellWidth: (halfW - 10) / 5 },
            3: { cellWidth: (halfW - 10) / 5 },
            4: { cellWidth: (halfW - 10) / 5 },
          },
        });

        // Premios y datos bancarios compactos al pie del cartón
        const footY = cardY + halfH - 24;
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(cardX + 2, footY, halfW - 4, 21, 1.5, 1.5, 'FD');

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(`Premios: ${item.premios.map((p) => p.nombre).join(' | ')}`, cardX + 4, footY + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);
        const b = config.datosBancarios;
        doc.text(`Transf: ${b.banco} | ${b.tipoCuenta} N° ${b.numeroCuenta} | RUT: ${b.titularRut}`, cardX + 4, footY + 9);
        doc.text(`Email: ${b.emailConfirmacion} | Valor: $${item.valorNumero.toLocaleString('es-CL')}`, cardX + 4, footY + 13);
        doc.text(`Reg: ${authCode} (Autenticidad verificada)`, cardX + 4, footY + 17);

        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', cardX + halfW - 19, footY + 2.5, 16, 16);
        }
      }
    }
  }

  // Guardar archivo
  const filename = `${item.tipo === 'rifa' ? 'Rifa' : 'Bingo'}_${item.titulo.replace(/[^a-zA-Z0-9]/g, '_')}_${item.year}.pdf`;
  doc.save(filename);
}
