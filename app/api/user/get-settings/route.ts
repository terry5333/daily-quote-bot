import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ message: 'UserId required' }, { status: 400 });

  try {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      return NextResponse.json({ 
        preferredTime: '08', dailyReminder: true, topics: { motivation: true, wisdom: true, happiness: false }
      });
    }
    return NextResponse.json(doc.data());
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching' }, { status: 500 });
  }
}
