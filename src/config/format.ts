/**
 * @module config/format
 * Substitution for the `{placeholder}` templates in `config.text`.
 */

/**
 * Replaces every `{key}` in `template` with `values[key]`. Unknown
 * placeholders are left alone so a typo is visible in the rendered asset
 * rather than silently blank.
 */
export function format(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
