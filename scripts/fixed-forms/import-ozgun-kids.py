"""Extract the supplied Form A; preserves fixed ordering and the four option texts.
Requires pdfplumber. Usage: python import-ozgun-kids.py source.pdf output.json
"""
import json,re,sys
import pdfplumber
source,target=sys.argv[1:3]
layout={2:[(1,6),(7,12)],3:[(13,16),(17,20)],4:[(21,24)],5:[(25,30),(31,36)],6:[(37,40),(41,44)],7:[(45,48)],8:[(49,52),(53,56)],9:[(57,58),(59,60)],10:[(61,62),(63,64)],12:[(65,68)],14:[(69,72)],15:[(73,76),(77,80)],16:[(81,84)],17:[(85,88)],18:[(89,92)],19:[(93,96)]}
with pdfplumber.open(source) as pdf:
 questions=[];passages={}
 for pn,groups in layout.items():
  page=pdf.pages[pn-1];words=page.extract_words()
  for col,(first,last) in enumerate(groups):
   left=40 if col==0 else 308;right=290 if len(groups)==2 and col==0 else 555
   starts=[w for w in words if w['text'].isdigit() and first<=int(w['text'])<=last and abs(w['x0']-(43 if col==0 else 311))<4 and 150<w['top']<750]
   starts.sort(key=lambda w:w['top'])
   assert [int(w['text']) for w in starts]==list(range(first,last+1)),(pn,starts)
   for i,w in enumerate(starts):
    bottom=starts[i+1]['top']-2 if i+1<len(starts) else 749
    text=page.crop((left,w['top']-1,right,bottom)).extract_text(x_tolerance=2,y_tolerance=3)
    text=re.sub(r'^\d{2}\s*','',text).strip()
    text=re.split(r'\n(?:Cevaplarınızı|Grammar bölümünün|Vocabulary bölümünün|Reading bölümünün|Bir sonraki|Sınavın sonu)',text)[0]
    parts=re.split(r'(?<!\w)([ABCD])\)\s*',text)
    assert len(parts)==9,(pn,int(w['text']),text,parts)
    n=int(w['text']);skill=['GRAMMAR','VOCABULARY','READING','LISTENING'][(n-1)//24]
    clean=lambda s: re.sub(r'\s+',' ',s).strip()
    questions.append({'number':n,'skill':skill,'prompt':clean(parts[0]),'options':{parts[j]:clean(parts[j+1]) for j in range(1,9,2)},'sourcePage':pn})
 for num,(pn,col,heading,firstq) in enumerate([(8,0,'TEXT 1',49),(8,1,'TEXT 2',53),(9,None,'TEXT 3',57),(10,None,'TEXT 4',61),(11,None,'TEXT 5',None),(13,None,'TEXT 6',None)],1):
  page=pdf.pages[pn-1]
  left,right=(40,290) if col==0 else (308,555) if col==1 else (40,555)
  words=page.extract_words();h=next(w for w in words if w['text']=='TEXT' and left<=w['x0']<right)
  bottom=next(w['top'] for w in words if w['text']==str(firstq) and abs(w['x0']-(311 if col==1 else 43))<4) - 4 if firstq else 749
  text=page.crop((left,h['bottom']+2,right,bottom)).extract_text(x_tolerance=2,y_tolerance=3)
  text=re.split(r'\nBu metne ait',text)[0]
  passages[str(num)]=text.strip()
 for q in questions:
  if q['skill']=='READING':q['passageId']=str((q['number']-49)//4+1)
  if q['skill']=='LISTENING':q['recording']=(q['number']-73)//4+1
 questions.sort(key=lambda q:q['number'])
 assert len(questions)==96
 json.dump({'id':'ozgun-kids-form-a-v1','title':'Özgün Kids İngilizce Seviye Belirleme Sınavı — Form A','questions':questions,'passages':passages},open(target,'w'),ensure_ascii=False,indent=2)
