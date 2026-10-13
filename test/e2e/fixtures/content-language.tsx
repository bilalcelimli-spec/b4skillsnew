import React from 'react';
import {createRoot} from 'react-dom/client';
import {AssessmentSections, AssessmentFooter} from '../../../src/components/AssessmentChrome';
import {applyLangMeta} from '../../../src/lib/i18n/config';
import '../../../src/index.css';
function Fixture() {
  return <main>
    <button onClick={() => applyLangMeta('tr')}>Select Turkish</button>
    <button onClick={() => applyLangMeta('en')}>Select English</button>
    <h1 className="uppercase">Sign in to writing insights</h1>
    <section lang="tr">
      <h2 className="uppercase">ingilizce seviye testi</h2>
      <AssessmentSections order={['LISTENING','READING','WRITING','SPEAKING']} index={0} counts={{}}/>
      <AssessmentFooter sessionId="language-check"/>
    </section>
    <p>Özgün Placement · İTÜ · Türkçe</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
