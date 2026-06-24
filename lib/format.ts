const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_FULL  = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const WEEK_DAYS    = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function timeStr(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

export function formatAppointmentDate(isoString: string): string {
  const date    = new Date(isoString)
  const now     = new Date()
  const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const nextWeek = new Date(today.getTime() + 7 * 86_400_000)
  const apptDay  = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const t = timeStr(date)

  if (apptDay.getTime() === today.getTime()) return `hoje às ${t}`
  if (apptDay.getTime() === tomorrow.getTime()) return `amanhã às ${t}`
  if (apptDay < nextWeek) {
    return `${WEEK_DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} às ${t}`
  }
  return `${date.getDate()} de ${MONTHS_FULL[date.getMonth()]} às ${t}`
}

export function toISOLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
