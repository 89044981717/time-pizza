const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  const userId = Buffer.from(token, 'base64').toString().split(':')[0];

  let { data: user, error } = await supabase
    .from('users')
    .select('id, login, balance, reg_date, last_accrual')
    .eq('id', userId)
    .single();

  if (error || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const today = new Date().toISOString().split('T')[0];
  let updatedBalance = user.balance;
  if (user.last_accrual !== today) {
    updatedBalance += 1;
    await supabase.from('users').update({ balance: updatedBalance, last_accrual: today }).eq('id', user.id);
    await supabase.from('accrual_history').insert({
      user_id: user.id,
      date: today,
      minutes: 1,
      reason: 'Автоматическое начисление за день',
    });
    user.balance = updatedBalance;
    user.last_accrual = today;
  }

  // Подсчитываем общее начисленное количество минут (бонус + дни)
  const regDate = new Date(user.reg_date);
  const now = new Date();
  const daysSinceReg = Math.floor((now - regDate) / (1000 * 60 * 60 * 24));
  const totalAccrued = daysSinceReg + (user.bonus_given ? 5 : 0);

  return {
    statusCode: 200,
    body: JSON.stringify({
      balance: user.balance,
      regDate: user.reg_date,
      totalAccrued: totalAccrued,
    }),
  };
};