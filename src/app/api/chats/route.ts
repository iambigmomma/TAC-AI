import db from '@/lib/db';
import { chats as chatsTable } from '@/lib/db/schema'; // Assuming schema export
import { eq } from 'drizzle-orm'; // Assuming Drizzle syntax
import { getSession } from '@auth0/nextjs-auth0'; // Use Node.js compatible getSession
import { NextRequest, NextResponse } from 'next/server';

// Specify nodejs runtime if DB driver or getSession requires it
export const runtime = 'nodejs';

export const GET = async (req: NextRequest) => {
  try {
    // Get user session
    const session = await getSession();
    if (!session?.user?.sub) {
      // No user logged in, return unauthorized or empty list
      // Returning empty list might be better for the history page UI
      // return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      return NextResponse.json({ chats: [] }, { status: 200 });
    }
    const userId = session.user.sub;

    // Fetch chats specifically for the logged-in user
    let userChats = await db.query.chats.findMany({
      where: eq(chatsTable.userId, userId), // Filter by userId
      // Add ordering if needed, e.g., orderBy: desc(chatsTable.createdAt)
    });

    // Reverse the order if needed (or handle ordering in the query)
    userChats = userChats.reverse();

    return NextResponse.json({ chats: userChats }, { status: 200 });
  } catch (err) {
    // Log the detailed error on the server for debugging
    console.error(
      'Error fetching user chats (potentially missing userId field or DB issue):',
      err,
    );
    // Return an empty list to the frontend instead of a 500 error
    return NextResponse.json(
      { chats: [] },
      { status: 200 }, // Return 200 OK with empty data
    );
  }
};
