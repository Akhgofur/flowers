type UpdateDocument = Record<string, unknown>;

/**
 * JSON forms omit empty optional values. Convert that contract into an explicit
 * Mongo update so an admin can clear a formerly populated field as well.
 */
export function setAndUnsetOptionalFields(
  input: UpdateDocument,
  optionalFields: readonly string[]
): { $set: UpdateDocument; $unset?: Record<string, ""> } {
  const $set = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  );
  const $unset = Object.fromEntries(
    optionalFields
      .filter((field) => input[field] === undefined)
      .map((field) => [field, "" as const])
  );

  return Object.keys($unset).length > 0 ? { $set, $unset } : { $set };
}
