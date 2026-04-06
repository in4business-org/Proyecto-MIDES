import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, Download, FileText,
  Check, Plus, RefreshCw,
  ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingState, EmptyState, Spinner } from '@/components/ui/loading'
import { cn } from '@/lib/utils'
import { empresas as empApi, proyectos as projApi, facturas as factApi } from '@/lib/api'

/* ─── CellDropdown ────────────────────────────────── */

function CellDropdown({ id, value, options, onChange, open, onOpen }) {
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const label = options.find(o => o.v === value)?.l ?? '--'

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
    }
    onOpen(open ? null : id)
  }

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-between gap-1.5 w-full px-2 h-full min-h-[34px] bg-transparent hover:bg-primary/5 text-[12px] text-foreground transition-colors"
      >
        <span className="truncate">{label}</span>
        <span className="text-[9px] text-muted-foreground shrink-0">▼</span>
      </button>
      {open && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => onOpen(null)} />
          <div
            style={{ position: 'absolute', top: pos.top + window.scrollY, left: pos.left + window.scrollX, zIndex: 101, width: 'max-content', minWidth: '120px' }}
            className="bg-popover border border-border rounded-lg shadow-lg py-1"
          >
            {options.map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => { onChange(v); onOpen(null) }}
                className={cn(
                  "w-full block text-left px-3 py-1.5 text-[12px] whitespace-nowrap hover:bg-accent transition-colors",
                  value === v ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

/* ─── CellDatePicker ──────────────────────────────── */

function CellDatePicker({ id, value, onChange, open, onOpen }) {
  const btnRef = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  // value is DD/MM/YYYY
  const parseValue = (v) => {
    if (!v) return null
    const [d, m, y] = v.split('/')
    return d && m && y ? new Date(+y, +m - 1, +d) : null
  }

  const selectedDate = parseValue(value)

  const [viewDate, setViewDate] = useState(() => {
    const s = parseValue(value)
    return s ? new Date(s.getFullYear(), s.getMonth(), 1) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  })

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 4, left: rect.left })
      const s = parseValue(value)
      if (s) setViewDate(new Date(s.getFullYear(), s.getMonth(), 1))
    }
    onOpen(open ? null : id)
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build days grid (week starts Monday)
  const days = []
  const firstDow = new Date(year, month, 1).getDay()
  const startPad = firstDow === 0 ? 6 : firstDow - 1
  for (let i = startPad - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), current: false })
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) days.push({ date: new Date(year, month, d), current: true })
  while (days.length % 7 !== 0) days.push({ date: new Date(year, month + 1, days.length - daysInMonth - startPad + 1), current: false })

  const handleDay = (date) => {
    const d = String(date.getDate()).padStart(2, '0')
    const m = String(date.getMonth() + 1).padStart(2, '0')
    onChange(`${d}/${m}/${date.getFullYear()}`)
    onOpen(null)
  }

  const monthLabel = new Intl.DateTimeFormat('es-UY', { month: 'long', year: 'numeric' }).format(viewDate)

  return (
    <div>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="flex items-center justify-between gap-1.5 w-full px-2 h-full min-h-[34px] bg-transparent hover:bg-primary/5 text-[12px] text-foreground transition-colors"
      >
        <span className="truncate">{value || '--'}</span>
        <CalendarDays size={11} className="text-muted-foreground/60 shrink-0" />
      </button>

      {open && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => onOpen(null)} />
          <div
            style={{ position: 'absolute', top: pos.top + window.scrollY, left: pos.left + window.scrollX, zIndex: 101 }}
            className="bg-popover border border-border rounded-lg shadow-lg p-3 w-60"
          >
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-2.5">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-[12px] font-medium text-foreground capitalize">{monthLabel}</span>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 mb-1">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground/40 py-0.5">{d}</div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {days.map(({ date, current }, i) => {
                const isSel = selectedDate && date.toDateString() === selectedDate.toDateString()
                const isToday = date.toDateString() === today.toDateString()
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDay(date)}
                    className={cn(
                      'text-center text-[12px] py-1 rounded-md transition-colors',
                      isSel
                        ? 'bg-primary text-primary-foreground font-medium'
                        : isToday
                          ? 'border border-primary/30 text-primary font-medium hover:bg-accent'
                          : current
                            ? 'text-foreground hover:bg-accent'
                            : 'text-muted-foreground/25 hover:bg-accent/40',
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Hoy shortcut */}
            <div className="mt-2 pt-2 border-t border-border flex justify-between items-center">
              <button
                type="button"
                onClick={() => { onChange(''); onOpen(null) }}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Borrar
              </button>
              <button
                type="button"
                onClick={() => handleDay(today)}
                className="text-[11px] text-primary hover:text-primary/70 transition-colors font-medium"
              >
                Hoy
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}

/* ─── Facturas ────────────────────────────────────── */

function FacturasTab({ empresaId, proyectoId }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [results, setResults] = useState(null)
  const [loadingResults, setLoadingResults] = useState(true)
  const [uploadMsg, setUploadMsg] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedResults, setEditedResults] = useState([])
  const [savingEdit, setSavingEdit] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [reprocesando, setReprocesando] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null)

  useEffect(() => {
    setEditedResults(results || [])
  }, [results])

  useEffect(() => {
    setLoadingResults(true)
    factApi.getResults(empresaId, proyectoId)
      .then(data => setResults(data && data.length ? data : []))
      .catch(() => setResults([]))
      .finally(() => setLoadingResults(false))
  }, [empresaId, proyectoId])


  const handleEditToggle = () => {
    if (isEditing) {
      setEditedResults(results || [])
      setSelectedRows([])
      setIsEditing(false)
      return
    }
    setEditedResults(sortedDisplayResults || results || [])
    setSelectedRows([])
    setIsEditing(true)
  }

  const handleFieldChange = (id, field, value) => {
    setEditedResults(current =>
      current.map(item =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === 'monto' || field === 'cantidad'
                  ? (value === '' ? null : Number(value))
                  : value
            }
          : item
      )
    )
  }

  const handleSaveEdit = async () => {
    setSavingEdit(true)
    try {
      // esto lo vamos a conectar al back después
      const updated = await factApi.updateResults(
        empresaId,
        proyectoId,
        editedResults
      )

      setResults(updated)
      setSelectedRows([])
      setIsEditing(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleToggleRow = (id) => {
    setSelectedRows((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    )
  }

  const handleToggleAllRows = () => {
    if (selectedRows.length === editedResults.length) {
      setSelectedRows([])
      return
    }
    setSelectedRows(editedResults.map((r) => r.id))
  }

  const handleDeleteSelected = () => {
    if (!selectedRows.length) return
    setEditedResults((current) => current.filter((r) => !selectedRows.includes(r.id)))
    setSelectedRows([])
  }

  const handleReprocesarSeleccionadas = async () => {
    const archivos = selectedRows
      .map(id => editedResults.find(r => r.id === id)?.archivo)
      .filter(Boolean)
    if (!archivos.length) return
    setReprocesando(true)
    try {
      const nuevos = await factApi.reprocesar(empresaId, proyectoId, archivos)
      setEditedResults(current => [
        ...current.filter((r) => !selectedRows.includes(r.id)),
        ...nuevos,
      ])
      setSelectedRows([])
    } catch (err) {
      console.error(err)
    } finally {
      setReprocesando(false)
    }
  }

  const handleUpload = async () => {
    if (!files.length) return
    setUploadMsg('')
    setUploading(true)
    try {
      const prevCount = results?.length || 0
      const updated = await factApi.uploadAndProcess(empresaId, proyectoId, files)
      setResults(updated)
      const nuevas = (updated?.length || 0) - prevCount
      setUploadMsg(nuevas > 0 ? `${nuevas} factura(s) procesada(s)` : 'Archivos procesados sin nuevas facturas detectadas')
      setFiles([])
      document.getElementById('factura-upload').value = ''
    } catch (err) {
      console.error(err)
      setUploadMsg('Error al procesar los archivos')
    }
    finally { setUploading(false) }
  }

  const handleAddRow = () => {
    setEditedResults(current => [...current, {
      descripcion: '', numero_factura: '', razon_social_emisor: '', rut_emisor: '',
      fecha: '', monto: null, moneda: 'UYU', cantidad: 1,
      rubro: null, rut_receptor: '', razon_social_receptor: '',
      texto_extraido: false,
    }])
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await factApi.exportExcel(empresaId, proyectoId)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `mides_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
    } catch (err) { console.error(err) }
    finally { setExporting(false) }
  }
  
  const [sortField, setSortField] = useState('numero_factura')
  const [sortDir, setSortDir] = useState('desc')
  const [sortOpen, setSortOpen] = useState(false)
  const [activeView, setActiveView] = useState('list')
  const SORT_OPTIONS = [
    { label: 'N° Comprobante', field: 'numero_factura' },
    { label: 'R.S. Emisor', field: 'razon_social_emisor' },
    { label: 'Fecha', field: 'fecha' },
    { label: 'Monto', field: 'monto' },
    { label: 'Moneda', field: 'moneda' },
    { label: 'Rubro', field: 'rubro' },
    { label: 'Actualización', field: 'updatedAt' },
  ]

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortedDisplayResults = useMemo(() => {
    const arr = isEditing ? editedResults : results
    if (!sortField || !arr) return arr
    return [...arr].sort((a, b) => {
      const av = a[sortField] ?? ''
      const bv = b[sortField] ?? ''
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [results, editedResults, isEditing, sortField, sortDir])

  
  return (
    <div>
      <div className="flex items-center gap-0.5 border-b border-border/60 mb-5">
        {[{ key: 'list', label: 'Comprobantes' }].map(v => (
          <button
            key={v.key}
            onClick={() => setActiveView(v.key)}
            className={cn(
              "px-4 py-2 text-[12px] font-medium rounded-t-md border border-b-0 transition-all duration-150 whitespace-nowrap",
              activeView === v.key
                ? "border-border/60 bg-background text-foreground -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/40 hover:bg-card/60"
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── List view ─────────────────────────────────────── */}
      {activeView === 'list' && <div className="grid grid-cols-1 gap-6">
        {/* Upload area */}
        <div className="bg-card/30 border border-border/50 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Archivos · Presentación
            </h2>
          </div>

          <div className="rounded-xl border-[1.5px] border-dashed border-border/60 p-8 text-center bg-card/10 hover:bg-primary/5 hover:border-primary/40 transition-colors group">
            <input
              type="file"
              multiple
              accept=".xlsx,.pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => { setFiles([...e.target.files]); setUploadMsg('') }}
              className="hidden"
              id="factura-upload"
            />
            <label htmlFor="factura-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <FileText size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                  {files.length > 0
                    ? `${files.length} archivo(s) seleccionados`
                    : 'Arrastrá archivos o hacé clic para seleccionar'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">PDF / imágenes (procesado por IA)</p>
              </div>
            </label>

            {files.length > 0 && (
              <div className="mt-5 flex justify-center">
                <Button onClick={handleUpload} disabled={uploading} size="sm" className="h-[30px] px-6 text-[12px]">
                  {uploading ? <><Spinner size={12} className="mr-2"/> Procesando...</> : 'Subir y procesar'}
                </Button>
              </div>
            )}
          </div>
          {uploadMsg && <p className="text-[11px] text-success font-medium mt-3 text-center">{uploadMsg}</p>}
        </div>

        {/* Results */}
        <div className="bg-card/30 border border-border/50 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Resultados</h2>
            <div className="flex gap-2 flex-wrap">
              {!isEditing ? (
                <>
                  <Button
                    onClick={handleEditToggle}
                    disabled={loadingResults}
                    variant="outline"
                    size="sm"
                    className="h-[28px] text-[11px] gap-1.5"
                  >
                    Editar
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={exporting || !results?.length}
                    variant="default"
                    size="sm"
                    className="h-[28px] text-[11px] gap-1.5 bg-[#22b86c] hover:bg-[#1aa35f] text-white"
                  >
                    {exporting ? <Spinner size={12} /> : <Download size={13} />}
                    Exportar facturas
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleAddRow}
                    variant="outline"
                    size="sm"
                    className="h-[28px] text-[11px] gap-1.5"
                  >
                    <Plus size={13} />
                    Agregar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    variant="default"
                    size="sm"
                    className="h-[28px] text-[11px] gap-1.5"
                  >
                    {savingEdit ? <Spinner size={12} /> : <Check size={13} />}
                    Ok
                  </Button>
                  <Button
                    onClick={handleEditToggle}
                    disabled={savingEdit}
                    variant="outline"
                    size="sm"
                    className="h-[28px] text-[11px] gap-1.5"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleReprocesarSeleccionadas}
                    disabled={!selectedRows.some(i => editedResults[i]?.archivo) || reprocesando}
                    variant="secondary"
                    size="sm"
                    className="h-[28px] text-[11px] gap-1.5"
                  >
                    {reprocesando ? <Spinner size={12} /> : <RefreshCw size={13} />}
                    Reprocesar seleccionadas
                  </Button>
                  <Button
                    onClick={handleDeleteSelected}
                    disabled={!selectedRows.length || savingEdit}
                    variant="destructive"
                    size="sm"
                    className="h-[28px] text-[11px] gap-1.5"
                  >
                    Eliminar seleccionadas
                  </Button>
                </>
              )}
            </div>
          </div>
          
            <div className="relative">
              <button
                onClick={() => setSortOpen(o => !o)}
                className="flex items-center gap-1.5 px-2.5 h-7 rounded border border-border/60 bg-card hover:bg-accent text-[11px] text-muted-foreground hover:text-foreground transition-all"
              >
                {SORT_OPTIONS.find(o => o.field === sortField)?.label ?? 'Ordenar'}
                <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-40">
                    {SORT_OPTIONS.map(({ label, field }) => (
                      <button
                        key={field}
                        onClick={() => { handleSort(field); setSortOpen(false) }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-[12px] flex items-center justify-between hover:bg-accent transition-colors",
                          sortField === field ? "text-foreground font-medium" : "text-muted-foreground"
                        )}
                      >
                        {label}
                        {sortField === field && <span className="text-[10px] ml-2">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

          {/* Results table */}
          {loadingResults && <LoadingState message="Cargando resultados guardados..." />}

          {results && !loadingResults && (
            <div>
              {results.length > 0 || isEditing ? (
                <div className={cn("overflow-x-auto shadow-sm", isEditing ? "border border-border/60 rounded-lg" : "border border-border/80 rounded-lg")}>
                  <table className={cn("w-full text-[12px] min-w-[860px]", isEditing && "border-collapse")}>
                    <thead>
                      <tr className={cn("border-b", isEditing ? "border-border/50 bg-muted/30" : "border-border/60")}>
                        {isEditing && (
                          <th className="w-8 px-3 py-2 border-r border-border/30">
                            <input
                              type="checkbox"
                              checked={editedResults.length > 0 && selectedRows.length === editedResults.length}
                              onChange={handleToggleAllRows}
                            />
                          </th>
                        )}
                        {[
                          { label: 'Descripción', field: null },
                          { label: 'N° Comprobante', field: 'numero_factura' },
                          { label: 'R.S. Emisor', field: 'razon_social_emisor' },
                          { label: 'Fecha', field: 'fecha' },
                          { label: 'Monto', field: 'monto' },
                          { label: 'Moneda', field: 'moneda' },
                          { label: 'Rubro', field: 'rubro' },
                          { label: 'Estado', field: null },
                        ].map(({ label, field }) => (
                          <th
                            key={label}
                            onClick={field ? () => handleSort(field) : undefined}
                            className={cn(
                              "py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground select-none",
                              isEditing ? "px-2 border-r border-border/30 last:border-r-0" : "px-3",
                              field && "cursor-pointer hover:text-foreground transition-colors"
                            )}
                          >
                            {label}
                            {field && sortField === field && (
                              <span className="ml-1 opacity-70">{sortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={cn(isEditing ? "" : "divide-y divide-border/50")}>
                      {(sortedDisplayResults || []).map((r, i) => {
                        const completado = r.razon_social_emisor && r.fecha && r.monto && r.rubro
                        const cellEdit = "p-0 border-r border-b border-border/25 last:border-r-0"
                        const inputEdit = "w-full min-h-[34px] bg-transparent text-foreground px-2 py-1 text-[12px] outline-none focus:bg-primary/5 placeholder:text-muted-foreground/40"

                        return (
                          <tr key={r.id ?? i} className={cn(isEditing ? "last:border-b-0" : "bg-card hover:bg-accent/30 transition-colors")}>
                            {isEditing && (
                              <td className="w-8 px-3 border-r border-b border-border/25">
                                <input
                                  type="checkbox"
                                  checked={selectedRows.includes(r.id)}
                                  onChange={() => handleToggleRow(r.id)}
                                />
                              </td>
                            )}
                            {/* Descripción */}
                            <td className={isEditing ? cellEdit : "px-3 py-2.5 max-w-[220px]"}>
                              {isEditing ? (
                                <input value={r.descripcion || ''} onChange={(e) => handleFieldChange(r.id, 'descripcion', e.target.value)} className={inputEdit} />
                              ) : (
                                <div className="truncate" title={r.descripcion || ''}>{r.descripcion || '--'}</div>
                              )}
                            </td>
                            {/* N° Factura */}
                            <td className={isEditing ? cellEdit : "px-3 py-2.5 whitespace-nowrap"}>
                              {isEditing ? (
                                <input value={r.numero_factura || ''} onChange={(e) => handleFieldChange(r.id, 'numero_factura', e.target.value)} className={inputEdit} />
                              ) : (
                                r.numero_factura || '--'
                              )}
                            </td>
                            {/* R.S. Emisor */}
                            <td className={isEditing ? cellEdit : "px-3 py-2.5"}>
                              {isEditing ? (
                                <input value={r.razon_social_emisor || ''} onChange={(e) => handleFieldChange(r.id, 'razon_social_emisor', e.target.value)} className={inputEdit} />
                              ) : (
                                r.razon_social_emisor || '--'
                              )}
                            </td>
                            {/* Fecha */}
                            <td className={isEditing ? cellEdit : "px-3 py-2.5 whitespace-nowrap"}>
                              {isEditing ? (
                                <CellDatePicker
                                  id={`fecha-${r.id}`}
                                  value={r.fecha || ''}
                                  onChange={(v) => handleFieldChange(r.id, 'fecha', v)}
                                  open={openDropdown === `fecha-${r.id}`}
                                  onOpen={setOpenDropdown}
                                />
                              ) : (
                                r.fecha || '--'
                              )}
                            </td>
                            {/* Monto */}
                            <td className={isEditing ? cellEdit : "px-3 py-2.5 text-right"}>
                              {isEditing ? (
                                <input type="number" step="0.01" value={r.monto ?? ''} onChange={(e) => handleFieldChange(r.id, 'monto', e.target.value)} className={cn(inputEdit, "text-right w-24")} />
                              ) : (
                                r.monto != null ? r.monto.toLocaleString() : '--'
                              )}
                            </td>
                            {/* Moneda */}
                            <td className={isEditing ? cellEdit : "px-3 py-2.5"}>
                              {isEditing ? (
                                <CellDropdown
                                  id={`${r.id}-moneda`}
                                  value={(r.moneda || '').trim()}
                                  options={[{ v: '', l: '--' }, { v: 'UYU', l: 'UYU' }, { v: 'USD', l: 'USD' }]}
                                  onChange={(v) => handleFieldChange(r.id, 'moneda', v)}
                                  open={openDropdown === `${r.id}-moneda`}
                                  onOpen={setOpenDropdown}
                                />
                              ) : (
                                r.moneda || '--'
                              )}
                            </td>
                            {/* Rubro */}
                            <td className={isEditing ? cellEdit : "px-3 py-2.5"}>
                              {isEditing ? (
                                <input value={r.rubro || ''} onChange={(e) => handleFieldChange(r.id, 'rubro', e.target.value)} className={inputEdit} />
                              ) : (
                                r.rubro || '--'
                              )}
                            </td>
                            {/* Estado */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {completado
                                ? <Badge variant="secondary" className="bg-success/15 text-success border-transparent font-medium px-2 h-5 text-[10px]">✓ Completo</Badge>
                                : <Badge variant="secondary" className="bg-warning/15 text-warning border-transparent font-medium px-2 h-5 text-[10px]">⚠ Incompleto</Badge>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed border-border/60 rounded-lg py-12 text-center bg-card/5">
                  {isEditing ? (
                    <p className="text-[13px] text-muted-foreground">Usá <strong>+ Agregar</strong> para añadir la primera factura.</p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">No hay facturas cargadas. Usá <strong>Editar</strong> o <strong>Importar</strong>.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>}
    </div>
  )
}


/* ─── Main ────────────────────────────────────────── */

export default function ProyectoDetail() {
  const { empresaId, proyectoId } = useParams()
  const [empresa, setEmpresa] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      empApi.get(empresaId).catch(() => null),
      projApi.list(empresaId).catch(() => [])
    ]).then(([empData, projs]) => {
      setEmpresa(empData)
      setMeta(projs.find((x) => x.id === proyectoId) || {})
    }).finally(() => setLoading(false))
  }, [empresaId, proyectoId])

  if (loading) return <LoadingState />

  return (
    <>
      <div className="animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/empresas/${empresaId}`} className="rounded-md p-1.5 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-xl font-medium truncate flex items-center gap-2">
                {empresa?.nombre} <span className="text-muted-foreground/30">•</span> {meta?.convenio || (meta?.fecha_creacion ? new Date(meta.fecha_creacion).toLocaleDateString() : 'Sin fecha')}
              </h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {empresa?.rut} · Convenio: {meta?.convenio || '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Facturas */}
        <div className="pb-10">
          <FacturasTab empresaId={empresaId} proyectoId={proyectoId} />
        </div>
      </div>
    </>
  )
}
