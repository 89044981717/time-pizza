const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.https://gvywvghhiwajywfoxphr.supabase.co/rest/v1/,
  process.env.sb_publishable_VRfScZsuZYuHIs3keMZ25Q_Ocb3N9k5
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const { login, password } = JSON.parse(event.body);
  if (!login || !password) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Login and password required' }) };
  }

  // Проверяем, существует ли пользователь
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('login', login)
    .single();

  if (existing) {
    return { statusCode: 400, body: JSON.stringify({ error: 'User already exists' }) };
  }

  // Создаём пользователя с балансом 5 (бонус) и сегодняшней датой
  const today = new Date().toISOString().split('T')[0];
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      login,
      password_hash: password, // ⚠️ в продакшене используйте bcrypt
      balance: 5,
      reg_date: today,
      last_accrual: today,
      bonus_given: true,
    })
    .select()
    .single();

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  // Записываем в историю начислений бонус
  await supabase.from('accrual_history').insert({
    user_id: newUser.id,
    date: today,
    minutes: 5,
    reason: 'Бонус за регистрацию',
  });

  // Генерируем простой токен (в реальном проекте – JWT)
  const token = Buffer.from(`${login}:${Date.now()}`).toString('base64');

  return {
    statusCode: 200,
    body: JSON.stringify({ token, user: { login, balance: 5, regDate: today } }),
  };
};