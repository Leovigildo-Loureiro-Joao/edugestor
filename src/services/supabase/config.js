// src/services/supabase/config.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fbgpygnqzcifbfzxqlzh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZ3B5Z25xemNpZmJmenhxbHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODE0MjcsImV4cCI6MjA3ODk1NzQyN30.lAlMQpZif-q_yP52hOHbhuEvIZfdShDmCpBX3YkrkUg'

export const supabase = createClient(supabaseUrl, supabaseKey)