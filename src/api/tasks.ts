import { supabase } from '../lib/supabase'
import type {
  ConstructionObject,
  Profile,
  Task,
  TaskStatus,
  TaskStatusHistory,
} from '../types/database'

export interface TaskInput {
  title: string
  description: string
  object_id: string
  assignee_id: string
}

export interface TaskHistoryItem extends TaskStatusHistory {
  actor: Profile | null
}

export interface TaskDetails {
  task: Task
  object: ConstructionObject
  assignee: Profile | null
  author: Profile | null
  history: TaskHistoryItem[]
}

export async function getTasksForObject(objectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('object_id', objectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getMyTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getVisibleProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name', { ascending: true })

  if (error) throw error
  return data
}

export async function getExecutors(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'executor')
    .order('display_name', { ascending: true })

  if (error) throw error
  return data
}

export async function getTask(taskId: string): Promise<Task> {
  const { data, error } = await supabase.from('tasks').select('*').eq('id', taskId).single()
  if (error) throw error
  return data
}

export async function getTaskDetails(taskId: string): Promise<TaskDetails> {
  const task = await getTask(taskId)

  const [objectResult, historyResult] = await Promise.all([
    supabase.from('objects').select('*').eq('id', task.object_id).single(),
    supabase
      .from('task_status_history')
      .select('*')
      .eq('task_id', task.id)
      .order('changed_at', { ascending: true }),
  ])

  if (objectResult.error) throw objectResult.error
  if (historyResult.error) throw historyResult.error

  const history = historyResult.data
  const profileIds = [...new Set([task.assignee_id, task.author_id, ...history.map((item) => item.actor_id)])]
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', profileIds)

  if (profilesError) throw profilesError
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

  return {
    task,
    object: objectResult.data,
    assignee: profileById.get(task.assignee_id) ?? null,
    author: profileById.get(task.author_id) ?? null,
    history: history.map((item) => ({ ...item, actor: profileById.get(item.actor_id) ?? null })),
  }
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title.trim(),
      description: input.description.trim(),
      object_id: input.object_id,
      assignee_id: input.assignee_id,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateTask(taskId: string, input: TaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      object_id: input.object_id,
      assignee_id: input.assignee_id,
    })
    .eq('id', taskId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function transitionTask(
  taskId: string,
  targetStatus: TaskStatus,
  comment?: string,
): Promise<Task> {
  const { data, error } = await supabase.rpc('transition_task', {
    p_task_id: taskId,
    p_target_status: targetStatus,
    p_comment: comment?.trim() || null,
  })

  if (error) throw error
  return data
}

export async function archiveTask(taskId: string): Promise<void> {
  const { error } = await supabase.rpc('archive_task', { p_task_id: taskId })
  if (error) throw error
}

