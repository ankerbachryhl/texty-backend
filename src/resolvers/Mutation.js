const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { APP_SECRET, getUserId } = require('../utils');

function createChat(parent, args, context, info) {
  const { name } = args;
  return context.db.mutation.createChat({
    data: { name, likeCount: 0 }}, info)
}

function createMessage(parent, args, context, info) {
  const { content, media, chatId } = args;

  if(content == '') {
    throw new Error("You can't just send whitespace")
  }

  const userId = getUserId(context);
  return context.db.mutation.createMessage({
    data: { content, media, sendBy: { connect: { id: userId }}, chat: { connect: { id: chatId }} }}, info);
}

async function likeChat(parent, args, context, info) {
  const { chatId } = args;
  const userId = getUserId(context)


  //Check if the user has liked before

  const likeExist = await context.db.exists.Like({
    user: { id: userId },
    chat: { id: chatId },
  })

  if (likeExist) {
    throw new Error("You already liked this chat room")
  }

  //Query chat to get current like count

  const chat = await context.db.query.chats({ where: { id: chatId }})

  //Update chat with new total likes

  await context.db.mutation.updateChat({
    data: {
      likeCount: chat[0].likeCount + 1
    },
    where: {
      id: chatId
    }
  })

  //At last make new like type so the user cant like the same chat again

  return context.db.mutation.createLike(
    {
      data: {
        user: { connect: { id: userId }},
        chat: { connect: { id: chatId }},
      }
    }, info)
}

async function signup(parent, args, context, info) {
  const emailExist = await context.db.query.user({
    where: { email: args.email }});

  const nameExist = await context.db.query.user({
    where: { name: args.name }});

  if (emailExist) {
    throw new Error(`Sorry but you need to be a bit more original. A user with the email: ${args.email} already exist`)
  } else if (nameExist) {
    throw new Error(`Sorry but you need to be a bit more original. A user with the name: ${args.name} already exist`)
  }

  const password = await bcrypt.hash(args.password, 10);
  const user = await context.db.mutation.createUser({
    data: { ...args, password }
  });

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user,
  }
}

async function login(parent, args, context, info) {
  const user = await context.db.query.user({ where: { email: args.email }});
  if (!user) {
    throw new Error(`Could not find a user with the e-mail: ${args.email}`)
  }

  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) {
    throw new Error('Not to tilt you but the text you entered doesnt match your account password :/')
  }

  const token = jwt.sign({ userId: user.id }, APP_SECRET);

  return {
    token,
    user,
  }
}

module.exports = {
  createChat,
  createMessage,
  signup,
  login,
  likeChat,
}
