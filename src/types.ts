export interface Course {
  id: string;
  name: string;
  description?: string;
  instructorId?: string;
}

export interface Subject {
  id: string;
  courseId: string;
  name: string;
  description?: string;
  instructorId?: string;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  courseIds: string[];
  instructorId?: string;
}

export interface Class {
  id: string;
  subjectId: string;
  date: string;
  content?: string;
  status: 'planned' | 'completed';
  instructorId?: string;
}

export interface Attendance {
  id: string;
  classId: string;
  studentId: string;
  status: 'present' | 'absent' | 'justified';
  date: string;
  instructorId?: string;
}

export interface Report {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  performance?: number;
  behavior?: string;
  technical?: string;
  evolution?: string;
  instructorId?: string;
}

export type OperationType = 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
