import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wdzqhrbkbtgfxjcmlbrv.supabase.co'
const supabaseKey = 'sb_publishable_xuv6miGhW2tbswpB6NfhUQ_XG0Um6qB'

export const supabase = createClient(supabaseUrl, supabaseKey)
