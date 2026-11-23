import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { createServerSupabaseClient, getVerifiedUser } from "./supabase/server";
import { hashIdentifier, trustedHeadersIp } from "./upstream";

// Metadata and page rendering share the same identity and authenticated user.
export const getRequestContext = cache(async () => {
  const [headerList, user, supabase] = await Promise.all([headers(), getVerifiedUser(), createServerSupabaseClient()]);
  const identity = hashIdentifier(user?.id ?? trustedHeadersIp(headerList) ?? "anonymous");
  return { headerList, user, supabase, identity };
});
