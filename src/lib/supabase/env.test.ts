import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseServiceEnv } from "./env";

const originalEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  secretKey: process.env.SUPABASE_SECRET_KEY,
};

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalEnv.url);
  restoreEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalEnv.publishableKey);
  restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalEnv.serviceRoleKey);
  restoreEnv("SUPABASE_SECRET_KEY", originalEnv.secretKey);
});

describe("getSupabaseServiceEnv", () => {
  it("treats example credentials as unconfigured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key";
    delete process.env.SUPABASE_SECRET_KEY;

    expect(getSupabaseServiceEnv()).toBeNull();
  });

  it("uses a configured secret key if the service-role value is a placeholder", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_configured";

    expect(getSupabaseServiceEnv()).toEqual({
      url: "https://project.supabase.co",
      key: "sb_secret_configured",
    });
  });
});
