export type UserRole = 'setter' | 'executor'

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'review'
  | 'accepted'
  | 'revision'

export type Profile = {
  id: string
  display_name: string
  role: UserRole
  created_at: string
}

export type ConstructionObject = {
  id: string
  name: string
  address: string
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export type Task = {
  id: string
  title: string
  description: string
  object_id: string
  assignee_id: string
  status: TaskStatus
  author_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export type TaskStatusHistory = {
  id: string
  task_id: string
  actor_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  comment: string | null
  changed_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          display_name: string
          role?: UserRole
          created_at?: string
        }
        Update: Partial<Omit<Profile, 'id'>>
        Relationships: []
      }
      objects: {
        Row: ConstructionObject
        Insert: {
          id?: string
          name: string
          address: string
          created_by?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: Partial<Omit<ConstructionObject, 'id' | 'created_by' | 'created_at'>>
        Relationships: []
      }
      tasks: {
        Row: Task
        Insert: {
          id?: string
          title: string
          description?: string
          object_id: string
          assignee_id: string
          status?: TaskStatus
          author_id?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: Partial<
          Omit<Task, 'id' | 'status' | 'author_id' | 'created_at' | 'deleted_at' | 'deleted_by'>
        >
        Relationships: []
      }
      task_status_history: {
        Row: TaskStatusHistory
        Insert: {
          id?: string
          task_id: string
          actor_id: string
          from_status?: TaskStatus | null
          to_status: TaskStatus
          comment?: string | null
          changed_at?: string
        }
        Update: never
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      transition_task: {
        Args: {
          p_task_id: string
          p_target_status: TaskStatus
          p_comment?: string | null
        }
        Returns: Task
      }
      archive_task: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      archive_object: {
        Args: { p_object_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: UserRole
      task_status: TaskStatus
    }
    CompositeTypes: Record<string, never>
  }
}

