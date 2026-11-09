import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SuggestionInput } from "@/components/common/SuggestionInput";

describe("SuggestionInput", () => {
  it("does not advertise model and language values as login credentials", () => {
    render(
      <SuggestionInput
        id="tts-language"
        label="Language"
        value=""
        options={["en-US"]}
        onChange={() => {}}
      />,
    );

    expect(screen.getByLabelText("Language")).toHaveAttribute(
      "autocomplete",
      "off",
    );
    expect(screen.getByLabelText("Language")).toHaveAttribute(
      "name",
      "tts-language",
    );
  });
});
