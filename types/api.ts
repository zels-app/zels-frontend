export type UserRole = "CURATOR" | "FAMILY" | "CAREGIVER" | "CARE_RECEIVER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: Pick<User, "id" | "name" | "email" | "role">;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface HealthProfile {
  id: string;
  userId: string;
  name: string;
  birthDate?: string;
  bloodType?: string;
  allergies?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccessControl {
  id: string;
  healthProfileId: string;
  userId: string;
  role: UserRole;
  permissions: string[];
  createdAt: string;
}

export type HealthRecordType = "VITAL" | "SYMPTOM" | "DIARY";

export interface HealthRecord {
  id: string;
  healthProfileId: string;
  type: HealthRecordType;
  data: Record<string, unknown>;
  source: string;
  recordedAt: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  healthProfileId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

export type MedicationLogStatus = "TAKEN" | "MISSED" | "SKIPPED";

export interface MedicationLog {
  id: string;
  medicationId: string;
  status: MedicationLogStatus;
  scheduledAt: string;
  takenAt?: string;
  notes?: string;
}

export type ConditionStatus = "ACTIVE" | "RESOLVED" | "CONTROLLED";

export interface Condition {
  id: string;
  healthProfileId: string;
  name: string;
  status: ConditionStatus;
  diagnosedAt?: string;
  notes?: string;
}

export interface Treatment {
  id: string;
  conditionId: string;
  description: string;
  startDate: string;
  endDate?: string;
}

export interface Exam {
  id: string;
  healthProfileId: string;
  type: string;
  performedAt: string;
  results?: string;
  fileUrl?: string;
}

export interface Checklist {
  id: string;
  healthProfileId: string;
  name: string;
  description?: string;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface AiProcessResponse {
  suggestedType: HealthRecordType;
  data: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

export interface PaginatedQuery {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
}
