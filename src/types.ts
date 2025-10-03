/**
 * Creates a union of types that share a common discriminating property.
 *
 * @example
 * ```ts
 * type HydratedSubject = TaggedUnion<
 *   "subjectType",
 *   {
 *     system: { id: string; title: string }
 *     user: { id: string; fullName: string; email: string }
 *   }
 * >;
 *
 * // The resulting type will be the same as:
 * type HydratedSubject =
 *   | { subjectType: "system"; id: string; title: string }
 *   | { subjectType: "user"; id: string; fullName: string; email: string }
 * ```
 */
export type TaggedUnion<
  TypeIdentifier extends string,
  Types extends Record<string, unknown>
> = {
  [Name in keyof Types]: Record<TypeIdentifier, Name> & Types[Name];
}[keyof Types];

/**
 * Extends a base type given a discriminating property and a map of additional details.
 *
 * @example
 * ```ts
 * type Base = { id: string; subjectType: "user" | "system"; };
 *
 * type DetailMap = {
 *   system: { title: string; description: string };
 *   user: { email: string; fullName: string };
 * };
 *
 * type HydratedSubject = DiscriminatedMerge<Base, "subjectType", DetailMap>;
 *
 * // The resulting type will be the same as:
 * type HydratedSubject =
 *   | { subjectType: "system"; id: string; title: string; description: string }
 *   | { subjectType: "user"; id: string; email: string; fullName: string }
 * ```
 */
export type DiscriminatedMerge<
  Base,
  TypeIdentifier extends keyof Base & string,
  DetailMap extends Record<keyof DetailMap, unknown>
> = Base & TaggedUnion<TypeIdentifier, DetailMap>;
