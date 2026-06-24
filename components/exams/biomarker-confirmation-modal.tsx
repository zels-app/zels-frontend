'use client'

import { useState } from 'react'
import { X, Plus, Trash2, AlertTriangle } from 'lucide-react'
import type { Biomarker, ExamExtractedData } from '@/lib/api/exams'

const STATUS_OPTIONS = ['normal', 'alto', 'baixo', 'atenção'] as const

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-zels-primary/30'

interface Props {
  examType: string
  examDate: string
  suggestion: ExamExtractedData
  onConfirm: (data: ExamExtractedData) => void
  onCancel: () => void
  isSaving: boolean
}

export function BiomarkerConfirmationModal({
  examType,
  examDate,
  suggestion,
  onConfirm,
  onCancel,
  isSaving,
}: Props) {
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>(suggestion.biomarkers)

  function updateBiomarker(index: number, field: keyof Biomarker, value: string | number) {
    setBiomarkers(prev =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    )
  }

  function removeBiomarker(index: number) {
    setBiomarkers(prev => prev.filter((_, i) => i !== index))
  }

  function addBiomarker() {
    setBiomarkers(prev => [
      ...prev,
      { name: '', value: 0, unit: '', status: 'normal' },
    ])
  }

  function handleConfirm() {
    const valid = biomarkers.filter(b => b.name.trim() && b.unit.trim())
    onConfirm({ biomarkers: valid, extractedAt: suggestion.extractedAt })
  }

  const formattedDate = new Date(examDate).toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: 'var(--card)', borderRadius: '16px',
        width: '100%', maxWidth: '680px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)' }}>
              Revisar biomarcadores extraídos
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--zels-text-soft)', marginTop: '2px' }}>
              {examType} · {formattedDate}
            </p>
          </div>
          <button type="button" onClick={onCancel}
            style={{ color: 'var(--zels-text-faint)', padding: '4px', borderRadius: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Disclaimer */}
        <div style={{
          margin: '16px 24px 0',
          background: 'rgba(155,90,66,0.08)',
          border: '1px solid rgba(155,90,66,0.22)',
          borderRadius: '10px', padding: '10px 14px',
          display: 'flex', gap: '10px', alignItems: 'flex-start',
        }}>
          <AlertTriangle size={15} style={{ color: 'var(--zels-attention)', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--zels-attention)' }}>
              Leitura realizada por inteligência artificial
            </p>
            <p style={{ fontSize: '0.73rem', color: 'var(--zels-text-soft)', marginTop: '3px', lineHeight: 1.55 }}>
              Diferentes laboratórios e clínicas podem utilizar parâmetros e unidades distintas.
              Confira e corrija as informações antes de confirmar.
            </p>
          </div>
        </div>

        {/* Lista de biomarcadores */}
        <div style={{ padding: '16px 24px', maxHeight: '52vh', overflowY: 'auto' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '12px',
          }}>
            <p style={{
              fontSize: '0.72rem', fontWeight: 800, color: 'var(--zels-text-soft)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              {biomarkers.length} marcador{biomarkers.length !== 1 ? 'es' : ''}
            </p>
            <button type="button" onClick={addBiomarker} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--zels-primary)',
              padding: '4px 10px', borderRadius: '6px',
              border: '1px solid var(--zels-primary)',
            }}>
              <Plus size={12} /> Adicionar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {biomarkers.map((b, i) => (
              <div key={i} style={{
                background: 'var(--muted)', borderRadius: '10px',
                padding: '12px', border: '1px solid var(--border)',
              }}>
                {/* Nome + botão remover */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--zels-primary)', marginBottom: '3px' }}>
                      Marcador
                    </label>
                    <input
                      type="text"
                      value={b.name}
                      onChange={e => updateBiomarker(i, 'name', e.target.value)}
                      className={fieldClass}
                      placeholder="Ex: Colesterol Total"
                    />
                  </div>
                  <button type="button" onClick={() => removeBiomarker(i)}
                    style={{ color: 'var(--zels-urgent)', padding: '6px', flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Valor, Unidade, Referência, Status */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { label: 'Valor', field: 'value' as const, type: 'number', placeholder: '0' },
                    { label: 'Unidade', field: 'unit' as const, type: 'text', placeholder: 'mg/dL' },
                    { label: 'Referência', field: 'referenceRange' as const, type: 'text', placeholder: '< 200' },
                  ].map(({ label, field, type, placeholder }) => (
                    <div key={field}>
                      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--zels-primary)', marginBottom: '3px' }}>
                        {label}
                      </label>
                      <input
                        type={type}
                        value={field === 'value' ? b.value : (b[field] ?? '')}
                        onChange={e => updateBiomarker(i, field,
                          field === 'value' ? (parseFloat(e.target.value) || 0) : e.target.value
                        )}
                        className={fieldClass}
                        placeholder={placeholder}
                        step={field === 'value' ? '0.01' : undefined}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: 'var(--zels-primary)', marginBottom: '3px' }}>
                      Status
                    </label>
                    <select
                      value={b.status}
                      onChange={e => updateBiomarker(i, 'status', e.target.value)}
                      className={fieldClass}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: '12px', alignItems: 'center',
        }}>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving || biomarkers.length === 0}
            style={{
              padding: '10px 24px', borderRadius: '10px',
              background: 'var(--zels-primary)', color: '#ffffff',
              fontSize: '0.875rem', fontWeight: 700,
              opacity: isSaving || biomarkers.length === 0 ? 0.5 : 1,
              cursor: isSaving || biomarkers.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving
              ? 'Salvando…'
              : `Confirmar ${biomarkers.length} marcador${biomarkers.length !== 1 ? 'es' : ''}`}
          </button>
          <button type="button" onClick={onCancel} disabled={isSaving}
            style={{ fontSize: '0.85rem', color: 'var(--zels-text-faint)', fontWeight: 600 }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
