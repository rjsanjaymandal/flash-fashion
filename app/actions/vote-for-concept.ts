'use server'

import { updateMedusaCustomerData } from '@/lib/medusa-bridge'
import { revalidatePath } from 'next/cache'
import { getMedusaSession } from './medusa-auth'

export async function voteForConcept(conceptId: string) {
  const customer = await getMedusaSession()

  if (!customer) {
    return { error: 'authentication_required', message: 'You must be logged in to vote.' }
  }

  // Check if they already voted (Medusa customer metadata)
  const votedConcepts = (customer.metadata?.voted_concepts as string[]) || []
  if (votedConcepts.includes(conceptId)) {
    return { error: 'already_voted', message: 'You have already voted for this concept.' }
  }

  // Record vote via bridge
  const result = await updateMedusaCustomerData(customer.id, 'vote_concept', {
    concept_id: conceptId,
    customer_id: customer.id
  })

  if (result?.error) {
    return { error: 'failed_vote', message: 'Failed to record your vote.' }
  }

  revalidatePath('/lab')
  return { success: true }
}
