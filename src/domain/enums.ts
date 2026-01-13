// src/domain/enums.ts
// Scope-locked enums. Do not modify without updating DB constraints + UI + tests.

export enum Department {
    Staffing = "STAFFING",
    CaseManagement = "CASE_MANAGEMENT",
    Billing = "BILLING",
}

/**
 * Stage values are fixed by scope.
 * Important: stage lists are per-department and must be validated.
 */
export enum StaffingStage {
    OpenPending = "OPEN_PENDING",
    RequestContactInfo = "REQUEST_CONTACT_INFO",
    ContactInfoSent = "CONTACT_INFO_SENT",
    ProviderScheduled = "PROVIDER_SCHEDULED",
    Staffed = "STAFFED",
}

export enum CaseManagementStage {
    FollowingUp = "FOLLOWING_UP",
    Complete = "COMPLETE",
}

export enum BillingStage {
    FollowingUp = "FOLLOWING_UP",
    Complete = "COMPLETE",
}

/**
 * Used everywhere for validation, UI dropdowns, and API constraints.
 * This is the single source of truth for allowed stages.
 */
export const STAGES_BY_DEPARTMENT = {
    [Department.Staffing]: [
        StaffingStage.OpenPending,
        StaffingStage.RequestContactInfo,
        StaffingStage.ContactInfoSent,
        StaffingStage.ProviderScheduled,
        StaffingStage.Staffed,
    ],
    [Department.CaseManagement]: [
        CaseManagementStage.FollowingUp,
        CaseManagementStage.Complete,
    ],
    [Department.Billing]: [BillingStage.FollowingUp, BillingStage.Complete],
} as const;

export type AnyStage =
    | StaffingStage
    | CaseManagementStage
    | BillingStage;

/**
 * Drafts are "draft-first". No auto-send without human approval.
 * Draft types listed below cover scope-required scenarios without adding new business rules.
 */
export enum DraftType {
    ExternalReply = "EXTERNAL_REPLY", // general reply to sender/requestor
    StaffingRequestContactInfo = "STAFFING_REQUEST_CONTACT_INFO",
    StaffingStaffedConfirmation = "STAFFING_STAFFED_CONFIRMATION",
    CaseManagementFollowUp = "CASE_MANAGEMENT_FOLLOW_UP",
    BillingFollowUp = "BILLING_FOLLOW_UP",
    AuthorizationFollowUp = "AUTHORIZATION_FOLLOW_UP",
    EscalationInternal = "ESCALATION_INTERNAL", // internal only to dept inboxes
}

export enum DraftStatus {
    Created = "CREATED",
    Edited = "EDITED",
    Approved = "APPROVED",
    Sent = "SENT",
    Discarded = "DISCARDED",
}

/**
 * SLA is fixed by scope (hours).
 */
export const SLA_HOURS_BY_DEPARTMENT: Record<Department, number> = {
    [Department.Staffing]: 2,
    [Department.CaseManagement]: 1,
    [Department.Billing]: 4,
};

/**
 * Escalation email subject prefix is fixed by scope.
 */
export const ESCALATION_SUBJECT_PREFIX = "ESCALATION:";

/**
 * Helper: validate stage belongs to department (use in API + services).
 */
export function isValidStageForDepartment(
    department: Department,
    stage: string
): stage is AnyStage {
    return (STAGES_BY_DEPARTMENT[department] as readonly string[]).includes(stage);
}

/**
 * Helper: get stages for UI dropdowns.
 */
export function getStagesForDepartment(department: Department): readonly AnyStage[] {
    return STAGES_BY_DEPARTMENT[department] as readonly AnyStage[];
}

// src/domain/enums.ts

export type StageForDepartment<D extends Department> =
    D extends Department.Staffing ? StaffingStage :
        D extends Department.CaseManagement ? CaseManagementStage :
            D extends Department.Billing ? BillingStage :
                never;

export type StagesByDepartment = typeof STAGES_BY_DEPARTMENT;

export function assertNever(x: never): never {
    throw new Error(`Unexpected value: ${String(x)}`);
}
