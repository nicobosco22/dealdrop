import { describe, expect, it } from "vitest";
import { isOwnerCookie, ownerMode, sameText, tokenFor } from "./owner-token";

const prod = { OWNER_PASSWORD: "correct horse", NODE_ENV: "production" };

describe("ownerMode", () => {
  it("uses the password when one is set", () => {
    expect(ownerMode(prod)).toBe("password");
    expect(ownerMode({ OWNER_PASSWORD: "x", NODE_ENV: "development" })).toBe("password");
  });

  it("is open on your own computer with no password", () => {
    expect(ownerMode({ NODE_ENV: "development" })).toBe("open");
  });

  it("is locked on the public site with no password, never open", () => {
    expect(ownerMode({ NODE_ENV: "production" })).toBe("locked");
    expect(ownerMode({ OWNER_PASSWORD: "   ", NODE_ENV: "production" })).toBe("locked");
  });
});

describe("isOwnerCookie", () => {
  it("accepts only the cookie made from the right password", () => {
    expect(isOwnerCookie(tokenFor("correct horse"), prod)).toBe(true);
    expect(isOwnerCookie(tokenFor("wrong horse"), prod)).toBe(false);
    expect(isOwnerCookie("correct horse", prod)).toBe(false); // the raw password is not a valid cookie
    expect(isOwnerCookie(undefined, prod)).toBe(false);
    expect(isOwnerCookie("", prod)).toBe(false);
  });

  it("lets nobody in on a public site that has no password", () => {
    expect(isOwnerCookie(tokenFor(""), { NODE_ENV: "production" })).toBe(false);
    expect(isOwnerCookie("anything", { NODE_ENV: "production" })).toBe(false);
  });

  it("treats everyone as the owner on your own computer with no password", () => {
    expect(isOwnerCookie(undefined, { NODE_ENV: "development" })).toBe(true);
  });
});

describe("tokenFor and sameText", () => {
  it("never puts the password itself in the cookie", () => {
    expect(tokenFor("correct horse")).not.toContain("correct");
    expect(tokenFor("correct horse")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("compares text safely", () => {
    expect(sameText("abc", "abc")).toBe(true);
    expect(sameText("abc", "abd")).toBe(false);
    expect(sameText("abc", "abcd")).toBe(false);
  });
});
