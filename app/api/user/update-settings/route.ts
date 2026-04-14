import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const { userId, preferredTime, topics, dailyReminder } = await req.json();
    if (!userId) return NextResponse.json({ message: 'UserId required' }, { status: 400 });

    await db.collection('users').doc(userId).set({
      preferredTime, topics, dailyReminder, updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error updating' }, { status: 500 });
  }
}
