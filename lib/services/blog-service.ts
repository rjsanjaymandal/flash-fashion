export interface BlogPostMeta {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage: string;
    author: string;
    publishedAt: string;
    tags: string[];
}

export async function getBlogPost(slug: string): Promise<any> { return null; }
export async function getAllBlogSlugs(): Promise<any[]> { return []; }
export async function getBlogPosts(): Promise<any[]> { return []; }
export async function getFeaturedPosts(): Promise<any[]> { return []; }
