export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  RESIDENT: 'resident',
  SERVICE_STAFF: 'service_staff',
}

export const roleLabels = {
  [UserRole.ADMIN]: 'ادمین',
  [UserRole.MANAGER]: 'مدیر',
  [UserRole.RESIDENT]: 'ساکن',
  [UserRole.SERVICE_STAFF]: 'کارکنان خدمات',
}

// Roles an admin or manager may grant. Admin is intentionally excluded: the
// backend rejects it and refuses to change an existing admin's role.
export const assignableRoles = [UserRole.RESIDENT, UserRole.MANAGER, UserRole.SERVICE_STAFF]
