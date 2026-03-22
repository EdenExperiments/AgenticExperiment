import { redirect } from 'next/navigation'

/** The dedicated edit page has been replaced by the inline SkillEditModal.
 *  Any deep-link to /skills/:id/edit redirects back to the skill detail page.
 */
export default function SkillEditRedirect({ params }: { params: { id: string } }) {
  redirect(`/skills/${params.id}`)
}
