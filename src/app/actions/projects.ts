'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getProjects() {
  const supabase = await createClient()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }
  return data
}

export async function createProject(formData: { 
  name: string; 
  language: string; 
  repo_url?: string;
  tech_stack?: string[];
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, error: 'Unauthorized' }

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          ...formData,
          user_id: user.id,
          status: 'Scanning',
          score: 0,
          tech_stack: formData.tech_stack || []
        }
      ])
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/projects')
    revalidatePath('/dashboard')
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting project:', error)
    throw error
  }

  revalidatePath('/projects')
  revalidatePath('/dashboard')
}

export async function getDashboardStats() {
  const supabase = await createClient()
  if (!supabase) return { projectCount: 0, avgScore: 0, vulnerableCount: 0 }
  
  // Ambil total project
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })

  // Ambil rata-rata score
  const { data: scoreData } = await supabase
    .from('projects')
    .select('score')

  const avgScore = scoreData && scoreData.length > 0
    ? Math.round(scoreData.reduce((acc, curr) => acc + curr.score, 0) / scoreData.length)
    : 0

  // Ambil total vulnerabilities (dummy sum from status for now)
  const { count: vulnerableCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Vulnerable')

  return {
    projectCount: projectCount || 0,
    avgScore: avgScore,
    vulnerableCount: vulnerableCount || 0
  }
}

export async function getRecentRuns() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('security_runs')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching recent runs:', error)
    return []
  }
  return data
}

export async function getReports() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('security_runs')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching reports:', error)
    return []
  }
  return data
}
