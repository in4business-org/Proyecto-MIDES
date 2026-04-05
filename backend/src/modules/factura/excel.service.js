const ExcelJS = require('exceljs');
const { normalizarMonto, normalizarFecha } = require('../../common/utils/normalize');

const HEADERS = [
  'RUT EMPRESA',
  'RUT PROVEEDOR',
  'SERIE',
  'NUMERO',
  'CONVENIO',
  'FECHA PAGO',
  'VTO PIE DE IMPRENTA',
  'RUBRO',
  'NOMBRE RUBRO',
  'DESCRIPCION',
  'CANTIDAD',
  'PRECIO',
];

class ExcelService {
  writeFacturaRow(ws, rowNumber, factura) {
    const values = [
      factura.rut_emisor ?? null,                               // A - RUT EMPRESA
      factura.rut_receptor ?? null,                             // B - RUT PROVEEDOR
      factura.serie_factura ?? null,                            // C - SERIE
      factura.numero_factura ?? null,                           // D - NUMERO
      factura.convenio ?? null,                                 // E - CONVENIO
      normalizarFecha(factura.fecha) ?? null,                   // F - FECHA PAGO
      normalizarFecha(factura.fecha_vto) ?? null,               // G - VTO PIE DE IMPRENTA
      factura.rubro ?? null,                                    // H - RUBRO
      factura.nombre_rubro ?? null,                             // I - NOMBRE RUBRO
      factura.descripcion ?? null,                              // J - DESCRIPCION
      factura.cantidad ?? 1,                                    // K - CANTIDAD
      normalizarMonto(factura.monto ?? factura.total ?? null),  // L - PRECIO
    ];

    values.forEach((val, i) => {
      ws.getCell(rowNumber, i + 1).value = val;
    });
  }

  async generarExcelFacturas(facturas, rutaSalida) {
    if (!Array.isArray(facturas)) {
      throw new Error('facturas debe ser un array');
    }

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('FACTURAS');

    // Header row
    ws.addRow(HEADERS);

    // Data rows
    facturas.forEach((factura, i) => {
      this.writeFacturaRow(ws, i + 2, factura);
    });

    await workbook.xlsx.writeFile(rutaSalida);
    return rutaSalida;
  }
}

module.exports = new ExcelService();
