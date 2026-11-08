import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EndpointReference } from "@/components/common/EndpointReference";

const reference = {
  request: [{ name: "text", type: "string", required: true, description: "Text to speak. 1 to 5000 characters." }],
  response: [{ name: "audio_base64", type: "string", nullable: false, description: "Base64 audio." }],
  errors: [{ status: 422, cause: "Empty text.", action: "Enter some text." }],
  samples: [{ label: "Request", body: '{"text":"hi"}' }],
};

describe("EndpointReference", () => {
  it("lists each request field with type and required flag", () => {
    render(<EndpointReference reference={reference} />);
    const row = screen.getByText("text").closest("tr");
    expect(row).toHaveTextContent("string");
    expect(row).toHaveTextContent("required");
  });

  it("flags nullable response fields", () => {
    const nullable = {
      ...reference,
      response: [{ name: "model", type: "string", nullable: true, description: "Model id." }],
    };
    render(<EndpointReference reference={nullable} />);
    expect(screen.getByText("model").closest("tr")).toHaveTextContent("nullable");
  });

  it("lists every error status with its cause", () => {
    render(<EndpointReference reference={reference} />);
    expect(screen.getByText("422")).toBeInTheDocument();
    expect(screen.getByText("Empty text.")).toBeInTheDocument();
  });

  it("offers a copy button for each sample", () => {
    render(<EndpointReference reference={reference} />);
    expect(screen.getByRole("button", { name: "Copy Request sample" })).toBeInTheDocument();
  });
});
