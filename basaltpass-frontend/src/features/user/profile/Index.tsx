import { useEffect, useState } from 'react'
import client from '@api/client'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PCard, PButton, PSkeleton, PAlert, PInput, PBadge } from '@ui'
import PhoneInput from '@ui/common/PhoneInput'
import { formatPhoneForDisplay } from '@utils/phoneValidator'
import { getUserProfile, type UserProfile } from '@api/user/profile'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  IdentificationIcon,
  PencilIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  BriefcaseIcon,
  LinkIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface Profile {
  id: string
  email: string
  phone: string
  nickname: string
  created_at: string
  updated_at: string
}

const formatDisplayDate = (value: string | null | undefined, locale: string, unsetText: string) => {
  if (!value) return unsetText

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return unsetText
  }

  return date.toLocaleDateString(locale)
}

function Profile() {
  const { t, locale } = useI18n()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    nickname: '',
    email: '',
    phone: ''
  })

  const loadProfile = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      const [profileRes, userProfileRes] = await Promise.all([
        client.get('/api/v1/user/profile'),
        getUserProfile()
      ])
      setProfile(profileRes.data)
      setUserProfile(userProfileRes.data.profile)
      setEditForm({
        nickname: profileRes.data.nickname || '',
        email: profileRes.data.email || '',
        phone: profileRes.data.phone || ''
      })
    } catch {
      setLoadError(t('userProfilePage.errors.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const handleSave = async () => {
    setSaveError('')
    setIsSaving(true)
    try {
      await client.put('/api/v1/user/profile', {
        nickname: editForm.nickname,
        phone: editForm.phone
      })
      setProfile(prev => prev ? { ...prev, nickname: editForm.nickname, phone: editForm.phone } : null)
      setIsEditing(false)
    } catch (error: any) {
      setSaveError(error?.response?.data?.error || t('userProfilePage.errors.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSaveError('')
    setEditForm({
      nickname: profile?.nickname || '',
      email: profile?.email || '',
      phone: profile?.phone || ''
    })
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.Content cards={2} />
        </div>
      </Layout>
    )
  }

  if (loadError) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="text-red-600" role="alert">{loadError}</div>
            <PButton onClick={() => void loadProfile()} variant="secondary">
                {t('userProfilePage.actions.retry')}
            </PButton>
          </div>
        </div>
      </Layout>
    )
  }

  if (!profile) return null

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <PCard variant="bordered" size="lg">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="h-24 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-white" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {profile.nickname || t('userProfilePage.unsetNickname')}
                </h3>
                <p className="text-sm text-gray-500">{t('userProfilePage.userId', { id: profile.id })}</p>
                <div className="mt-4 flex space-x-3">
                  <PBadge variant="success">{t('userProfilePage.badges.verified')}</PBadge>
                  <PBadge variant="info">{t('userProfilePage.badges.activeUser')}</PBadge>
                </div>

              </div>
            </PCard>

            {/*  */}
            <PCard variant="bordered" className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('userProfilePage.accountStats.title')}</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">{t('userProfilePage.accountStats.registeredAt')}</span>
                  <span className="text-sm text-gray-900">
                    {formatDisplayDate(profile.created_at, locale, t('userProfilePage.unset'))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">{t('userProfilePage.accountStats.updatedAt')}</span>
                  <span className="text-sm text-gray-900">
                    {formatDisplayDate(profile.updated_at, locale, t('userProfilePage.unset'))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">{t('userProfilePage.accountStats.status')}</span>
                  <span className="text-sm text-green-600">{t('userProfilePage.accountStats.normal')}</span>
                </div>
              </div>
            </PCard>
          </div>

          {/*  */}
          <div className="lg:col-span-2">
            <PCard variant="bordered" size="lg">
              <div className="mb-8 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">{t('userProfilePage.basicInfo.title')}</h3>
                {!isEditing && (
                  <PButton onClick={() => setIsEditing(true)} variant="secondary" leftIcon={<PencilIcon className="h-4 w-4" />}>
                    {t('userProfilePage.actions.editProfile')}
                  </PButton>
                )}
              </div>
              
              <div className="space-y-8">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <IdentificationIcon className="h-5 w-5 mr-2 text-indigo-500" />
                    {t('userProfilePage.basicInfo.nickname')}
                  </label>
                  {isEditing ? (
                    <PInput
                      type="text"
                      value={editForm.nickname}
                      onChange={(e) => setEditForm(prev => ({ ...prev, nickname: e.target.value }))}
                      placeholder={t('userProfilePage.placeholders.nickname')}
                      icon={<IdentificationIcon className="h-5 w-5" />}
                    />
                  ) : (
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-900">
                        {profile.nickname || t('userProfilePage.unsetNickname')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <EnvelopeIcon className="h-5 w-5 mr-2 text-indigo-500" />
                    {t('userProfilePage.basicInfo.email')}
                  </label>
                  <div className="space-y-2">
                    <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-sm text-gray-900">{profile.email}</p>
                    </div>
                    {isEditing && (
                      <p className="text-xs text-gray-500">
                        {t('userProfilePage.emailEditHint.prefix')}{' '}
                        <Link to={ROUTES.user.security} className="text-blue-600 hover:underline">
                          {t('userProfilePage.emailEditHint.securitySettings')}
                        </Link>{' '}
                        {t('userProfilePage.emailEditHint.suffix')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {isEditing ? (
                    <PhoneInput
                      label={t('userProfilePage.basicInfo.phone')}
                      value={editForm.phone}
                      onChange={(value) => {
                        setEditForm(prev => ({ ...prev, phone: value }))
                      }}
                      placeholder={t('userProfilePage.placeholders.phone')}
                      showValidation={true}
                    />
                  ) : (
                    <>
                      <label className="flex items-center text-sm font-semibold text-gray-700">
                        <PhoneIcon className="h-5 w-5 mr-2 text-indigo-500" />
                        {t('userProfilePage.basicInfo.phone')}
                      </label>
                      <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                        <p className="text-sm text-gray-900">{formatPhoneForDisplay(profile.phone) || t('userProfilePage.unset')}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-8 space-y-4 pt-8 border-t border-gray-100">
                  {saveError && <PAlert variant="error" message={saveError} />}
                  <div className="flex justify-end space-x-4">
                    <PButton
                      onClick={handleCancel}
                      variant="secondary"
                      disabled={isSaving}
                    >
                      {t('userProfilePage.actions.cancel')}
                    </PButton>
                    <PButton
                      onClick={handleSave}
                      loading={isSaving}
                      disabled={isSaving}
                    >
                      {t('userProfilePage.actions.saveChanges')}
                    </PButton>
                  </div>
                </div>
              )}
            </PCard>

            {/*  */}
            {userProfile && (
              <PCard variant="bordered" size="lg" className="mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('userProfilePage.details.title')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userProfile.gender && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <UserIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.gender')}
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.gender.name_cn || userProfile.gender.name}</p>
                    </div>
                  )}
                  {userProfile.birth_date && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.birthDate')}
                      </label>
                      <p className="text-sm text-gray-900">{formatDisplayDate(userProfile.birth_date, locale, t('userProfilePage.unset'))}</p>
                    </div>
                  )}
                  {userProfile.language && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <GlobeAltIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.language')}
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.language.name_local || userProfile.language.name}</p>
                    </div>
                  )}
                  {userProfile.timezone && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <GlobeAltIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.timezone')}
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.timezone}</p>
                    </div>
                  )}
                  {userProfile.currency && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.primaryCurrency')}
                      </label>
                      <p className="text-sm text-gray-900">
                        {userProfile.currency.name_cn || userProfile.currency.name} ({userProfile.currency.code})
                      </p>
                    </div>
                  )}
                  {userProfile.location && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.location')}
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.location}</p>
                    </div>
                  )}
                  {userProfile.company && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.company')}
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.company}</p>
                    </div>
                  )}
                  {userProfile.job_title && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <BriefcaseIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.jobTitle')}
                      </label>
                      <p className="text-sm text-gray-900">{userProfile.job_title}</p>
                    </div>
                  )}
                  {userProfile.website && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.website')}
                      </label>
                      <a 
                        href={userProfile.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {userProfile.website}
                      </a>
                    </div>
                  )}
                  {userProfile.bio && (
                    <div className="space-y-2 md:col-span-2">
                      <label className="flex items-center text-sm font-medium text-gray-500">
                        <UserIcon className="h-4 w-4 mr-2" />
                        {t('userProfilePage.details.bio')}
                      </label>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">{userProfile.bio}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <a 
                    href={ROUTES.user.settings}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {t('userProfilePage.details.editInSettings')}
                  </a>
                </div>
              </PCard>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Profile

