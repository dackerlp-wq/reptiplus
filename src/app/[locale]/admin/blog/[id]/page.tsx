import { notFound } from 'next/navigation'
import BlogForm from '../BlogForm'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/admin/blog/${id}`, { cache: 'no-store' })
  if (!res.ok) notFound()

  const { post, productLinks, categoryLinks } = await res.json()
  if (!post) notFound()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Upravit článek</h1>
      <BlogForm initialData={{
        id: post.id,
        titleCs: post.title_cs,
        titleEn: post.title_en,
        titleDe: post.title_de,
        contentCs: post.content_cs,
        contentEn: post.content_en,
        contentDe: post.content_de,
        excerpt: post.excerpt,
        image: post.image,
        isPublished: !!post.is_published,
        blogAuthorId: post.blog_author_id || '',
        productLinks,
        categoryLinks,
      }} />
    </div>
  )
}
