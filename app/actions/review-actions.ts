'use server'

import { revalidatePath } from 'next/cache'
import { uploadOptimizedImage } from './upload-images'
import { getMedusaSession } from './medusa-auth'
import { cookies } from 'next/headers'

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

async function getHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const token = cookieStore.get('medusa_token')?.value
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUBLISHABLE_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export async function submitReview(formData: FormData) {
  const customer = await getMedusaSession()

  if (!customer) {
    return { error: 'You must be logged in to review.' }
  }

  const productId = formData.get('productId') as string
  const rating = Number(formData.get('rating'))
  const comment = formData.get('comment') as string
  const imageFiles = formData.getAll('images') as File[]

  // Optimize Images
  let mediaUrls: string[] = []
  if (imageFiles && imageFiles.length > 0) {
    const uploadPromises = imageFiles
      .filter(file => file.size > 0 && file.type.startsWith('image/'))
      .map(async (file) => {
        try {
          const uploadFormData = new FormData()
          uploadFormData.set('file', file)
          const { mobile } = await uploadOptimizedImage(uploadFormData, 'reviews')
          return mobile
        } catch (err) {
          return null
        }
      })

    const results = await Promise.all(uploadPromises)
    mediaUrls = results.filter(url => url !== null) as string[]
  }

  try {
    const headers = await getHeaders()
    const reviewData = {
      product_id: productId,
      rating,
      content: comment,
      title: "Review",
      reviewer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
      images: mediaUrls // If the plugin supports images
    }

    const response = await fetch(`${BACKEND_URL}/store/product-reviews`, {
      method: 'POST',
      headers,
      body: JSON.stringify(reviewData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Review Submit Error:", errorData)
      return { error: 'Failed to submit review' }
    }

    revalidatePath(`/product/${productId}`)
    return { success: true, message: "Review submitted!" }
  } catch (error) {
    console.error("Failed to post review to backend:", error)
    return { error: 'Failed to submit review' }
  }
}

export async function getReviews(productId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/store/product-reviews?product_id=${productId}`, {
      headers: {
        'x-publishable-api-key': PUBLISHABLE_KEY,
      },
      next: { tags: [`product_reviews_${productId}`], revalidate: 60 }
    })

    if (!response.ok) return []

    const data = await response.json()
    // Map to expected frontend structure
    return (data.reviews || []).map((r: any) => ({
      id: r.id,
      user_name: r.reviewer_name || "Anonymous",
      rating: r.rating,
      comment: r.content,
      created_at: r.created_at,
      is_featured: false,
      reply_text: r.responses?.[0]?.content || null,
      media_urls: r.images || [],
      is_verified: true
    }))
  } catch (error) {
    console.error("Failed to fetch reviews:", error)
    return []
  }
}
