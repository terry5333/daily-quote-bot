'use client';

import { useEffect, useState } from 'react';
import liff from '@line/liff';

type Topics = { motivation: boolean; wisdom: boolean; happiness: boolean; };

export default function SettingsPage() {
  const [liffId] = useState(process.env.NEXT_PUBLIC_LIFF_ID || '');
  const [userId, setUserId] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState('https://lh3.googleusercontent.com/aida-public/AB6AXuChe6iiTTEjjBhWcrRecv5Xt4b3PIFXsXs8RWv3-_NRqJGsghpTxRb3Gwm4vC3bzS8ySQYLyG4bQQt8_N9MLhG0JV6FY0d9ne4XG8LYJT_XdT03eQvYZCW2lgCSu8SHdBVKXpNUleIfLNytWBLiWfPBYVFQ4DKjwLBCMTp8e565b-r2OdIz5eZ2xCZgdHn2Bf9YfXAdXAA6ifAEsqLPt9apNOSR3fvGdiou86HtZN2dbpW7s7neGb9jA9iXukoPP6uQFsUtUhHOQzg');
  const [displayName, setDisplayName] = useState('載入中...');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDailyReminderOn, setIsDailyReminderOn] = useState(true);
  const [selectedTime, setSelectedTime] = useState('08');
  const [topics, setTopics] = useState<Topics>({ motivation: true, wisdom: true, happiness: false });

  useEffect(() => {
    if (!liffId) return;
    liff.init({ liffId }).then(() => {
      if (liff.isLoggedIn()) {
        const profile = liff.getContext();
        if (profile?.userId) {
          setUserId(profile.userId);
          liff.getProfile().then(p => {
            setDisplayName(p.displayName);
            if (p.pictureUrl) setProfilePic(p.pictureUrl);
          });
          fetch(`/api/user/get-settings?userId=${profile.userId}`)
            .then(res => res.json())
            .then(data => {
              if (data.preferredTime) setSelectedTime(data.preferredTime);
              if (data.topics) setTopics(data.topics);
              if (data.dailyReminder !== undefined) setIsDailyReminderOn(data.dailyReminder);
            })
            .finally(() => setIsLoading(false));
        }
      } else {
        liff.login();
      }
    });
  }, [liffId]);

  const handleSave = async () => {
    if (!userId) return alert('無法取得使用者資訊');
    try {
      const res = await fetch('/api/user/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, dailyReminder: isDailyReminderOn, 
          preferredTime: isDailyReminderOn ? selectedTime : null,
          topics: isDailyReminderOn ? topics : null,
        }),
      });
      if (res.ok) {
        alert('設定儲存成功！');
        liff.closeWindow();
      }
    } catch (err) {
      alert('發生錯誤');
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>;

  return (
    <main className="max-w-md mx-auto px-6 pt-8 space-y-10 pb-10">
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-primary to-primary-container shadow-lg">
            <img alt="User profile" className="w-full h-full object-cover rounded-full" src={profilePic}/>
          </div>
          <div className="absolute bottom-0 right-1 bg-primary text-white p-2 rounded-full shadow-md border-2 border-surface">
            <span className="material-symbols-outlined text-sm">edit</span>
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-on-surface">{displayName}</h2>
          <p className="text-on-surface-variant text-sm font-medium">尋找每日的喜悅火花</p>
        </div>
      </section>

      <section className="bg-secondary-container rounded-xl p-8 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined text-9xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
        </div>
        <p className="text-on-secondary-container text-lg font-headline font-semibold leading-relaxed relative z-10 italic">"成就卓越工作的唯一途徑，就是熱愛你所做的事。"</p>
        <p className="text-on-secondary-container/70 text-sm mt-4 font-medium uppercase tracking-widest relative z-10">— Steve Jobs</p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center space-x-2 px-2">
          <span className="material-symbols-outlined text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          <h3 className="text-lg font-bold tracking-tight">主題設定</h3>
        </div>
        <div className="bg-surface-container-low rounded-lg p-2 space-y-2">
          
          {[ { id: 'motivation', name: '動力', icon: 'bolt', color: 'primary', desc: '為你的志向提供每日能量' },
             { id: 'wisdom', name: '智慧', icon: 'menu_book', color: 'secondary', desc: '來自歷史的深刻洞見' },
             { id: 'happiness', name: '幸福', icon: 'sentiment_very_satisfied', color: 'tertiary', desc: '為靈魂注入正能量' }
          ].map(t => (
            <div key={t.id} className="bg-surface-container-lowest p-4 rounded-md flex items-center justify-between transition-all hover:bg-surface-container-highest">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 bg-${t.color}/10 rounded-full flex items-center justify-center text-${t.color}`}>
                  <span className="material-symbols-outlined">{t.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{t.name}</p>
                  <p className="text-xs text-on-surface-variant">{t.desc}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={topics[t.id as keyof Topics]} onChange={(e) => setTopics({ ...topics, [t.id]: e.target.checked })}/>
                <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          ))}

        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center space-x-2 px-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
          <h3 className="text-lg font-bold tracking-tight">傳送時間設定</h3>
        </div>
        <div className="bg-surface-container-low rounded-lg p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-on-surface">開啟每日提醒</p>
              <p className="text-xs text-on-surface-variant">每天收到精選金句</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={isDailyReminderOn} onChange={(e) => setIsDailyReminderOn(e.target.checked)}/>
              <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          
          {isDailyReminderOn && (
            <div className="grid grid-cols-3 gap-3">
              {[ { time: '08', name: '早晨', icon: 'wb_sunny' },
                 { time: '14', name: '下午', icon: 'light_mode' },
                 { time: '21', name: '晚上', icon: 'nights_stay' }
              ].map(item => (
                <button key={item.time} onClick={() => setSelectedTime(item.time)}
                  className={`p-4 rounded-lg flex flex-col items-center justify-center space-y-2 transition-all active:scale-95 ${selectedTime === item.time ? 'bg-primary text-white' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-highest'}`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="text-xs font-medium">{item.name}</span>
                  <span className={`text-[10px] ${selectedTime === item.time ? 'opacity-80' : 'text-on-surface-variant'}`}>{item.time}:00</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section>
        <button onClick={handleSave} className="w-full py-4 rounded-full bg-gradient-to-br from-primary to-primary-container text-white font-bold text-lg shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center justify-center space-x-2">
          <span>儲存設定</span>
        </button>
      </section>
    </main>
  );
}
