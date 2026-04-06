const { Router } = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const facturaService = require('./factura.service');
const excelService = require('./excel.service');
const supabaseService = require('../../config/supabase.config');
const prisma = require('../../config/prisma');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = Router({ mergeParams: true });
const TMP_DIR = os.tmpdir();

const SUPPORTED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
function isSupported(filename) {
  return SUPPORTED_EXTENSIONS.includes(path.extname(filename).toLowerCase());
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  };
  return mimeMap[ext] || 'application/pdf';
}


/** Save results to database (upsert by id to preserve updatedAt per-row) */
async function guardarResultadosDB(proyectoId, resultados) {
  const incoming = resultados || [];
  const incomingIds = incoming.map(r => r.id).filter(Boolean);

  // Delete rows that were removed (had an id before, not present now)
  await prisma.$transaction(async (tx) => {
    // Remove rows not in incoming list
    await tx.factura.deleteMany({
      where: {
        proyectoId,
        ...(incomingIds.length > 0 ? { id: { notIn: incomingIds } } : {}),
      }
    });

    await Promise.all(incoming.map(r => {
      const data = {
        proyectoId,
        archivo: r.archivo || null,
        descripcion: r.descripcion || null,
        serie_factura: r.serie_factura || null,
        numero_factura: r.numero_factura || null,
        razon_social_emisor: r.razon_social_emisor || null,
        rut_emisor: r.rut_emisor || null,
        fecha: r.fecha || null,
        fecha_vto: r.fecha_vto || null,
        monto: r.monto ? parseFloat(r.monto) : null,
        moneda: r.moneda || null,
        cantidad: r.cantidad ? parseInt(r.cantidad) : 1,
        rubro: r.rubro || null,
        rut_receptor: r.rut_receptor || null,
        razon_social_receptor: r.razon_social_receptor || null,
        texto_extraido: Boolean(r.texto_extraido),
      };
      if (r.id) {
        return tx.factura.upsert({
          where: { id: r.id },
          update: data,
          create: { id: r.id, ...data },
        });
      }
      return tx.factura.create({ data });
    }));
  });
}

/** Read persisted results from db */
async function leerResultadosDB(proyectoId) {
  return prisma.factura.findMany({
    where: { proyectoId },
    orderBy: { createdAt: 'asc' }
  });
}

// ── Project-scoped invoice endpoints ─────────────────────

