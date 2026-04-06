import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Save, Plus, ArrowUpRight, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingState, Spinner } from '@/components/ui/loading'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { empresas as empApi, proyectos as projApi } from '@/lib/api'

const FIELDS = [
  { key: 'razon_social', label: 'Razón Social', span: 1 },
  { key: 'rut', label: 'RUT', span: 1, readonly: true },
  { key: 'domicilio_fiscal', label: 'Domicilio Fiscal', span: 1 },
  { key: 'telefono', label: 'Teléfono', span: 1 },
  { key: 'email', label: 'Email', span: 1 },
]

export default function EmpresaDetail() {
  const { empresaId } = useParams()
  const [empresa, setEmpresa] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [proyectos, setProyectos] = useState([])
  const [projLoading, setProjLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [projForm, setProjForm] = useState({ convenio: '' })

  const [activeTab, setActiveTab] = useState('proyectos')
  const [configProj, setConfigProj] = useState(null)
  const [configForm, setConfigForm] = useState({})
  const [savingConfig, setSavingConfig] = useState(false)

  useEffect(() => {
    empApi.get(empresaId).then((e) => { setEmpresa(e); setForm(e) }).catch(console.error).finally(() => setLoading(false))
    projApi.list(empresaId).then(setProyectos).catch(console.error).finally(() => setProjLoading(false))
  }, [empresaId])

  const handleSave = async () => {
    setSaving(true)
    try { await empApi.update(empresaId, form); setEmpresa({ ...form }) }
    catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleCreateProj = async () => {
    setCreating(true)
    try {
      await projApi.create(empresaId, projForm.convenio || null)
      setDialogOpen(false)
      setProjForm({ convenio: '' })
      projApi.list(empresaId).then(setProyectos).catch(console.error)
    } catch (err) {
      console.error(err)
      projApi.list(empresaId).then(setProyectos).catch(console.error)
    }
    finally { setCreating(false) }
  }

  const handleOpenConfig = (p) => {
    setConfigForm({ convenio: p.convenio || '', fecha_inicio: p.fecha_inicio || '' })
    setConfigProj(p)
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      await projApi.updateMetadata(empresaId, configProj.id, {
        convenio: configForm.convenio || null,
        fecha_inicio: configForm.fecha_inicio || null,
      })
      setProyectos(prev => prev.map(p =>
        p.id === configProj.id
          ? { ...p, convenio: configForm.convenio || null, fecha_inicio: configForm.fecha_inicio || null }
          : p
      ))
      setConfigProj(null)
    } catch (err) { console.error(err) }
    finally { setSavingConfig(false) }
  }

  if (loading) return <LoadingState />

  const hasChanges = JSON.stringify(form) !== JSON.stringify(empresa)

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link to="/empresas" className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-medium truncate">{empresa?.nombre}</h1>
            <p className="text-xs text-muted-foreground">{empresa?.rut}</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 text-xs">
          <Plus size={12} />
          Nuevo proyecto
        </Button>
      </div>

      {/* Tabs Menu */}
      <div className="flex gap-1.5 border-b border-border/50 pb-0 mb-6 px-1">
        {[
          { id: 'proyectos', label: 'Proyectos' },
          { id: 'metadata', label: 'Datos de empresa' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium transition-all mb-[-1px] border-b-2',
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Proyectos Tab */}
      {activeTab === 'proyectos' && (
        <section className="bg-card/30 border border-border/50 rounded-xl p-5 md:p-6 animate-fade-in shadow-sm">
          <div className="mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Proyectos Asociados</h2>
          </div>

          {projLoading ? (
            <LoadingState message="Cargando proyectos..." />
          ) : proyectos.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-12 text-center bg-card/10">
              <p className="text-sm text-muted-foreground">No hay proyectos aún.</p>
              <button onClick={() => setDialogOpen(true)} className="text-sm font-medium text-primary hover:underline mt-2 cursor-pointer transition-colors">
                Crear el primer proyecto
              </button>
            </div>
          ) : (
            <div className="border border-border/80 rounded-lg overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/40 text-left">
                    {['Convenio', 'Fecha creación', 'Fecha inicio', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {proyectos.map((p) => {
                    return (
                      <tr key={p.id} className="bg-card hover:bg-accent/40 transition-colors group">
                        <td className="px-4 py-3 text-[13px] whitespace-nowrap font-mono text-muted-foreground">
                          {p.convenio || '--'}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground/80 whitespace-nowrap">
                          {p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString() : '--'}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-muted-foreground/80 whitespace-nowrap">
                          {p.fecha_inicio ? new Date(p.fecha_inicio).toLocaleDateString() : '--'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenConfig(p)}
                              className="h-[28px] px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                            >
                              <Settings size={12} />
                              Configurar
                            </Button>
                            <Link to={`/empresas/${empresaId}/proyectos/${p.id}`}>
                              <Button size="sm" variant="secondary" className="h-[28px] px-3 text-[11px] font-medium gap-1 bg-background hover:bg-muted-foreground/10 text-foreground transition-all">
                                Abrir <ArrowUpRight size={12} className="opacity-50" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Metadata Tab */}
      {activeTab === 'metadata' && (
        <section className="bg-card/30 border border-border/50 rounded-xl p-5 md:p-6 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Datos de la empresa</h2>
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} size="sm" className="h-[28px] text-[11px] gap-1.5 font-medium">
                {saving ? <Spinner size={12} /> : <Save size={12} />}
                Guardar cambios
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 gap-y-5">
            {FIELDS.map(({ key, label, span, readonly, type }) => (
              <div key={key} className={span === 2 ? 'col-span-1 md:col-span-2' : ''}>
                <label htmlFor={`field-${key}`} className="text-[11px] font-medium text-muted-foreground/80 mb-1.5 block">
                  {label}
                </label>
                <Input
                  id={`field-${key}`}
                  type={type || 'text'}
                  readOnly={readonly}
                  value={form[key] || ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={cn("h-9 text-[13px] bg-background border-border/50", readonly && "opacity-60 cursor-not-allowed text-muted-foreground")}
                  placeholder={type === 'date' ? undefined : `Ingrese ${label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dialog configurar proyecto */}
      <Dialog open={!!configProj} onClose={() => setConfigProj(null)}>
        <DialogContent onClose={() => setConfigProj(null)}>
          <DialogHeader>
            <DialogTitle>Configuración del proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="config-convenio" className="text-[12px] font-medium text-foreground">Convenio</label>
              <Input
                id="config-convenio"
                placeholder="Ej: CONV-2025-001"
                value={configForm.convenio || ''}
                onChange={(e) => setConfigForm(f => ({ ...f, convenio: e.target.value }))}
                className="h-9 text-[13px]"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="config-fecha-inicio" className="text-[12px] font-medium text-foreground">
                Fecha de inicio de gastos <span className="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <Input
                id="config-fecha-inicio"
                type="date"
                value={configForm.fecha_inicio || ''}
                onChange={(e) => setConfigForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                className="h-9 text-[13px]"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setConfigProj(null)} size="sm" className="h-9 text-xs">Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig} size="sm" className="h-9 text-xs">
              {savingConfig ? <><Spinner size={12} className="mr-1.5" /> Guardando...</> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>Nuevo proyecto COMAP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label htmlFor="proj-convenio" className="text-[12px] font-medium text-foreground">Convenio <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <Input id="proj-convenio" placeholder="Ej: CONV-2025-001" value={projForm.convenio} onChange={(e) => setProjForm({ ...projForm, convenio: e.target.value })} className="h-9 text-[13px]" />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} size="sm" className="h-9 text-xs">Cancelar</Button>
            <Button onClick={handleCreateProj} disabled={creating} size="sm" className="h-9 text-xs">
              {creating ? 'Creando...' : 'Crear proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
