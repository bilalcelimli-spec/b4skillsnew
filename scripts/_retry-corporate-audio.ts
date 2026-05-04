import "dotenv/config";
import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const script = `Read this job interview conversation naturally.
Interviewer: Good morning, thank you for coming in today. Could you start by telling me a bit about your marketing experience?
Candidate: Of course. I have worked in digital marketing for five years, mainly focusing on social media campaigns and content strategy.
Interviewer: That sounds impressive. What was your biggest achievement in your previous role?
Candidate: I led a campaign that increased our online engagement by forty percent within three months.
Interviewer: Excellent. How do you approach data analytics in your work?
Candidate: I use data to guide every decision. I track key performance metrics weekly and adjust strategies accordingly.
Interviewer: Very good. We will be in touch by the end of next week.
Candidate: Thank you so much. I look forward to hearing from you.`;

(async () => {
  const r = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: script }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } } },
    },
  });
  const data = r.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!data) throw new Error("no audio data returned");
  const buf = Buffer.from(data, "base64");
  fs.writeFileSync("public/audio/corporate-job-interview-marketing.wav", buf);
  console.log(`OK saved ${Math.round(buf.length / 1024)} KB`);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
