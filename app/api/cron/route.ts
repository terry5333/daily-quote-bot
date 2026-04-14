import { NextResponse } from 'next/server';
import { Client, FlexMessage } from '@line/bot-sdk';
import { db } from '@/lib/firebase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. 初始化 LINE 與 Gemini SDK
const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
});
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 2. 輔助函式：將使用者的主題偏好轉換為 Gemini 聽得懂的中文提示詞
const getUserTopicsText = (topics: any) => {
  if (!topics) return '溫暖且富有哲理'; // 預設值
  const activeTopics = Object.keys(topics).filter(key => topics[key]);
  if (activeTopics.length === 0) return '溫暖且富有哲理'; // 預設值
  
  const topicMap: any = { motivation: '動力', wisdom: '智慧', happiness: '幸福' };
  return activeTopics.map(t => topicMap[t]).join('、');
};

export async function GET(req: Request) {
  // 🛡️ 3. 安全驗證：確保只有帶有正確通關密語的請求才能觸發
  // 這可以防止路人亂戳網址，耗盡你的 Gemini 額度
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized (未授權的呼叫，密碼錯誤或未提供)', { status: 401 });
  }

  try {
    // 4. 計算時間：取得台灣時間 (UTC+8) 的當前小時 (格式例如 "08", "14")
    const twTime = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);
    const currentHour = twTime.getUTCHours().toString().padStart(2, '0');

    // 5. 查詢資料庫：找出「偏好設定為這個小時」且「有開啟提醒」的用戶
    const usersSnapshot = await db.collection('users')
      .where('preferredTime', '==', currentHour)
      .where('dailyReminder', '==', true)
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({ message: `目前時段 (${currentHour}:00) 沒有需要發送的用戶。` });
    }

    // 6. 分組最佳化：依照用戶的「主題偏好」將他們分組
    // 這樣同樣喜歡「智慧、動力」的人，就可以共用同一句生成的金句，節省 API 呼叫次數
    const userGroups: { [key: string]: { userIds: string[], topics: any } } = {};
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      // 將 topics 物件轉為字串當作群組的 Key
      const key = JSON.stringify(data.topics || {});
      if (!userGroups[key]) userGroups[key] = { userIds: [], topics: data.topics };
      userGroups[key].userIds.push(doc.id);
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 7. 針對每一組不同的主題組合，請 Gemini 生成專屬金句並推播
    for (const key in userGroups) {
      const { userIds, topics } = userGroups[key];
      const topicsText = getUserTopicsText(topics);
      
      // 呼叫 Gemini 
      const prompt = `請針對「${topicsText}」這些主題，生成一句簡短、溫暖的每日金句（繁體中文），20到30字內，不要加上引號、前言或後語。`;
      const result = await model.generateContent(prompt);
      const quote = result.response.text().trim();

      // 建立 Clean UI 風格的 LINE Flex Message
      const flexMessage: FlexMessage = {
        type: 'flex',
        altText: `今日金句：${quote}`,
        contents: {
          type: 'bubble',
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { 
                type: 'text', 
                text: '✨ 宇宙給您的今日訊息', 
                weight: 'bold', 
                color: '#006e2b', // 呼應你前端設定的 Primary 綠色
                size: 'sm' 
              },
              { 
                type: 'text', 
                text: quote, 
                margin: 'xl', 
                size: 'md', 
                wrap: true, 
                color: '#2d342c' // 呼應你前端設定的文字顏色
              }
            ],
            backgroundColor: '#ffffff',
            cornerRadius: 'xl',
            paddingAll: 'xxl'
          }
        }
      };
      
      // 透過 LINE API 批次推播給該組的所有用戶 (注意：若該組超過 500 人，需再切分陣列)
      await client.multicast(userIds, [flexMessage]);
    }

    return NextResponse.json({ 
      success: true, 
      hour: currentHour, 
      groupCount: Object.keys(userGroups).length 
    });
    
  } catch (error) {
    console.error('Cron Error:', error);
    return NextResponse.json({ status: 'error', message: (error as Error).message }, { status: 500 });
  }
}
