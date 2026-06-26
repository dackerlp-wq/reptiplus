import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import BlogForm from '../BlogForm'

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: post } = await supabaseAdmin.from('blog_posts').select('*').eq('id', id).single()
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
      }} />
    </div>
  )
}
