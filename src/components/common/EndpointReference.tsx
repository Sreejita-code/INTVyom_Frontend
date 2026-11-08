import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { Button } from "@/components/ui/button";

export interface ReferenceField {
  name: string;
  type: string;
  required?: boolean;
  nullable?: boolean;
  description: string;
}

export interface ReferenceError {
  status: number;
  cause: string;
  action: string;
}

export interface ReferenceSample {
  label: string;
  body: string;
}

export interface EndpointReferenceData {
  request: ReferenceField[];
  response: ReferenceField[];
  errors: ReferenceError[];
  samples: ReferenceSample[];
}

const FieldTable = ({ caption, fields }: { caption: string; fields: ReferenceField[] }) => (
  <div className="space-y-2">
    <h3 className="text-sm font-semibold text-foreground">{caption}</h3>
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.name} className="border-t border-border align-top">
              <td className="px-3 py-2 font-mono text-foreground">{field.name}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {field.type}
                {field.required ? <span className="ml-2 text-xs">required</span> : null}
                {field.nullable ? <span className="ml-2 text-xs">nullable</span> : null}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{field.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Sample = ({ sample }: { sample: ReferenceSample }) => {
  const { copied, copy } = useCopyToClipboard(1500);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{sample.label}</h3>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Copy ${sample.label} sample`}
          onClick={() => copy(sample.body)}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-lg border border-border bg-background p-4 text-xs font-mono">
        {sample.body}
      </pre>
    </div>
  );
};

/** The payload reference for one endpoint: fields, errors and copyable samples. */
export function EndpointReference({ reference }: { reference: EndpointReferenceData }) {
  return (
    <div className="space-y-8">
      <FieldTable caption="Request body" fields={reference.request} />
      <FieldTable caption="Response data" fields={reference.response} />
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Errors</h3>
        <ul className="space-y-2 text-sm">
          {reference.errors.map((error) => (
            <li key={error.status} className="rounded-lg border border-border p-3">
              <span className="font-mono text-foreground">{error.status}</span>{" "}
              <span className="text-muted-foreground">{error.cause}</span>
              <p className="mt-1 text-xs text-muted-foreground">{error.action}</p>
            </li>
          ))}
        </ul>
      </div>
      {reference.samples.map((sample) => (
        <Sample key={sample.label} sample={sample} />
      ))}
    </div>
  );
}
