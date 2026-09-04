import {
  isRecord,
  readRequiredString,
  readSubjectType,
  type SubjectType,
} from "./validation";

export const annotationColors = [
  "violet",
  "blue",
  "emerald",
  "amber",
  "rose",
  "zinc",
] as const;

export type AnnotationColor =
  (typeof annotationColors)[number];

export type EntityIdentity = {
  network: string;
  subjectType: SubjectType;
  subjectValue: string;
};

export type EntityAnnotationInput =
  EntityIdentity & {
    label: string | null;
    notes: string | null;
    colorKey: AnnotationColor;
  };

type OptionalTextResult =
  | {
      ok: true;
      value: string | null;
    }
  | {
      ok: false;
    };

function readOptionalTextStrict(
  value: unknown,
  maxLength: number
): OptionalTextResult {
  if (
    value === undefined ||
    value === null
  ) {
    return {
      ok: true,
      value: null,
    };
  }

  if (
    typeof value !==
    "string"
  ) {
    return {
      ok: false,
    };
  }

  const trimmed =
    value.trim();

  if (!trimmed) {
    return {
      ok: true,
      value: null,
    };
  }

  if (
    trimmed.length >
    maxLength
  ) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    value: trimmed,
  };
}

function readAnnotationColor(
  value: unknown
): AnnotationColor | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "violet";
  }

  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  return annotationColors.includes(
    value as AnnotationColor
  )
    ? (value as AnnotationColor)
    : null;
}

export function parseEntityIdentity({
  network: rawNetwork,
  subjectType: rawSubjectType,
  subjectValue: rawSubjectValue,
}: {
  network: unknown;
  subjectType: unknown;
  subjectValue: unknown;
}): EntityIdentity | null {
  const network =
    readRequiredString(
      rawNetwork,
      64
    );

  const subjectType =
    readSubjectType(
      rawSubjectType
    );

  const subjectValue =
    readRequiredString(
      rawSubjectValue,
      512
    );

  if (
    !network ||
    !subjectType ||
    !subjectValue
  ) {
    return null;
  }

  return {
    network,
    subjectType,
    subjectValue,
  };
}

export function parseEntityAnnotationInput(
  value: unknown
): EntityAnnotationInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const identity =
    parseEntityIdentity({
      network:
        value.network,
      subjectType:
        value.subjectType,
      subjectValue:
        value.subjectValue,
    });

  if (!identity) {
    return null;
  }

  const label =
    readOptionalTextStrict(
      value.label,
      80
    );

  const notes =
    readOptionalTextStrict(
      value.notes,
      5000
    );

  const colorKey =
    readAnnotationColor(
      value.colorKey
    );

  if (
    !label.ok ||
    !notes.ok ||
    !colorKey
  ) {
    return null;
  }

  /*
   * An annotation must contain
   * something meaningful.
   * DELETE is used to clear both.
   */
  if (
    label.value === null &&
    notes.value === null
  ) {
    return null;
  }

  return {
    ...identity,
    label:
      label.value,
    notes:
      notes.value,
    colorKey,
  };
}
