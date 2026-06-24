import type { UserRole } from "./api";

export interface Permission {
  canView: boolean;
  canEdit: boolean;
  canManageTeam: boolean;
  canViewMedications: boolean;
  canLogMedications: boolean;
  canViewRecords: boolean;
  canCreateRecords: boolean;
  canViewSummary: boolean;
  canViewEmergency: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission> = {
  CURATOR: {
    canView: true,
    canEdit: true,
    canManageTeam: true,
    canViewMedications: true,
    canLogMedications: true,
    canViewRecords: true,
    canCreateRecords: true,
    canViewSummary: true,
    canViewEmergency: true,
  },
  FAMILY: {
    canView: true,
    canEdit: false,
    canManageTeam: false,
    canViewMedications: true,
    canLogMedications: false,
    canViewRecords: true,
    canCreateRecords: false,
    canViewSummary: true,
    canViewEmergency: true,
  },
  CAREGIVER: {
    canView: true,
    canEdit: false,
    canManageTeam: false,
    canViewMedications: true,
    canLogMedications: true,
    canViewRecords: true,
    canCreateRecords: true,
    canViewSummary: false,
    canViewEmergency: true,
  },
  CARE_RECEIVER: {
    canView: true,
    canEdit: false,
    canManageTeam: false,
    canViewMedications: true,
    canLogMedications: false,
    canViewRecords: true,
    canCreateRecords: true,
    canViewSummary: false,
    canViewEmergency: true,
  },
};
