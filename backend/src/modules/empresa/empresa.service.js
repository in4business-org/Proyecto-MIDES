const prisma = require('../../config/prisma');

const CAMPOS_EMPRESA = [
  'rut', 'nombre', 'razon_social', 'domicilio_fiscal', 'telefono', 'email',
];

class EmpresaService {
  async crear(rut, nombre, razon_social, domicilio_fiscal, telefono, email) {
    const empresaId = rut;

    await prisma.empresa.upsert({
      where: { rut },
      update: { nombre },
      create: {
        id: empresaId,
        rut,
        nombre,
        razon_social,
        domicilio_fiscal,
        telefono,
        email,
      }
    });

    return empresaId;
  }

  async listar() {
    return prisma.empresa.findMany();
  }

  async getById(empresaId) {
    return prisma.empresa.findUnique({
      where: { id: empresaId }
    });
  }

  async actualizar(empresaId, datos) {
    const validData = {};
    for (const campo of CAMPOS_EMPRESA) {
      if (datos[campo] !== undefined) validData[campo] = datos[campo];
    }

    try {
      await prisma.empresa.update({
        where: { id: empresaId },
        data: validData
      });
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = new EmpresaService();
