import Notification from '../models/Notification.js';

export async function notifySocial({ recipient, actor, type, post, text }, io) {
  if (!recipient || String(recipient) === String(actor)) return null;
  const note = await Notification.create({
    recipient,
    actor,
    type,
    post,
    text,
    read: false,
  });
  io?.to(`user:${recipient.toString()}`).emit('notification:new', note);
  return note;
}
