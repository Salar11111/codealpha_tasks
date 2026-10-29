import Notification from '../models/Notification.js';

export async function notify(io, { recipient, message, project, actorId, task }) {
  if (!recipient || recipient.toString() === actorId?.toString()) return null;
  const note = await Notification.create({
    recipient,
    message,
    project,
    task: task || undefined,
    read: false,
  });
  io?.to(`user:${recipient.toString()}`).emit('notification:new', note);
  return note;
}
