import { useMemo, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRight,
  CircleCheckBig,
  Clock3,
  Database,
  Headphones,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { useTenantAgentConfig, useUpdateTenantAgentConfig } from '@/hooks/tenant/use-tenant-data'
import { useTenant, useUpdateTenant, useUpdateTenantStatus } from '@/hooks/tenants/use-tenants'
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

  const summaryItems = useMemo(() => {
    if (!tenant) return []

    return [
      {
        label: 'Status',
        value: tenant.status,
        icon:
          tenant.status === TenantStatus.ACTIVE ? (
            <CircleCheckBig className='size-4 text-emerald-500' />
          ) : tenant.status === TenantStatus.TRIAL ? (
            <Clock3 className='size-4 text-amber-500' />
          ) : (
            <ShieldAlert className='size-4 text-rose-500' />
          ),
      },
      {
        label: 'Retention',
        value: `${tenant.dataRetentionDays} days`,
        icon: <Database className='size-4 text-primary' />,
      },
      {
        label: 'Recordings',
        value: tenant.saveCallRecordings ? 'Stored' : 'Disabled',
        icon: <Headphones className='size-4 text-primary' />,
      },
    ]
  }, [tenant])

  if (tenantQuery.isLoading || !tenant) {
    return <p className='text-sm text-muted-foreground'>Loading workspace...</p>
  }

  return (
    <div className='space-y-6'>
      <section className='grid gap-4 xl:grid-cols-[1.35fr_0.85fr]'>
        <Card className='border-border/70 bg-gradient-to-br from-primary/5 via-background to-background'>
          <CardHeader className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground'>
                Workspace admin
              </p>
              <div className='space-y-2'>
                <CardTitle className='text-3xl tracking-tight'>{tenant.name}</CardTitle>
                <CardDescription className='max-w-2xl text-sm leading-6'>
                  Control lifecycle, data policy, and runtime defaults for this tenant before
                  operators work inside the workspace.
                </CardDescription>
              </div>
              <p className='text-xs text-muted-foreground'>Tenant ID: {tenant.id}</p>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button asChild>
                <Link to='/tenant/$tenantId/dashboard' params={{ tenantId }}>
                  Open Workspace
                </Link>
              </Button>
              <Button asChild variant='outline'>
                <Link to='/super-admin/tenants'>Back to Registry</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Workspace summary</CardTitle>
            <CardDescription>Current status and policy settings at a glance.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {summaryItems.map((item) => (
              <div
                key={item.label}
                className='flex items-center justify-between rounded-xl border border-border/70 px-4 py-3'
              >
                <div className='flex items-center gap-3'>
                  <div className='rounded-lg border border-border/70 p-2'>{item.icon}</div>
                  <div>
                    <p className='text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                      {item.label}
                    </p>
                    <p className='text-sm font-medium'>{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className='rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground'>
              Slug: {tenant.slug} · Industry: {tenant.industry} · Plan: {tenant.plan}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Lifecycle and data policy</CardTitle>
          <CardDescription>
            Keep business identity, retention, and storage behavior clear for this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='tenant-name'>Workspace name</Label>
                <Input
                  id='tenant-name'
                  value={name || tenant.name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                <div className='space-y-2'>
                  <Label htmlFor='retention-days'>Data retention (days)</Label>
                  <Input
                    id='retention-days'
                    type='number'
                    min={1}
                    max={365}
                    value={dataRetentionDays ?? tenant.dataRetentionDays}
                    onChange={(event) => setDataRetentionDays(Number(event.target.value))}
                  />
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
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-muted/20 p-4'>
              <div className='flex items-center justify-between gap-4'>
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>Store call recordings</p>
                  <p className='text-xs text-muted-foreground'>
                    Allow recording persistence and download for this workspace.
                  </p>
                </div>
                <Switch
                  checked={saveCallRecordings ?? tenant.saveCallRecordings}
                  onCheckedChange={setSaveCallRecordings}
                />
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <Button
              onClick={() =>
                updateTenant.mutate(
                  {
                    name: name || tenant.name,
                    dataRetentionDays: dataRetentionDays ?? tenant.dataRetentionDays,
                    saveCallRecordings: saveCallRecordings ?? tenant.saveCallRecordings,
                  },
                  {
                    onSuccess: () => toast.success('Workspace policy saved'),
                    onError: () => toast.error('Failed to save workspace policy'),
                  },
                )
              }
              disabled={updateTenant.isPending}
            >
              Save Policy
            </Button>
            <Button
              variant='outline'
              onClick={() =>
                updateStatus.mutate(
                  tenant.status === TenantStatus.ACTIVE
                    ? TenantStatus.SUSPENDED
                    : TenantStatus.ACTIVE,
                )
              }
            >
              {tenant.status === TenantStatus.ACTIVE ? 'Suspend Workspace' : 'Activate Workspace'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI runtime configuration</CardTitle>
          <CardDescription>
            Choose the provider stack, prompts, and behavior flags that shape live conversations.
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
                  onSuccess: () => toast.success('AI runtime saved'),
                  onError: () => toast.error('Failed to save AI runtime'),
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
  const [telephonyProvider, setTelephonyProvider] = useState(
    config.telephonyProvider ?? 'EXOTEL',
  )
  const [maxCallDuration, setMaxCallDuration] = useState(config.maxCallDuration ?? 300)
  const [enableMemory, setEnableMemory] = useState(config.enableMemory ?? true)
  const [enableExtraction, setEnableExtraction] = useState(config.enableExtraction ?? true)
  const [enableRecording, setEnableRecording] = useState(config.enableRecording ?? false)

  return (
    <div className='space-y-5'>
      <div className='grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_0.8fr]'>
        <div className='space-y-2'>
          <Label>System prompt</Label>
          <Textarea
            rows={10}
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
          />
        </div>
        <div className='rounded-xl border border-border/70 bg-muted/20 p-4'>
          <p className='text-sm font-medium'>Runtime toggles</p>
          <p className='mt-1 text-xs text-muted-foreground'>
            Keep only the features that are required for this tenant's production flow.
          </p>
          <div className='mt-4 space-y-3'>
            <FlagToggle title='Memory' checked={enableMemory} onCheckedChange={setEnableMemory} />
            <FlagToggle
              title='Extraction'
              checked={enableExtraction}
              onCheckedChange={setEnableExtraction}
            />
            <FlagToggle
              title='Recording'
              checked={enableRecording}
              onCheckedChange={setEnableRecording}
            />
          </div>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <div className='space-y-2'>
          <Label>Greeting</Label>
          <Input value={greeting} onChange={(event) => setGreeting(event.target.value)} />
        </div>
        <div className='space-y-2'>
          <Label>Fallback message</Label>
          <Input
            value={fallbackMessage}
            onChange={(event) => setFallbackMessage(event.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label>Max call duration (seconds)</Label>
          <Input
            type='number'
            min={60}
            max={3600}
            value={maxCallDuration}
            onChange={(event) => setMaxCallDuration(Number(event.target.value))}
          />
        </div>
        <ProviderSelect
          label='Language'
          value={language}
          onChange={setLanguage}
          options={['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN']}
        />
        <ProviderSelect
          label='STT provider'
          value={sttProvider}
          onChange={setSttProvider}
          options={['DEEPGRAM', 'SARVAM']}
        />
        <ProviderSelect
          label='TTS provider'
          value={ttsProvider}
          onChange={setTtsProvider}
          options={['ELEVEN_LABS', 'SARVAM', 'GOOGLE']}
        />
        <ProviderSelect
          label='LLM provider'
          value={llmProvider}
          onChange={setLlmProvider}
          options={['OPENAI', 'GROQ']}
        />
        <ProviderSelect
          label='Telephony provider'
          value={telephonyProvider}
          onChange={setTelephonyProvider}
          options={['EXOTEL', 'PLIVO', 'TWILIO']}
        />
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
        Save AI Runtime
        <ArrowRight className='ml-2 size-4' />
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
    <div className='flex items-center justify-between rounded-lg border border-border/70 bg-background px-3 py-2'>
      <p className='text-sm font-medium'>{title}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
