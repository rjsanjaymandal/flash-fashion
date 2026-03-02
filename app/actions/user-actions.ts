'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod';
import { getMedusaSession } from './medusa-auth';
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"

async function getHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('medusa_token')?.value
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  pronouns: z.string().optional(),
  fit_preference: z.enum(['oversized', 'regular', 'slim', 'fitted', 'none']).optional(),
});

export async function updateProfile(formData: FormData) {
  const customer = await getMedusaSession()

  if (!customer) {
    return { error: 'Not authenticated' }
  }

  const rawData = {
    name: formData.get('name'),
    pronouns: formData.get('pronouns'),
    fit_preference: formData.get('fit_preference'),
  };

  const parsed = profileSchema.safeParse(rawData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, pronouns, fit_preference } = parsed.data;

  const currentMetadata = customer.metadata || {}

  // Update Medusa Profile natively via REST
  const headers = await getHeaders()
  const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      first_name: name,
      metadata: {
        ...currentMetadata,
        pronouns,
        fit_preference: fit_preference === 'none' ? null : fit_preference
      }
    })
  })

  if (!res.ok) {
    console.error('Profile Update Error (Medusa):', await res.text())
    return { error: 'Failed to update profile in Medusa.' }
  }

  revalidatePath('/account')
  return { message: 'Profile updated successfully!' }
}
