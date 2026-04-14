import { NextResponse } from 'next/server';
import { Client, FlexMessage } from '@line/bot-sdk';
import { db } from '@/lib/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const getUserTopicsText = (topics: any) => {
  if (!topics) return '溫暖且富有哲理';
  const activeTopics = Object.keys(topics).filter(key => topics[key]);
  if (activeTopics.length === 0) return '溫暖且富有哲理';
  
  const topicMap: any = { motivation: '動力', wisdom: '智慧', happiness: '幸福' };
  return activeTopics.map(t => topicMap[t]).join('、');
};

export async function GET(req: Request) {
  try {
    const twTime = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
    const currentHour = twTime.getUTCHours().toString().padStart(2, '0');

    const usersSnapshot = await db.collection('users')
      .where('preferredTime', '==', currentHour)
      .where('dailyReminder', '==', true)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ message: `No users for ${currentHour}:00.` });
    }

    const userGroups: { [key: string]: { userIds: string[], topics: any } } = {};
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const key = JSON.stringify(data.topics || {});
      if (!userGroups[key]) userGroups[key] = { userIds: [], topics: data.topics };
      userGroups[key].userIds.push(doc.id);
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    for (const key in userGroups) {
      const { userIds, topics } = userGroups[key];
      const topicsText = getUserTopicsText(topics);
      
      const prompt = `請針對「${topicsText}」這些主題，生成一句簡短、溫暖的每日金句（繁體中文），20到30字內，不要加上引號、前言或後語。`;
      const result = await model.generateContent(prompt);
      const quote = result.response.text().trim();

      const flexMessage: FlexMessage = {
        type: 'flex',
        altText: `今日金句：${quote}`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '✨ 宇宙給您的今日訊息', weight: 'bold', color: '#006e2b', size: 'sm' },
              { type: 'text', text: quote, margin: 'xl', size: 'md', wrap: true, color: '#2d342c' }
            ],
            backgroundColor: '#ffffff',
            cornerRadius: 'xl',
            paddingAll: 'xxl'
          }
        }
      };
      
      // 注意：實務上若超過500人需分批推播
      await client.multicast(userIds, [flexMessage]);
    }

    return NextResponse.json({ success: true, hour: currentHour });
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
