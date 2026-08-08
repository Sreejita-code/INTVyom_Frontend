import { ConfigField } from "./ConfigField";
import { FieldSpec } from "./providerCatalog";

/** Reads a spec's value out of a config object, one level of nesting deep (voice_settings). */
export const readField = (config: Record<string, any> | undefined, spec: FieldSpec) =>
  spec.group ? config?.[spec.group]?.[spec.key] : config?.[spec.key];

/** Writes a spec's value back, preserving the rest of the config and any nested group. */
export const writeField = (
  config: Record<string, any> | undefined,
  spec: FieldSpec,
  value: any,
): Record<string, any> => {
  const base = config ?? {};
  if (!spec.group) return { ...base, [spec.key]: value };
  return { ...base, [spec.group]: { ...(base[spec.group] ?? {}), [spec.key]: value } };
};

interface ProviderFieldsProps {
  fields: FieldSpec[];
  config: Record<string, any> | undefined;
  onChange: (nextConfig: Record<string, any>) => void;
  /** Return a sentence when the current selection makes a field inert; undefined when it is live. */
  inertReasonFor?: (spec: FieldSpec) => string | undefined;
}

/** Renders a provider's field specs against its stored config. */
export function ProviderFields({ fields, config, onChange, inertReasonFor }: ProviderFieldsProps) {
  return (
    <>
      {fields.map((spec) => (
        <ConfigField
          key={spec.group ? `${spec.group}.${spec.key}` : spec.key}
          spec={spec}
          value={readField(config, spec)}
          inertReason={inertReasonFor?.(spec)}
          onChange={(value) => onChange(writeField(config, spec, value))}
        />
      ))}
    </>
  );
}
