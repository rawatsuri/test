import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useTenantAgentConfig, useUpdateTenantAgentConfig } from '@/hooks/tenant/use-tenant-data'
import { useTenant, useUpdateTenant, useUpdateTenantStatus } from '@/hooks/tenants/use-tenants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { TenantStatus } from '@/types'

export const Route = createFileRoute('/_authenticated/super-admin/tenants/$tenantId')({
  component: TenantDetailPage,
})

function TenantDetailPage() {
  const { tenantId } = Route.useParams()
  const tenantQuery = useTenant(tenantId)
  const configQuery = useTenantAgentConfig(tenantId)
  const updateTenant = useUpdateTenant(tenantId)
  const updateStatus = useUpdateTenantStatus(tenantId)
  const updateConfig = useUpdateTenantAgentConfig(tenantId)

  const tenant = tenantQuery.data
  const config = configQuery.data

  const [name, setName] = useState('')
  const [dataRetentionDays, setDataRetentionDays] = useState<number | null>(null)
  const [saveCallRecordings, setSaveCallRecordings] = useState<boolean | null>(null)

  if (tenantQuery.isLoading || !tenant) {
    return <p className='text-sm text-muted-foreground'>Loading tenant...</p>
  }

  return (
    <div className='space-y-6'>
      <section className='space-y-1'>
        <h1 className='text-3xl font-semibold tracking-tight'>{tenant.name}</h1>
        <p className='text-sm text-muted-foreground'>Tenant ID: {tenant.id}</p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Status</CardTitle>
          <CardDescription>Control access and lifecycle.</CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap items-center gap-3'>
          <Badge>{tenant.status}</Badge>
          <Badge variant='secondary'>{tenant.industry}</Badge>
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              updateStatus.mutate(
                tenant.status === TenantStatus.ACTIVE
                  ? TenantStatus.SUSPENDED
                  : TenantStatus.ACTIVE,
              )
            }
          >
            {tenant.status === TenantStatus.ACTIVE ? 'Suspend' : 'Activate'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Setup: Business & Retention</CardTitle>
          <CardDescription>
            Business identity and data handling policies controlled by super admin.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='tenant-name'>Workspace Name</Label>
            <Input
              id='tenant-name'
              value={name || tenant.name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label htmlFor='retention-days'>Data Retention (Days)</Label>
              <Input
                id='retention-days'
                type='number'
                min={1}
                max={365}
                value={dataRetentionDays ?? tenant.dataRetentionDays}
                onChange={(event) => setDataRetentionDays(Number(event.target.value))}
              />
            </div>
            <div className='flex items-center justify-between rounded-md border p-3'>
              <div className='space-y-0.5'>
                <p className='text-sm font-medium'>Save Call Recordings</p>
                <p className='text-xs text-muted-foreground'>Allow recording storage and download.</p>
              </div>
              <Switch
                checked={saveCallRecordings ?? tenant.saveCallRecordings}
                onCheckedChange={setSaveCallRecordings}
              />
            </div>
          </div>
          <div className='space-y-2'>
            <Label>Status</Label>
            <Select
              value={tenant.status}
              onValueChange={(value) => updateStatus.mutate(value as TenantStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ACTIVE'>ACTIVE</SelectItem>
                <SelectItem value='TRIAL'>TRIAL</SelectItem>
                <SelectItem value='SUSPENDED'>SUSPENDED</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() =>
              updateTenant.mutate(
                {
                  name: name || tenant.name,
                  dataRetentionDays: dataRetentionDays ?? tenant.dataRetentionDays,
                  saveCallRecordings: saveCallRecordings ?? tenant.saveCallRecordings,
                },
                {
                  onSuccess: () => toast.success('Tenant setup saved'),
                  onError: () => toast.error('Failed to save tenant setup'),
                },
              )
            }
            disabled={updateTenant.isPending}
          >
            Save Tenant Setup
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Setup: AI Agent (Super Admin Only)</CardTitle>
          <CardDescription>
            Control language, provider stack, behavior flags, and prompt strategy for this tenant.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {configQuery.isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading AI setup...</p>
          ) : null}
          {configQuery.isError || !config ? (
            <p className='text-sm text-destructive'>Failed to load AI setup.</p>
          ) : (
            <SuperAdminAgentSetup
              config={config}
              saving={updateConfig.isPending}
              onSave={(payload) =>
                updateConfig.mutate(payload, {
                  onSuccess: () => toast.success('AI setup saved'),
                  onError: () => toast.error('Failed to save AI setup'),
                })
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SuperAdminAgentSetup({
  config,
  saving,
  onSave,
}: {
  config: {
    systemPrompt: string
    greeting: string | null
    fallbackMessage: string | null
    language: string
    sttProvider: string
    ttsProvider: string
    llmProvider: string
    telephonyProvider: string
    maxCallDuration: number
    enableMemory: boolean
    enableExtraction: boolean
    enableRecording: boolean
  }
  saving: boolean
  onSave: (payload: {
    systemPrompt: string
    greeting: string
    fallbackMessage: string
    language: string
    sttProvider: string
    ttsProvider: string
    llmProvider: string
    telephonyProvider: string
    maxCallDuration: number
    enableMemory: boolean
    enableExtraction: boolean
    enableRecording: boolean
  }) => void
}) {
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt ?? '')
  const [greeting, setGreeting] = useState(config.greeting ?? '')
  const [fallbackMessage, setFallbackMessage] = useState(config.fallbackMessage ?? '')
  const [language, setLanguage] = useState(config.language ?? 'en-IN')
  const [sttProvider, setSttProvider] = useState(config.sttProvider ?? 'DEEPGRAM')
  const [ttsProvider, setTtsProvider] = useState(config.ttsProvider ?? 'ELEVEN_LABS')
  const [llmProvider, setLlmProvider] = useState(config.llmProvider ?? 'OPENAI')
  const [telephonyProvider, setTelephonyProvider] = useState(config.telephonyProvider ?? 'EXOTEL')
  const [maxCallDuration, setMaxCallDuration] = useState(config.maxCallDuration ?? 300)
  const [enableMemory, setEnableMemory] = useState(config.enableMemory ?? true)
  const [enableExtraction, setEnableExtraction] = useState(config.enableExtraction ?? true)
  const [enableRecording, setEnableRecording] = useState(config.enableRecording ?? false)

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label>System Prompt</Label>
        <Textarea rows={6} value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} />
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <Label>Greeting</Label>
          <Input value={greeting} onChange={(event) => setGreeting(event.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label>Fallback Message</Label>
          <Input value={fallbackMessage} onChange={(event) => setFallbackMessage(event.target.value)} />
        </div>
      </div>
      <div className='grid gap-4 sm:grid-cols-2'>
        <ProviderSelect label='Language' value={language} onChange={setLanguage} options={['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN']} />
        <div className='space-y-2'>
          <Label>Max Call Duration (seconds)</Label>
          <Input type='number' min={60} max={3600} value={maxCallDuration} onChange={(event) => setMaxCallDuration(Number(event.target.value))} />
        </div>
        <ProviderSelect label='STT Provider' value={sttProvider} onChange={setSttProvider} options={['DEEPGRAM', 'SARVAM']} />
        <ProviderSelect label='TTS Provider' value={ttsProvider} onChange={setTtsProvider} options={['ELEVEN_LABS', 'SARVAM', 'GOOGLE']} />
        <ProviderSelect label='LLM Provider' value={llmProvider} onChange={setLlmProvider} options={['OPENAI', 'GROQ']} />
        <ProviderSelect label='Telephony Provider' value={telephonyProvider} onChange={setTelephonyProvider} options={['EXOTEL', 'PLIVO', 'TWILIO']} />
      </div>
      <div className='grid gap-3 sm:grid-cols-3'>
        <FlagToggle title='Memory' checked={enableMemory} onCheckedChange={setEnableMemory} />
        <FlagToggle title='Extraction' checked={enableExtraction} onCheckedChange={setEnableExtraction} />
        <FlagToggle title='Recording' checked={enableRecording} onCheckedChange={setEnableRecording} />
      </div>
      <Button
        disabled={saving}
        onClick={() =>
          onSave({
            systemPrompt,
            greeting,
            fallbackMessage,
            language,
            sttProvider,
            ttsProvider,
            llmProvider,
            telephonyProvider,
            maxCallDuration,
            enableMemory,
            enableExtraction,
            enableRecording,
          })
        }
      >
        Save AI Setup
      </Button>
    </div>
  )
}

function ProviderSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function FlagToggle({
  title,
  checked,
  onCheckedChange,
}: {
  title: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <div className='flex items-center justify-between rounded-md border p-3'>
      <p className='text-sm font-medium'>{title}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
