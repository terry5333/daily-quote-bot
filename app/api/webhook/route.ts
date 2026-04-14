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

        // 捕捉 "設定 08:00" 或 "設定 08" 等格式
        const timeMatch = text.match(/^設定\s*([0-2][0-9])/);
        
        if (timeMatch && userId) {
          const hour = timeMatch[1]; 
          
          // 將使用者的設定存入 Firebase
          await db.collection('users').doc(userId).set({
            preferredTime: hour,
            dailyReminder: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // ✅ 修正過的寫法：replyToken 放第一個參數，訊息陣列放第二個參數
          await client.replyMessage(
            event.replyToken,
            [{
              type: 'text',
              text: `✅ 已為您設定每天 ${hour}:00 推播專屬金句。\n(您也可以點擊選單開啟「設定介面」調整詳細主題)`
            }]
          );
        } else if (text === '說明' || text === '教學') {
          // 提供基本的教學回覆
          await client.replyMessage(
            event.replyToken,
            [{
              type: 'text',
              text: '歡迎使用每日金句系統！✨\n請輸入「設定 HH:00」來決定接收時間，例如：「設定 08:00」或「設定 22:00」。\n您也可以點擊選單開啟設定介面喔！'
            }]
          );
        }
      }
    }
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 500 });
  }
}
