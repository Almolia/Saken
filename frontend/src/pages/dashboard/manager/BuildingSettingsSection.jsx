import { Building2, Landmark, Wallet } from 'lucide-react'
import { useToast } from '../../../components/ToastProvider'
import { InputField } from '../../../components/ui/InputField'
import { LoadingBlock } from '../../../components/ui/LoadingBlock'
import { PrimaryButton } from '../../../components/ui/PrimaryButton'
import { ServerError } from '../../../components/ui/ServerError'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { useBuildingSettings } from '../../../hooks/useBuildingSettings'
import { useForm } from '../../../hooks/useForm'
import { managerApi } from '../../../lib/api'
import { validateBuildingSettings } from '../../../lib/validators'
import { formatCurrency } from '../../../utils/helpers'

// Keyed by building id at the call site, so the fields start from the record
// that was loaded instead of needing an effect to resync them.
function BuildingSettingsForm({ building, onSaved }) {
  const { showToast } = useToast()
  const isRegistering = !building

  const form = useForm({
    initialValues: {
      name: building?.name ?? '',
      building_wallet_balance: String(building?.building_wallet_balance ?? ''),
    },
    validate: validateBuildingSettings,
    onSubmit: async (values) => {
      const payload = {
        name: values.name.trim(),
        building_wallet_balance: String(values.building_wallet_balance).trim(),
      }

      try {
        const response = isRegistering
          ? await managerApi.createBuilding(payload)
          : await managerApi.updateBuilding(payload)
        onSaved(response)
        showToast(response?.message || 'اطلاعات ساختمان ذخیره شد.')
      } catch (error) {
        showToast(error.message || 'ذخیره اطلاعات ساختمان ناموفق بود.', 'error')
        // Rethrown so the form also shows the reason inline, next to the fields.
        throw error
      }
    },
  })

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit}>
      <InputField
        label="نام ساختمان"
        name="name"
        type="text"
        value={form.values.name}
        onChange={form.handleChange}
        error={form.errors.name}
        placeholder="مثلاً برج ساکن"
      />
      <InputField
        label="موجودی صندوق ساختمان (تومان)"
        name="building_wallet_balance"
        type="text"
        value={form.values.building_wallet_balance}
        onChange={form.handleChange}
        error={form.errors.building_wallet_balance}
        placeholder="مثلاً 5000000"
        helper="این موجودی هنگام تسویه هزینه‌ی درخواست‌های خدمات از صندوق ساختمان کسر می‌شود."
      />
      <ServerError error={form.serverError} />
      <PrimaryButton loading={form.loading}>
        {isRegistering ? 'ثبت اطلاعات ساختمان' : 'ذخیره تغییرات'}
      </PrimaryButton>
    </form>
  )
}

export function BuildingSettingsSection() {
  const { building, loading, error, missing, retry, applyBuilding } = useBuildingSettings()

  return (
    <>
      <section className="admin-hero overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300/60 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-sm font-bold text-teal-200">تنظیمات ساختمان</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            اطلاعات کلی ساختمان
          </h2>
          <p className="mt-4 text-sm leading-8 text-slate-300">
            نام ساختمان و موجودی صندوق مشترک را در این بخش نگه دارید؛ تعداد واحدها از فهرست واحدها محاسبه می‌شود.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="کل واحدها"
          value={loading || !building ? '—' : building.total_units}
          icon={Building2}
          tone="teal"
        />
        <SummaryCard
          title="موجودی صندوق ساختمان"
          value={loading || !building ? '—' : formatCurrency(building.building_wallet_balance)}
          icon={Wallet}
          tone="emerald"
        />
      </section>

      <section
        className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60"
        aria-labelledby="building-settings-title"
      >
        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-teal-600" />
            <h2 id="building-settings-title" className="text-xl font-black text-slate-950">
              {missing ? 'ثبت اطلاعات ساختمان' : 'ویرایش اطلاعات ساختمان'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {missing
              ? 'هنوز اطلاعات ساختمان ثبت نشده است؛ برای شروع، نام و موجودی صندوق را وارد کنید.'
              : 'تغییرات پس از ذخیره بلافاصله در سراسر سامانه اعمال می‌شود.'}
          </p>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : error ? (
          <div className="space-y-4 p-6">
            <ServerError error={error} />
            <button
              type="button"
              onClick={retry}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              تلاش مجدد
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <BuildingSettingsForm
              key={building?.id ?? 'new'}
              building={building}
              onSaved={applyBuilding}
            />
          </div>
        )}
      </section>
    </>
  )
}
