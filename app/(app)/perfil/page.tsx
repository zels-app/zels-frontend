'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/page-header'
import { useCurrentUser, useUpdateUser, useChangePassword } from '@/lib/api/user'
import { useHealthProfile, useUpdateHealthProfile, type UpdateHealthProfilePayload } from '@/lib/api/health-profile'

export default function PerfilPage() {
  const { data: user, isLoading } = useCurrentUser()
  const updateUser = useUpdateUser()
  const changePassword = useChangePassword()
  const { data: profile, isLoading: profileLoading } = useHealthProfile()
  const updateHealthProfile = useUpdateHealthProfile()

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [hasDigitalDependency, setHasDigitalDependency] = useState(false)
  const [emergencyNotes, setEmergencyNotes] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setDisplayName(user.displayName ?? '')
      setPhone(user.phone ?? '')
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName ?? '')
      setBirthDate(profile.birthDate ? profile.birthDate.split('T')[0] : '')
      setGender(profile.gender ?? '')
      setBloodType(profile.bloodType ?? '')
      setHasDigitalDependency(profile.hasDigitalDependency ?? false)
      setEmergencyNotes(profile.emergencyNotes ?? '')
    }
  }, [profile])

  async function handleSaveProfile() {
    if (!name.trim()) {
      toast.error('O nome não pode ficar em branco.')
      return
    }
    try {
      await updateUser.mutateAsync({
        name: name.trim(),
        displayName: displayName.trim(),
        phone: phone.trim() || undefined,
      })
      toast.success('Perfil atualizado com sucesso.')
    } catch {
      toast.error('Erro ao atualizar perfil. Tente novamente.')
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('A nova senha e a confirmação não coincidem.')
      return
    }
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword })
      toast.success('Senha alterada com sucesso.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Não foi possível trocar a senha. Verifique a senha atual e tente novamente.')
    }
  }

  async function handleSaveHealthProfile() {
    if (!profile) return
    try {
      const payload: UpdateHealthProfilePayload = {
        ...(fullName.trim() && { fullName: fullName.trim() }),
        ...(birthDate && { birthDate }),
        ...(gender && { gender: gender as 'MALE' | 'FEMALE' | 'OTHER' }),
        ...(bloodType && { bloodType: bloodType as 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG' }),
        hasDigitalDependency,
        ...(emergencyNotes.trim() && { emergencyNotes: emergencyNotes.trim() }),
      }
      await updateHealthProfile.mutateAsync({ id: profile.id, data: payload })
      toast.success('Perfil de saúde atualizado com sucesso.')
    } catch {
      toast.error('Erro ao atualizar perfil de saúde. Tente novamente.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-zels-text-faint">Carregando perfil…</p>
      </div>
    )
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--zels-primary)',
    marginBottom: '0.4rem',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.875rem',
    border: '1px solid rgba(61,43,31,0.18)',
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    color: '#3D2B1F',
    background: '#FDFCFA',
    outline: 'none',
  }

  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid rgba(61,43,31,0.08)',
    borderRadius: '1rem',
    padding: '1.75rem',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: 'var(--font-heading)',
    fontWeight: 400,
    fontSize: '1.25rem',
    color: '#3D2B1F',
    marginBottom: '1.25rem',
  }

  const buttonStyle = (isPending: boolean): React.CSSProperties => ({
    marginTop: '1.5rem',
    padding: '0.7rem 1.5rem',
    background: 'var(--zels-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '100px',
    fontSize: '0.9rem',
    fontWeight: 800,
    cursor: isPending ? 'not-allowed' : 'pointer',
    opacity: isPending ? 0.7 : 1,
    transition: 'opacity 0.2s',
  })

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <PageHeader
        overline="CONTA"
        title="Meu perfil"
        subtitle="Gerencie suas informações pessoais e senha de acesso."
      />

      {/* Dados pessoais */}
      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Dados pessoais</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Como gosto de ser chamado</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: Seu Zé, Rafa, Vó..."
              style={inputStyle}
              maxLength={50}
            />
            <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.45)', marginTop: '0.35rem' }}>
              Este nome aparece no topo do app e nos cumprimentos. Deixe em branco para usar o primeiro nome.
            </p>
          </div>

          <div>
            <label style={labelStyle}>Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(81) 99999-9999"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email"
              value={user?.email ?? ''}
              readOnly
              style={{
                ...inputStyle,
                border: '1px solid rgba(61,43,31,0.08)',
                color: 'rgba(61,43,31,0.45)',
                background: 'rgba(61,43,31,0.03)',
                cursor: 'not-allowed',
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.45)', marginTop: '0.35rem' }}>
              O e-mail não pode ser alterado por aqui.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={updateUser.isPending}
          style={buttonStyle(updateUser.isPending)}
        >
          {updateUser.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </section>

      {/* Segurança */}
      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Segurança</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(
            [
              { label: 'Senha atual', value: currentPassword, setter: setCurrentPassword, placeholder: '••••••••' },
              { label: 'Nova senha', value: newPassword, setter: setNewPassword, placeholder: 'Mínimo 8 caracteres' },
              { label: 'Confirmar nova senha', value: confirmPassword, setter: setConfirmPassword, placeholder: 'Repita a nova senha' },
            ] as const
          ).map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleChangePassword}
          disabled={changePassword.isPending}
          style={buttonStyle(changePassword.isPending)}
        >
          {changePassword.isPending ? 'Trocando…' : 'Trocar senha'}
        </button>
      </section>

      {/* Perfil de saúde */}
      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Perfil de saúde</h2>

        {profileLoading ? (
          <p style={{ fontSize: '0.9rem', color: 'rgba(61,43,31,0.45)' }}>Carregando…</p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await handleSaveHealthProfile()
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Nome completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome completo da pessoa cuidada"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Data de nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Gênero</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Selecione...</option>
                  <option value="MALE">Masculino</option>
                  <option value="FEMALE">Feminino</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Tipo sanguíneo</label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">Não sei / Informar depois</option>
                  <option value="A_POS">A+</option>
                  <option value="A_NEG">A-</option>
                  <option value="B_POS">B+</option>
                  <option value="B_NEG">B-</option>
                  <option value="AB_POS">AB+</option>
                  <option value="AB_NEG">AB-</option>
                  <option value="O_POS">O+</option>
                  <option value="O_NEG">O-</option>
                </select>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  border: '1px solid rgba(61,43,31,0.12)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                }}
              >
                <input
                  id="hasDigitalDependency"
                  type="checkbox"
                  checked={hasDigitalDependency}
                  onChange={(e) => setHasDigitalDependency(e.target.checked)}
                  style={{
                    marginTop: '0.125rem',
                    width: '1rem',
                    height: '1rem',
                    accentColor: 'var(--zels-primary)',
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                />
                <div>
                  <label
                    htmlFor="hasDigitalDependency"
                    style={{ fontSize: '0.9rem', color: '#3D2B1F', cursor: 'pointer', lineHeight: '1.4' }}
                  >
                    Precisa de ajuda com tecnologia?
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.45)', marginTop: '0.25rem' }}>
                    O Zel's vai priorizar fluxos mais simples, como WhatsApp.
                  </p>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Observações de emergência</label>
                <textarea
                  rows={3}
                  value={emergencyNotes}
                  onChange={(e) => setEmergencyNotes(e.target.value)}
                  placeholder="Ex: Diabético, alergia a dipirona, usa marca-passo..."
                  style={{ ...inputStyle, height: 'auto', paddingTop: '0.5rem', paddingBottom: '0.5rem', resize: 'none' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updateHealthProfile.isPending}
              style={buttonStyle(updateHealthProfile.isPending)}
            >
              {updateHealthProfile.isPending ? 'Salvando…' : 'Salvar perfil de saúde'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
