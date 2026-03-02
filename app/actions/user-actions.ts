'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod';
import { updateMedusaCustomerData } from '@/lib/medusa-bridge';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  pronouns: z.string().optional(),
  fit_preference: z.enum(['oversized', 'regular', 'slim', 'fitted', 'none']).optional(),
});

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

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

  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Update Medusa Profile via Bridge
  const res = await updateMedusaCustomerData(user.email!, "update_profile", {
    first_name: name,
    metadata: {
      pronouns,
      fit_preference: fit_preference === 'none' ? null : fit_preference
    }
  })

  if (res.error) {
    console.error('Profile Update Error (Medusa):', res.error)
    return { error: 'Failed to update profile in Medusa.' }
  }

  revalidatePath('/account')
  return { message: 'Profile updated successfully!' }
}
