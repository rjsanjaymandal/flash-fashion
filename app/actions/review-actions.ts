'use server'

import { updateMedusaCustomerMetadata } from '@/lib/medusa-bridge'
import { revalidatePath } from 'next/cache'
import { uploadOptimizedImage } from './upload-images'
import { getMedusaSession } from './medusa-auth'

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
  if (imageFiles.length > 0) {
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

  const reviewData = {
    rating,
    comment,
    user_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email,
    media_urls: mediaUrls,
    customer_id: customer.id,
    is_verified: true,
    created_at: new Date().toISOString()
  }

  const result = await updateMedusaCustomerMetadata(customer.email, {
    [`review_${productId}`]: reviewData
  })

  if (result?.error) {
    return { error: 'Failed to submit review' }
  }

  revalidatePath(`/product/${productId}`)
  return { success: true, message: "Review submitted!" }
}

export async function getReviews(product: any) {
  // Reviews are now directly in product metadata
  return product?.metadata?.reviews || []
}
