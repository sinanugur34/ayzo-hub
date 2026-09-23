import {
  isRecord,
  readOptionalString,
  readRequiredString,
} from "@/lib/account/validation";

export type InvestigationCaseStatus =
  | "open"
  | "closed";

export type CaseCreateInput = {
  name: string;
  description: string | null;
};

export type CaseUpdateInput = {
  name?: string;
  description?: string | null;
  status?: InvestigationCaseStatus;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCaseUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    uuidPattern.test(value)
  );
}

export function parseCaseCreateInput(
  value: unknown
): CaseCreateInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const name =
    readRequiredString(
      value.name,
      160
    );

  const description =
    readOptionalString(
      value.description,
      5000
    );

  if (!name) {
    return null;
  }

  return {
    name,
    description,
  };
}

export function parseCaseUpdateInput(
  value: unknown
): CaseUpdateInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const update:
    CaseUpdateInput = {};

  let touched =
    false;

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "name"
    )
  ) {
    const name =
      readRequiredString(
        value.name,
        160
      );

    if (!name) {
      return null;
    }

    update.name =
      name;

    touched =
      true;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "description"
    )
  ) {
    const description =
      readOptionalString(
        value.description,
        5000
      );

    if (
      value.description !== null &&
      value.description !== undefined &&
      value.description !== "" &&
      description === null
    ) {
      return null;
    }

    update.description =
      description;

    touched =
      true;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      value,
      "status"
    )
  ) {
    if (
      value.status !== "open" &&
      value.status !== "closed"
    ) {
      return null;
    }

    update.status =
      value.status;

    touched =
      true;
  }

  return touched
    ? update
    : null;
}

export function parseCaseAnalysisLinkInput(
  value: unknown
) {
  if (!isRecord(value)) {
    return null;
  }

  return isCaseUuid(
    value.savedAnalysisId
  )
    ? {
        savedAnalysisId:
          value.savedAnalysisId,
      }
    : null;
}
