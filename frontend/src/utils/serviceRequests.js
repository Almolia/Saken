// The API sends capitalised statuses ("Pending"/"Assigned"/"Completed").
// Everything in the UI compares against these normalised lowercase values.
export const RequestStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
}

export function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase()
}

export function isCompleted(serviceRequest) {
  return normalizeStatus(serviceRequest?.status) === RequestStatus.COMPLETED
}

// Filtering. "all" is the frontend's own idea of "no filter" and is never sent
// to the API; the rest map onto the capitalised values the endpoint stores.
export const StatusFilter = {
  ALL: 'all',
  PENDING: RequestStatus.PENDING,
  ASSIGNED: RequestStatus.ASSIGNED,
  COMPLETED: RequestStatus.COMPLETED,
}

const apiStatusValues = {
  [StatusFilter.PENDING]: 'Pending',
  [StatusFilter.ASSIGNED]: 'Assigned',
  [StatusFilter.COMPLETED]: 'Completed',
}

// The query value for ?status=, or '' for "all", which the API client omits.
export function toApiStatus(statusFilter) {
  return apiStatusValues[normalizeStatus(statusFilter)] || ''
}

export const statusFilterOptions = [
  {
    value: StatusFilter.ALL,
    label: 'همه',
    emptyTitle: 'هنوز درخواستی ثبت نشده است',
    emptyBody: 'درخواست‌های خدمات ثبت‌شده توسط ساکنان در این بخش نمایش داده می‌شود.',
  },
  {
    value: StatusFilter.PENDING,
    label: 'در انتظار بررسی',
    emptyTitle: 'درخواست در انتظار بررسی وجود ندارد',
    emptyBody: 'همه درخواست‌ها ارجاع داده شده‌اند؛ فعلاً کاری برای تخصیص باقی نمانده است.',
  },
  {
    value: StatusFilter.ASSIGNED,
    label: 'ارجاع‌شده',
    emptyTitle: 'درخواست ارجاع‌شده‌ای وجود ندارد',
    emptyBody: 'درخواستی که به کارکنان خدمات ارجاع شده و هنوز تکمیل نشده باشد پیدا نشد.',
  },
  {
    value: StatusFilter.COMPLETED,
    label: 'تکمیل‌شده',
    emptyTitle: 'درخواست تکمیل‌شده‌ای وجود ندارد',
    emptyBody: 'هنوز هیچ درخواستی توسط کارکنان خدمات تکمیل نشده است.',
  },
]

// Sorting by creation date. The values are the API's ?ordering= parameter.
export const SortOrder = {
  NEWEST: '-created_at',
  OLDEST: 'created_at',
}

export const sortOrderOptions = [
  { value: SortOrder.NEWEST, label: 'جدیدترین ابتدا' },
  { value: SortOrder.OLDEST, label: 'قدیمی‌ترین ابتدا' },
]

// The summary endpoint keys its counts by the capitalised API status.
export function countForStatus(summary, statusFilter) {
  if (!summary) return null

  if (normalizeStatus(statusFilter) === StatusFilter.ALL) {
    const total = Object.values(summary).reduce(
      (sum, value) => sum + (Number(value) || 0),
      0,
    )
    return total
  }

  const value = summary[toApiStatus(statusFilter)]
  return Number(value) || 0
}

// Settlement. These values are sent to the API verbatim, so they stay uppercase.
export const PaymentMethod = {
  EQUAL_SPLIT: 'EQUAL_SPLIT',
  REQUESTER_ONLY: 'REQUESTER_ONLY',
  BUILDING_WALLET: 'BUILDING_WALLET',
}

export const paymentMethodLabels = {
  [PaymentMethod.EQUAL_SPLIT]: 'تقسیم مساوی بین واحدها',
  [PaymentMethod.REQUESTER_ONLY]: 'بر عهده درخواست‌دهنده',
  [PaymentMethod.BUILDING_WALLET]: 'از صندوق ساختمان',
}

export const paymentMethodOptions = [
  {
    value: PaymentMethod.EQUAL_SPLIT,
    label: paymentMethodLabels[PaymentMethod.EQUAL_SPLIT],
    description: 'هزینه به‌طور مساوی بین همه واحدها تقسیم و به بدهی آن‌ها اضافه می‌شود.',
  },
  {
    value: PaymentMethod.REQUESTER_ONLY,
    label: paymentMethodLabels[PaymentMethod.REQUESTER_ONLY],
    description: 'کل هزینه به بدهی واحد ثبت‌کننده درخواست اضافه می‌شود.',
  },
  {
    value: PaymentMethod.BUILDING_WALLET,
    label: paymentMethodLabels[PaymentMethod.BUILDING_WALLET],
    description: 'هزینه از موجودی صندوق ساختمان کسر می‌شود.',
  },
]

// A request is settleable once the work is done and no cost has been routed yet.
export function isSettleable(serviceRequest) {
  return isCompleted(serviceRequest) && !serviceRequest?.is_settled
}
