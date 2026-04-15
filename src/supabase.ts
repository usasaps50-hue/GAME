import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pcqpeyaeowajpingaejq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcXBleWFlb3dhanBpbmdhZWpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzMxNzYsImV4cCI6MjA4OTc0OTE3Nn0.OsKHM-pqObpy8VmmEhtMqKL-DtnXz2gs215s2R2ay5g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
