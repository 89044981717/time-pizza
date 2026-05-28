const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.https://gvywvghhiwajywfoxphr.supabase.co/rest/v1/,
  process.env.sb_publishable_VRfScZsuZYuHIs3keMZ25Q_Ocb3N9k5
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  const userId = Buffer.from(token, 'base64').toString().split(':')[0];
  const { item, price } = JSON.parse(event.body);

  // Получаем пользователя и обновляем баланс
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single();

  if (fetchError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'User not found' }) };
  }

  if (user.balance < price) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Not enough minutes', needed: price - user.balance }) };
  }

  const newBalance = user.balance - price;

  const { error: updateError } = await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId);

  if (updateError) {
    return { statusCode: 500, body: JSON.stringify({ error: updateError.message }) };
  }

  await supabase.from('orders').insert({
    user_id: userId,
    date: new Date().toISOString(),
    item,
    price,
    balance_after: newBalance,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, newBalance }),
  };
};