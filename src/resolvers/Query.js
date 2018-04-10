function chatMessages(parent, args, ctx, info) {
  const { chatId } = args
  return ctx.db.query.messages({ where: { chat: { id_contains: chatId } } }, info)
}

function chats(parent, args, ctx, info) {
  const { orderBy } = args

  return ctx.db.query.chats({ orderBy }, info)
}

module.exports = {
  chatMessages,
  chats,
}
