const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Testar a conexão
supabase
  .from('users')
  .select('*')
  .limit(1)
  .then(({ data, error }) => {
    if (error) console.error('Erro de conexão:', error);
    else console.log('Conectado:', data);
  });

module.exports = supabase;
