const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { login, password } = JSON.parse(event.body);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, login, balance, reg_date, last_accrual')
    .eq('login', login)
    .eq('password_hash', password)
    .single();

  if (error || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid login or password' }) };
  }

  // Обновляем начисления, если прошёл день
  const today = new Date().toISOString().split('T')[0];
  let updatedBalance = user.balance;
  if (user.last_accrual !== today) {
    // Начисляем 1 минуту
    updatedBalance += 1;
    await supabase.from('users').update({ balance: updatedBalance, last_accrual: today }).eq('id', user.id);
    await supabase.from('accrual_history').insert({
      user_id: user.id,
      date: today,
      minutes: 1,
      reason: 'Автоматическое начисление за день',
    });
  }

  const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

  return {
    statusCode: 200,
    body: JSON.stringify({ token, user: { login: user.login, balance: updatedBalance, regDate: user.reg_date } }),
  };
};