'use server'

import { revalidatePath } from 'next/cache'
import { getMedusaSession } from './medusa-auth'
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

export async function voteForConcept(conceptId: string) {
  const customer = await getMedusaSession()

  if (!customer) {
    return { error: 'authentication_required', message: 'You must be logged in to vote.' }
  }

  // Check if they already voted (Medusa customer metadata)
  const currentMetadata = customer.metadata || {}
  const votedConcepts = (currentMetadata.voted_concepts as string[]) || []
  if (votedConcepts.includes(conceptId)) {
    return { error: 'already_voted', message: 'You have already voted for this concept.' }
  }

  // Record vote via native Medusa REST call
  votedConcepts.push(conceptId)

  const headers = await getHeaders()
  const res = await fetch(`${BACKEND_URL}/store/customers/me`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      metadata: {
        ...currentMetadata,
        voted_concepts: votedConcepts
      }
    })
  })

  if (!res.ok) {
    return { error: 'failed_vote', message: 'Failed to record your vote.' }
  }

  revalidatePath('/lab')
  return { success: true }
}
