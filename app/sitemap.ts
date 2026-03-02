import { MetadataRoute } from 'next'
import { medusaClient } from '@/lib/medusa'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flash.fashion'

  let productUrls: any[] = []
  try {
    // 1. Fetch all products from Medusa
    const { products } = await medusaClient.store.product.list({
      limit: 100
    })

    productUrls = products.map((product) => ({
      url: `${baseUrl}/product/${product.handle}`,
      lastModified: new Date(product.updated_at || Date.now()),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))
  } catch (error) {
    console.error('Sitemap product fetch failed:', error)
  }

  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lab`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/account`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]

  return [...staticUrls, ...productUrls]
}
