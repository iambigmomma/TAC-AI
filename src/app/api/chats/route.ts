import db from '@/lib/db';
import { withApiAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { chats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const getChatsHandler = async (req: NextRequest): Promise<NextResponse> => {
  const res = new NextResponse();
  const session = await getSession(req, res);

  if (!session?.user?.sub) {
    return NextResponse.json(
      { message: 'Unauthorized - Session invalid' },
      { status: 401 },
    );
  }
  const userId = session.user.sub;

  try {
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      orderBy: (chats, { desc }) => [desc(chats.createdAt)],
    });
    return NextResponse.json(
      { chats: userChats },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('Error in getting chats: ', err);
    return NextResponse.json(
      { message: 'An error has occurred fetching chats.' },
      { status: 500 },
    );
  }
};

export const GET = withApiAuthRequired(getChatsHandler);
