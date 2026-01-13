import {
    AnyStage,
    Department,
    DraftStatus,
    DraftType,
    isValidStageForDepartment,
} from "./enums";

export function assertDepartment(dept: string): asserts dept is Department {
    if (!Object.values(Department).includes(dept as Department)) {
        throw new Error(`Invalid department: ${dept}`);
    }
}

export function assertStage(dept: Department, stage: string): asserts stage is AnyStage {
    if (!isValidStageForDepartment(dept, stage)) {
        throw new Error(`Invalid stage "${stage}" for department "${dept}"`);
    }
}

export function assertDraftType(t: string): asserts t is DraftType {
    if (!Object.values(DraftType).includes(t as DraftType)) {
        throw new Error(`Invalid draftType: ${t}`);
    }
}

export function assertDraftStatus(s: string): asserts s is DraftStatus {
    if (!Object.values(DraftStatus).includes(s as DraftStatus)) {
        throw new Error(`Invalid draft status: ${s}`);
    }
}

const allowedTransitions: Record<DraftStatus, DraftStatus[]> = {
    [DraftStatus.Created]: [DraftStatus.Edited, DraftStatus.Discarded, DraftStatus.Approved],
    [DraftStatus.Edited]: [DraftStatus.Edited, DraftStatus.Discarded, DraftStatus.Approved],
    [DraftStatus.Approved]: [DraftStatus.Sent, DraftStatus.Discarded],
    [DraftStatus.Sent]: [],
    [DraftStatus.Discarded]: [],
};

export function assertDraftStatusTransition(from: DraftStatus, to: DraftStatus) {
    if (!allowedTransitions[from].includes(to)) {
        throw new Error(`Invalid draft status transition: ${from} -> ${to}`);
    }
}
