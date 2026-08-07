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
