const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const prisma = require('../../config/prisma');

class ProyectoService {
    async crear(empresaId, convenio) {
        const fechaHoy = new Date().toISOString().split('T')[0];
        const proyectoId = `${fechaHoy}_${crypto.randomUUID().substring(0, 6)}`;

        // Save project recursively in DB
        await prisma.proyecto.create({
            data: {
                id: proyectoId,
                empresaId,
                fecha_creacion: fechaHoy,
                convenio,
            }
        });

        return proyectoId;
    }

    async listar(empresaId) {
        // Map db results to legacy response structure
        const proyectos = await prisma.proyecto.findMany({
            where: { empresaId }
        });
        return proyectos.map(p => ({
            id: p.id,
            fecha_creacion: p.fecha_creacion,
            convenio: p.convenio,
        }));
    }

    async actualizarMetadata(empresaId, proyectoId, datos) {
        const camposEditables = [
            'convenio',
        ];

        const dataToUpdate = {};
        for (const campo of camposEditables) {
            if (datos[campo] !== undefined) dataToUpdate[campo] = datos[campo];
        }

        try {
            await prisma.proyecto.update({
                where: { id: proyectoId },
                data: dataToUpdate
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    async getMetadata(empresaId, proyectoId) {
        const p = await prisma.proyecto.findUnique({ where: { id: proyectoId } });
        if (!p) return null;
        return {
            id: p.id,
            fecha_creacion: p.fecha_creacion,
            convenio: p.convenio,
        };
    }

}

module.exports = new ProyectoService();
