import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfileAvatar, { parseAvatarConfig } from "@/components/ProfileAvatar";
import { DEFAULT_DTT_COLORS, parseDttColors } from "@/lib/dttIcon";

describe("private DTT icons", () => {
  it("validates each color and fills missing values", () => {
    expect(parseDttColors(null)).toEqual(DEFAULT_DTT_COLORS);
    expect(parseDttColors(["blue", "invalid", "mint"])).toEqual(["blue", "silver", "mint"]);
  });
  it("accepts arbitrary full-spectrum hex colors but rejects CSS injection", () => {
    expect(parseDttColors(["#123abc", "#ffffff", "url(evil)"])).toEqual(["#123abc", "#ffffff", "pink"]);
  });
  it("uses DTT rather than a generic face before a selfie exists", () => {
    const { container } = render(<ProfileAvatar />);
    expect(container.querySelectorAll("text")).toHaveLength(3);
    expect(container.querySelector("path")).toBeNull();
  });
  it("renders custom saved colors as validated SVG fills", () => {
    const { container } = render(<ProfileAvatar config={{ useDttIcon: true, dttLetterColors: ["#abcdef", "#123456", "#fedcba"] }} />);
    expect(container.querySelector("text")).toHaveAttribute("fill", "#abcdef");
  });
  it("preserves saved per-letter choices", () => {
    const stored = JSON.parse(JSON.stringify({ useDttIcon: true, dttLetterColors: ["gold", "blue", "red"] }));
    expect(parseAvatarConfig(stored).dttLetterColors).toEqual(["gold", "blue", "red"]);
  });
  it("renders all three letters in their chosen colors without a photo", () => {
    render(<ProfileAvatar config={{ useDttIcon: true, dttLetterColors: ["gold", "blue", "mint"] }} label="Private" />);
    const icon = screen.getByRole("img", { name: "Private's DTT icon" });
    expect(icon.querySelector("img")).toBeNull();
    const letters = icon.querySelectorAll("text");
    expect(Array.from(letters).map((letter) => letter.textContent).join("")).toBe("DTT");
    expect(letters[0]).toHaveClass("dtt-color-gold");
    expect(letters[1]).toHaveClass("dtt-color-blue");
    expect(letters[2]).toHaveClass("dtt-color-mint");
  });
});