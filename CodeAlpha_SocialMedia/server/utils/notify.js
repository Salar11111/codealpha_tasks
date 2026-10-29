import Notification from '../models/Notification.js';

export async function notifySocial({ recipient, actor, type, post, text }) {
  if (!recipient || String(recipient) === String(actor)) return null;
  return Notification.create({ recipient, actor, type, post, text });
}
