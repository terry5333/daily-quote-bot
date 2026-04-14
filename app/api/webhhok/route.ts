import { NextResponse } from 'next/server';
import { WebhookEvent, Client } from '@line/bot-sdk';
import { db } from '@/lib/firebase';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events: WebhookEvent[] = body.events;

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const text = event.message.text.trim();

        const timeMatch = text.match(/^設定\s*([0-2][0-9])/);
        
        if (timeMatch && userId) {
          const hour = timeMatch[1]; 
          
          await db.collection('users').doc(userId).set({
            preferredTime: hour,
            dailyReminder: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          await client.replyMessage({
            replyToken: event.replyToken,
            messages: [{
              type: 'text',
              text: `✅ 已為您設定每天 ${hour}:00 推播專屬金句。\n(您也可以點擊選單開啟「設定介面」調整詳細主題)`
            }]
          });
        }
      }
    }
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
