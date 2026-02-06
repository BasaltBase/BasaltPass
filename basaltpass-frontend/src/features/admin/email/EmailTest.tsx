import { useState, useEffect } from 'react'
import AdminLayout from '@features/admin/components/AdminLayout'
import {
  PButton,
  PInput,
  PTextarea,
  PCheckbox
} from '@ui'
import { getEmailConfig, sendTestEmail, EmailConfig } from '@api/admin/email'
import { CheckCircleIcon, XCircleIcon, PaperAirplaneIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

export default function EmailTest() {
  const [loading, setLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const [formData, setFormData] = useState({
    from: '',
    to: '',
    subject: 'Test Email from BasaltPass',
    body: 'This is a test email sent from the BasaltPass Admin Dashboard.',
    is_html: false
  })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const { data } = await getEmailConfig()
      setConfig(data.data)
    } catch (error) {
      console.error('Failed to fetch email config', error)
      setAlert({ type: 'error', message: 'Failed to load email configuration' })
    } finally {
      setConfigLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await sendTestEmail(formData)
      setAlert({ type: 'success', message: 'Test email sent successfully!' })
    } catch (error: any) {
      console.error('Failed to send email', error)
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to send test email' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout title="System Email Test">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Email System Test</h1>
        </div>

        {/* Alert messages */}
        {alert && (
          <div
            className={`flex items-start rounded-md p-4 ${
              alert.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 mt-0.5 mr-3" />
            ) : (
              <ExclamationCircleIcon className="h-5 w-5 mt-0.5 mr-3" />
            )}
            <div>
              <p className="text-sm font-medium">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="ml-auto text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration Status */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                System Configuration
              </h3>
              {configLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : config ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500">Provider</span>
                    <span className="text-sm font-bold text-gray-900 uppercase">
                      {config.provider || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-500">Status</span>
                    {config.enabled ? (
                      <span className="flex items-center text-sm font-medium text-green-600">
                        <CheckCircleIcon className="w-5 h-5 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center text-sm font-medium text-red-600">
                        <XCircleIcon className="w-5 h-5 mr-1" />
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-4">
                    <p>To change the provider, please updating the backend configuration (env or config.yaml).</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-red-500">Unable to load configuration</div>
              )}
            </div>
          </div>
        </div>

        {/* Send Test Email Form */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Send Test Email
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="from" className="block text-sm font-medium text-gray-700">
                      From Address (Optional)
                    </label>
                    <PInput
                      id="from"
                      placeholder="e.g. verified-sender@example.com"
                      value={formData.from}
                      onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Leave empty to use system default</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="to" className="block text-sm font-medium text-gray-700">
                      To Address *
                    </label>
                    <PInput
                      id="to"
                      type="email"
                      required
                      placeholder="recipient@example.com"
                      value={formData.to}
                      onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Subject
                  </label>
                  <PInput
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                      Message Body
                    </label>
                    <div className="flex items-center space-x-2">
                      <PCheckbox
                        id="is_html"
                        checked={formData.is_html}
                        onChange={(e) => setFormData({ ...formData, is_html: e.target.checked })}
                        label="Send as HTML"
                      />
                    </div>
                  </div>
                  <PTextarea
                    id="body"
                    rows={6}
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <PButton type="submit" disabled={loading || !config?.enabled}>
                    {loading ? (
                      <>Processing...</>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        Send Test Email
                      </>
                    )}
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
        </div>
      </div>
    </AdminLayout>
  )
}
