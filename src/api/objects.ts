import { supabase } from '../lib/supabase'
import type { ConstructionObject } from '../types/database'

export interface ObjectInput {
  name: string
  address: string
}

export async function getObjects(): Promise<ConstructionObject[]> {
  const { data, error } = await supabase
    .from('objects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getObject(objectId: string): Promise<ConstructionObject> {
  const { data, error } = await supabase
    .from('objects')
    .select('*')
    .eq('id', objectId)
    .single()

  if (error) throw error
  return data
}

export async function createObject(input: ObjectInput): Promise<ConstructionObject> {
  const { data, error } = await supabase
    .from('objects')
    .insert({ name: input.name.trim(), address: input.address.trim() })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateObject(
  objectId: string,
  input: ObjectInput,
): Promise<ConstructionObject> {
  const { data, error } = await supabase
    .from('objects')
    .update({ name: input.name.trim(), address: input.address.trim() })
    .eq('id', objectId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function archiveObject(objectId: string): Promise<void> {
  const { error } = await supabase.rpc('archive_object', { p_object_id: objectId })
  if (error) throw error
}

