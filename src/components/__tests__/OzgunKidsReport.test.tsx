// @vitest-environment jsdom
import React from 'react';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {OzgunKidsReport} from '../OzgunKidsReport';
import {scoreFixedForm,type FixedAnswers} from '../../lib/fixed-forms/ozgun-kids';
import {OZGUN_ANSWER_KEY} from '../../lib/fixed-forms/ozgun-kids-key.server';
import {ozgunReportInsights} from '../../lib/fixed-forms/ozgun-report-insights';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
function scored(counts:number[][],keyConfirmed=true) {
  const answers:FixedAnswers={};
  counts.forEach((skills,level)=>skills.forEach((correct,skill)=>{
    for(let offset=0;offset<correct;offset++) {
      const number=skill*24+level*4+offset+1;
      answers[String(number)]=OZGUN_ANSWER_KEY[number-1] as 'A'|'B'|'C'|'D';
    }
  }));
  return scoreFixedForm(answers,OZGUN_ANSWER_KEY,keyConfirmed);
}
describe('Özgün Kids report interpretation',()=>{
  it('keeps the supplied 60-point example provisional and shows its supporting clusters',()=>{
    const report=scored([[4,4,4,4],[4,4,4,4],[4,4,4,4],[2,2,2,2],[1,1,1,1],[0,0,0,0]]);
    render(<OzgunKidsReport report={report} candidateName="Deniz"/>);
    const suggestion=screen.getByRole('region',{name:'Geçici kur önerisi'});
    expect(within(suggestion).getByText('B2 kur adayı')).toBeTruthy();
    expect(within(suggestion).getByText('Toplam puan aralığı: 56–71 / 96')).toBeTruthy();
    expect(screen.getByText('60 / 96 soru cevaplandı · %63 katılım')).toBeTruthy();
    expect(within(screen.getByRole('article',{name:'B1 kümesi'})).getByText('Güçlü kanıt')).toBeTruthy();
    expect(within(screen.getByRole('article',{name:'B2 kümesi'})).getByText('Kısmi kanıt')).toBeTruthy();
    expect(screen.getByText(/Dört bölümün doğru sayısı eşit/)).toBeTruthy();
    expect(screen.queryByRole('button',{name:/sertifika/i})).toBeNull();
  });
  it('does not invent strengths or a below-A1 diagnosis when no questions were answered',()=>{
    const report=scoreFixedForm({},OZGUN_ANSWER_KEY,true),insights=ozgunReportInsights(report);
    expect(insights.highest).toEqual([]);expect(insights.focus).toEqual([]);expect(insights.practice).toHaveLength(4);
    render(<OzgunKidsReport report={report}/>);
    expect(screen.getByText(/Hiçbir soru cevaplanmadı/)).toBeTruthy();
    expect(screen.queryByText(/En çok doğru cevap:/)).toBeNull();
    expect(screen.getByText(/Bu durum “A1 altı” sonucu olarak yorumlanmamalıdır/)).toBeTruthy();
  });
  it('separates wrong answers from blanks and never treats a wrong submitted answer as non-participation',()=>{
    const report=scoreFixedForm({'1':'A'},OZGUN_ANSWER_KEY,true),insights=ozgunReportInsights(report);
    expect(insights.answered).toBe(1);expect(insights.noAnswers).toBe(false);expect(insights.highest).toEqual([]);
    render(<OzgunKidsReport report={report}/>);
    expect(screen.getByText('1 yanlış · 95 boş · %0')).toBeTruthy();
    expect(screen.queryByText(/Hiçbir soru cevaplanmadı/)).toBeNull();
  });
  it('retains tied relative strengths, focuses practice on the lowest raw score and flags mismatched prerequisites',()=>{
    const report=scored(Array.from({length:6},()=>[4,4,2,0]));
    const insights=ozgunReportInsights(report);
    expect(insights.highest.map(section=>section.skill)).toEqual(['GRAMMAR','VOCABULARY']);
    expect(insights.focus.map(section=>section.skill)).toEqual(['LISTENING']);expect(insights.gap).toBe(24);
    render(<OzgunKidsReport report={report}/>);
    expect(screen.getByRole('heading',{name:'Toplam puan ve kümeler uyuşmuyor'})).toBeTruthy();
    expect(screen.getByText(/Öncelikli inceleme alanı: Dinleme/)).toBeTruthy();
    expect(screen.getByText(/Alıştırma sırasında tekrar dinleyip/)).toBeTruthy();
  });
  it('keeps security and unconfirmed-key holds ahead of course guidance and supports print/back actions',()=>{
    const report={...scoreFixedForm({},OZGUN_ANSWER_KEY,false),securityHold:true},close=vi.fn(),print=vi.spyOn(window,'print').mockImplementation(()=>{});
    render(<OzgunKidsReport report={report} candidateName="Ece" completedAt="invalid-date" onClose={close}/>);
    expect(screen.getByRole('alert').textContent).toContain('güvenlik incelemesinde');
    expect(screen.getByRole('alert').textContent).toContain('anahtarı doğrulanmamış');
    expect(screen.queryByText(/Invalid Date/)).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Yazdır'}));expect(print).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button',{name:'Geri dön'}));expect(close).toHaveBeenCalledOnce();
  });
});
