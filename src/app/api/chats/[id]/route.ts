import db from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@auth0/nextjs-auth0';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.sub;

  try {
    const { id } = await params;

    const chatExists = await db.query.chats.findFirst({
      where: and(eq(chats.id, id), eq(chats.userId, userId)),
    });

    if (!chatExists) {
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, id),
    });

    return Response.json(
      {
        chat: chatExists,
        messages: chatMessages,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in getting chat by id: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const session = await getSession();
  if (!session || !session.user || !session.user.sub) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.sub;

  try {
    const { id } = await params;

    const chatExists = await db.query.chats.findFirst({
      where: and(eq(chats.id, id), eq(chats.userId, userId)),
    });

    if (!chatExists) {
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    await db
      .delete(chats)
      .where(and(eq(chats.id, id), eq(chats.userId, userId)))
      .execute();
    await db.delete(messages).where(eq(messages.chatId, id)).execute();

    return Response.json(
      { message: 'Chat deleted successfully' },
      { status: 200 },
    );
  } catch (err) {
    console.error('Error in deleting chat by id: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
