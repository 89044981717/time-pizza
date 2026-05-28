const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.https://gvywvghhiwajywfoxphr.supabase.co/rest/v1/,
  process.env.sb_publishable_VRfScZsuZYuHIs3keMZ25Q_Ocb3N9k5
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const token = event.headers.authorization?.replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  const userId = Buffer.from(token, 'base64').toString().split(':')[0];

  const { data: accruals } = await supabase
    .from('accrual_history')
    .select('date, minutes, reason')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  const { data: orders } = await supabase
    .from('orders')
    .select('date, item, price')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  return {
    statusCode: 200,
    body: JSON.stringify({ accruals, orders }),
  };
};