// POST  upload files
router.post('/empresas/:empresaId/proyectos/:proyectoId/upload', upload.array('files'), async (req, res) => {
  try {
    const { empresaId, proyectoId } = req.params;
    const folderPath = `proyectos/${empresaId}/${proyectoId}`;
    const supported = (req.files || []).filter(f => isSupported(f.originalname));
    const subidos = await Promise.all(
      supported.map(f =>
        supabaseService.uploadFile(`${folderPath}/${f.originalname}`, f.buffer, f.mimetype)
          .then(() => f.originalname)
      )
    );
    res.json({ subidos, total: subidos.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// POST  upload + process files (appends to existing results)
router.post('/empresas/:empresaId/proyectos/:proyectoId/subir-y-procesar', upload.array('files'), async (req, res) => {
  try {
    const { empresaId, proyectoId } = req.params;
    const folderPath = `proyectos/${empresaId}/${proyectoId}/`;

    const supported = (req.files || []).filter(f => isSupported(f.originalname));
    await Promise.all(
      supported.map(f =>
        supabaseService.uploadFile(`${folderPath}/${f.originalname}`, f.buffer, f.mimetype)
      )
    );
    const archivosData = supported.map(f => ({
      buffer: f.buffer,
      mimeType: getMimeType(f.originalname),
      filename: f.originalname,
    }));

    if (!archivosData.length) {
      return res.json(await leerResultadosDB(proyectoId));
    }

    const nuevos = await facturaService.analizarMultipleArchivos(archivosData);

    if (nuevos.length > 0) {
      await prisma.factura.createMany({
        data: nuevos.map(r => ({
          proyectoId,
          archivo: r.archivo || null,
          descripcion: r.descripcion || null,
          serie_factura: r.serie_factura || null,
          numero_factura: r.numero_factura || null,
          razon_social_emisor: r.razon_social_emisor || null,
          rut_emisor: r.rut_emisor || null,
          fecha: r.fecha || null,
          monto: r.monto ? parseFloat(r.monto) : null,
          moneda: r.moneda || null,
          cantidad: r.cantidad ? parseInt(r.cantidad) : 1,
          rubro: r.rubro || null,
          rut_receptor: r.rut_receptor || null,
          razon_social_receptor: r.razon_social_receptor || null,
          fecha_vto: r.fecha_vto || null,
          texto_extraido: Boolean(r.texto_extraido),
        })),
      });
    }

    res.json(await leerResultadosDB(proyectoId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST  reprocess specific files (returns new data without saving)
router.post('/empresas/:empresaId/proyectos/:proyectoId/reprocesar', async (req, res) => {
  try {
    const { empresaId, proyectoId } = req.params;
    const { archivos } = req.body;

    if (!Array.isArray(archivos) || !archivos.length) {
      return res.status(400).json({ error: 'archivos debe ser un array no vacío' });
    }

    const folderPath = `proyectos/${empresaId}/${proyectoId}`;
    const downloadResults = await Promise.allSettled(
      archivos.map(filename =>
        supabaseService.downloadFile(`${folderPath}/${filename}`)
          .then(buffer => ({ buffer, mimeType: getMimeType(filename), filename }))
      )
    );
    downloadResults
      .filter(r => r.status === 'rejected')
      .forEach(r => console.warn('No se pudo descargar archivo:', r.reason?.message));
    const archivosData = downloadResults
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    if (!archivosData.length) {
      return res.status(404).json({ error: 'No se pudieron descargar los archivos indicados' });
    }

    const resultados = await facturaService.analizarMultipleArchivos(archivosData);
    res.json(resultados);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET  retrieve persisted results
router.get('/empresas/:empresaId/proyectos/:proyectoId/resultados', async (req, res) => {
  try {
    const { proyectoId } = req.params;
    const data = await leerResultadosDB(proyectoId);
    res.json(data || []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT  update persisted results
router.put('/empresas/:empresaId/proyectos/:proyectoId', async (req, res) => {
  try {
    const { proyectoId } = req.params;
    const { results } = req.body;

    if (!Array.isArray(results)) {
      return res.status(400).json({ error: 'results debe ser un array' });
    }

    await guardarResultadosDB(proyectoId, results);
    const updated = await leerResultadosDB(proyectoId);
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// GET  analyze invoices + persist results
router.get('/empresas/:empresaId/proyectos/:proyectoId/analizar', async (req, res) => {
  try {
    const { empresaId, proyectoId } = req.params;
    const folderPath = `proyectos/${empresaId}/${proyectoId}`;

    const fileList = await supabaseService.listFiles(folderPath);
    if (!fileList || !fileList.length) return res.json(await leerResultadosDB(proyectoId));

    const archivosData = await Promise.all(
      fileList
        .filter(f => isSupported(f.name))
        .map(f =>
          supabaseService.downloadFile(`${folderPath}/${f.name}`)
            .then(buffer => ({ buffer, mimeType: getMimeType(f.name), filename: f.name }))
        )
    );

    const resultados = await facturaService.analizarMultipleArchivos(archivosData);
    await guardarResultadosDB(proyectoId, resultados);
    res.json(await leerResultadosDB(proyectoId));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// POST  export Excel
router.post('/empresas/:empresaId/proyectos/:proyectoId/excel', async (req, res) => {
  try {
    const { empresaId, proyectoId } = req.params;

    let resultados = await leerResultadosDB(proyectoId);
    if (!resultados || !resultados.length) {
      const folderPath = `proyectos/${empresaId}/${proyectoId}`;
      const fileList = await supabaseService.listFiles(folderPath);
      const archivosData = await Promise.all(
        (fileList || [])
          .filter(f => isSupported(f.name))
          .map(f =>
            supabaseService.downloadFile(`${folderPath}/${f.name}`)
              .then(buffer => ({ buffer, mimeType: getMimeType(f.name), filename: f.name }))
          )
      );
      const parsedStats = await facturaService.analizarMultipleArchivos(archivosData);
      await guardarResultadosDB(proyectoId, parsedStats);
      resultados = await leerResultadosDB(proyectoId);
    }
    if (!resultados.length) return res.status(404).json({ error: 'No hay facturas procesadas' });

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: { empresa: { select: { rut: true } } },
    });

    const rubros = await prisma.rubro.findMany();
    const rubroMap = new Map(rubros.map(r => [r.codigo_rubro, r.descripcion]));

    const resultadosEnriquecidos = resultados.map(r => ({
      ...r,
      convenio: proyecto?.convenio ?? null,
      rut_receptor: proyecto?.empresa?.rut ?? r.rut_receptor ?? null,
      nombre_rubro: r.rubro ? (rubroMap.get(r.rubro) ?? null) : null,
    }));

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 15);
    const nombre = `export_${empresaId}_${timestamp}.xlsx`;
    const ruta = path.join(TMP_DIR, nombre);

    await excelService.generarExcelFacturas(resultadosEnriquecidos, ruta);

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=${nombre}`,
    });
    res.send(fs.readFileSync(ruta));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
