-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "razon_social" TEXT,
    "domicilio_fiscal" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "convenio" TEXT NOT NULL,
    "fecha_creacion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT,
    "archivo" TEXT,
    "descripcion" TEXT,
    "serie_factura" TEXT,
    "numero_factura" TEXT,
    "razon_social_emisor" TEXT,
    "rut_emisor" TEXT,
    "fecha" TEXT,
    "fecha_vto" TEXT,
    "monto" DOUBLE PRECISION,
    "moneda" TEXT,
    "cantidad" INTEGER DEFAULT 1,
    "rubro" TEXT,
    "rut_receptor" TEXT,
    "razon_social_receptor" TEXT,
    "texto_extraido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rubro" (
    "id" TEXT NOT NULL,
    "codigo_rubro" TEXT,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "Rubro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_rut_key" ON "Empresa"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "Proyecto_convenio_key" ON "Proyecto"("convenio");

-- CreateIndex
CREATE INDEX "Proyecto_empresaId_idx" ON "Proyecto"("empresaId");

-- CreateIndex
CREATE INDEX "Factura_proyectoId_idx" ON "Factura"("proyectoId");

-- CreateIndex
CREATE UNIQUE INDEX "Rubro_codigo_rubro_key" ON "Rubro"("codigo_rubro");

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
