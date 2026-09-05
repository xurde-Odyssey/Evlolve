"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function signInAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const email = getRequiredFormString(formData, "email");
  const password = getRequiredFormString(formData, "password");
  const next = getNextPath(formData);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth?error=${encodeURIComponent("Email or password is incorrect.")}`);
  }

  redirect(next);
}

export async function signUpAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const email = getRequiredFormString(formData, "email");
  const password = getRequiredFormString(formData, "password");
  const displayName = getOptionalFormString(formData, "displayName");
  const timezone = getOptionalFormString(formData, "timezone") ?? "UTC";
  const next = getNextPath(formData);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        timezone,
      },
    },
  });

  if (error) {
    return;
  }

  redirect(next);
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  const email = getRequiredFormString(formData, "email");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return;
  }
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  redirect("/auth");
}

function getRequiredFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing ${key}`);
  }

  return value.trim();
}

function getOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function getNextPath(formData: FormData) {
  const value = getOptionalFormString(formData, "next");

  return value?.startsWith("/") ? value : "/dashboard";
}
